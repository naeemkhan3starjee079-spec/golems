#!/usr/bin/env bun
/**
 * Cloud Worker - Railway Entry Point
 *
 * Runs all cloud golems on timezone-aware schedules in a single process.
 * Replaces launchd plists for email-golem, job-golem, briefing, and soltome-learner.
 *
 * ══════════════════════════════════════════════════════════════
 * SCHEDULE (All times Israel/Asia/Jerusalem)
 * ══════════════════════════════════════════════════════════════
 *
 *   Email Golem:     Every 1h during work hours (8am-8pm)
 *                    Every 3h overnight (8pm-8am)
 *                    ~14 runs/day vs old 144 runs/day → 90% cost savings
 *
 *   Job Golem:       9am and 1pm, Sun-Thu only (Israeli work week)
 *                    ~10 runs/week vs old 336 runs/week → 97% cost savings
 *
 *   Briefing:        8am daily
 *   Soltome Learner: 2am daily
 * ══════════════════════════════════════════════════════════════
 *
 * ENV defaults (set by Railway, or override locally):
 *   LLM_BACKEND=haiku
 *   STATE_BACKEND=supabase
 *   TELEGRAM_MODE=direct
 *   TZ=Asia/Jerusalem
 *
 * Usage:
 *   bun run src/cloud-worker.ts                # Run everything
 *   bun run src/cloud-worker.ts --email-only   # Just email golem
 *   bun run src/cloud-worker.ts --jobs-only    # Just job golem
 */

// Default cloud env vars (can be overridden)
if (!process.env.LLM_BACKEND) process.env.LLM_BACKEND = "haiku";
if (!process.env.STATE_BACKEND) process.env.STATE_BACKEND = "supabase";
if (!process.env.TELEGRAM_MODE) process.env.TELEGRAM_MODE = "direct";

import { sendNotification } from "./lib/telegram-direct";
import { getUsageStats, getUsageBySource } from "./lib/cloud-llm";

// Lazy imports to avoid loading everything at startup
async function getEmailGolem() {
  const mod = await import("./email-golem/index");
  return mod.processEmails;
}

async function getJobGolem() {
  const mod = await import("./job-golem/index");
  return mod.runJobSearch;
}

async function getBriefing() {
  const mod = await import("./briefing");
  return mod.sendBriefing;
}

async function getSoltomeLearner() {
  const mod = await import("./soltome-learner");
  return mod.learnFromSoltome;
}

// ═══════════════════════════════════════════════════════
// Safe execution wrapper
// ═══════════════════════════════════════════════════════

async function safeRun(name: string, fn: () => Promise<unknown>): Promise<void> {
  const start = Date.now();
  console.log(`[CloudWorker] Starting ${name}...`);

  try {
    await fn();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[CloudWorker] ${name} completed (${elapsed}s)`);
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[CloudWorker] ${name} FAILED (${elapsed}s):`, message);

    // Notify on failure
    await sendNotification({
      title: `${name} Failed`,
      body: message.slice(0, 200),
      source: "healthcheck",
      priority: "high",
    }).catch(() => {}); // Don't let notification failure cascade
  }
}

// ═══════════════════════════════════════════════════════
// Timezone helpers
// ═══════════════════════════════════════════════════════

/** Returns current hour (0-23) in Israel timezone */
function getIsraelHour(): number {
  const now = new Date();
  const israelTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })
  );
  return israelTime.getHours();
}

/** Returns current day of week in Israel timezone (0=Sun, 6=Sat) */
function getIsraelDay(): number {
  const now = new Date();
  const israelTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })
  );
  return israelTime.getDay();
}

/** Israeli work week: Sunday (0) through Thursday (4) */
function isIsraeliWorkday(): boolean {
  const day = getIsraelDay();
  return day >= 0 && day <= 4; // Sun=0, Mon=1, Tue=2, Wed=3, Thu=4
}

/** Work hours: 8am-8pm Israel time */
function isWorkHours(): boolean {
  const hour = getIsraelHour();
  return hour >= 8 && hour < 20;
}

// ═══════════════════════════════════════════════════════
// Schedule helpers
// ═══════════════════════════════════════════════════════

/** Run a function at a specific hour (Israel time), checked every minute */
function scheduleDaily(name: string, hour: number, fn: () => Promise<unknown>): void {
  let lastRunDate = "";

  setInterval(() => {
    const currentHour = getIsraelHour();
    const today = new Date().toISOString().slice(0, 10);

    // Run once per day at the target hour
    if (currentHour === hour && lastRunDate !== today) {
      lastRunDate = today;
      safeRun(name, fn);
    }
  }, 60_000); // Check every minute
}

/**
 * Email Golem scheduler: every 1h during work hours (8am-8pm), every 3h overnight.
 * Uses setInterval(60min) and checks if enough time has passed.
 */
function scheduleEmail(fn: () => Promise<unknown>): void {
  let lastRunTime = 0;

  const check = () => {
    const now = Date.now();
    const intervalMs = isWorkHours() ? 60 * 60_000 : 3 * 60 * 60_000;

    if (now - lastRunTime >= intervalMs) {
      lastRunTime = now;
      safeRun("EmailGolem", fn);
    }
  };

  // Run immediately on startup
  lastRunTime = Date.now();
  safeRun("EmailGolem (initial)", fn);

  // Check every 10 minutes (granular enough, not too chatty)
  setInterval(check, 10 * 60_000);
}

/**
 * Job Golem scheduler: only at 9am and 1pm Israel time, Sun-Thu.
 * Uses setInterval(60s) minute-check pattern.
 */
function scheduleJobs(fn: () => Promise<unknown>): void {
  let lastRunKey = "";

  setInterval(() => {
    const hour = getIsraelHour();
    const today = new Date().toISOString().slice(0, 10);
    const runKey = `${today}-${hour}`;

    // Only run at 9am or 1pm on Israeli workdays
    if ((hour === 9 || hour === 13) && isIsraeliWorkday() && lastRunKey !== runKey) {
      lastRunKey = runKey;
      safeRun("JobGolem", fn);
    }
  }, 60_000); // Check every minute
}

// ═══════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════

const args = process.argv.slice(2);
const emailOnly = args.includes("--email-only");
const jobsOnly = args.includes("--jobs-only");
const singleMode = emailOnly || jobsOnly;

console.log("[CloudWorker] Starting...");
console.log(`[CloudWorker] LLM_BACKEND=${process.env.LLM_BACKEND}`);
console.log(`[CloudWorker] STATE_BACKEND=${process.env.STATE_BACKEND}`);
console.log(`[CloudWorker] TELEGRAM_MODE=${process.env.TELEGRAM_MODE}`);
console.log(`[CloudWorker] Israel time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })}`);
console.log(`[CloudWorker] Work hours now: ${isWorkHours()}, Workday: ${isIsraeliWorkday()}`);

if (!singleMode) {
  // ── Email Golem: adaptive schedule ──
  const processEmails = await getEmailGolem();
  scheduleEmail(processEmails);

  // ── Job Golem: 9am + 1pm, Sun-Thu only ──
  const runJobSearch = await getJobGolem();
  scheduleJobs(runJobSearch);

  // ── Morning Briefing: 8am Israel time ──
  const sendBriefing = await getBriefing();
  scheduleDaily("Briefing", 8, sendBriefing);

  // ── Soltome Learner: 2am Israel time ──
  const learnFromSoltome = await getSoltomeLearner();
  scheduleDaily("SoltomeLearner", 2, learnFromSoltome);

  console.log("[CloudWorker] All services scheduled:");
  console.log("  - EmailGolem: every 1h (8am-8pm), every 3h overnight");
  console.log("  - JobGolem: 9am + 1pm Sun-Thu (Israeli work week)");
  console.log("  - Briefing: 8am Israel");
  console.log("  - SoltomeLearner: 2am Israel");
} else if (emailOnly) {
  const processEmails = await getEmailGolem();
  scheduleEmail(processEmails);
  console.log("[CloudWorker] Email-only mode: every 1h (work hours), every 3h (overnight)");
} else if (jobsOnly) {
  const runJobSearch = await getJobGolem();
  // In jobs-only mode, run immediately then schedule
  safeRun("JobGolem (initial)", runJobSearch);
  scheduleJobs(runJobSearch);
  console.log("[CloudWorker] Jobs-only mode: 9am + 1pm Sun-Thu");
}

// ═══════════════════════════════════════════════════════
// Health endpoint (Railway requires this)
// ═══════════════════════════════════════════════════════

const PORT = parseInt(process.env.PORT || "8080", 10);
const startTime = Date.now();

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        uptime: Math.round((Date.now() - startTime) / 1000),
        backend: process.env.LLM_BACKEND,
        stateBackend: process.env.STATE_BACKEND,
        telegramMode: process.env.TELEGRAM_MODE,
        israelTime: new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }),
        isWorkHours: isWorkHours(),
        isWorkday: isIsraeliWorkday(),
      });
    }

    // API usage tracking endpoint - check cost at any time
    if (url.pathname === "/usage") {
      return Response.json({
        ...getUsageStats(),
        bySource: getUsageBySource(),
      });
    }

    // UptimeRobot webhook → Telegram uptime topic
    // Set UptimeRobot alert contact webhook to: POST https://golems-production.up.railway.app/webhook/uptimerobot
    if (url.pathname === "/webhook/uptimerobot" && req.method === "POST") {
      try {
        const form = await req.formData().catch(() => null);
        const text = await req.text().catch(() => "");
        // UptimeRobot sends form-encoded: monitorFriendlyName, alertType (1=down, 2=up), alertDetails
        const monitorName = form?.get("monitorFriendlyName") || "Unknown";
        const alertType = form?.get("alertType") || "";
        const alertDetails = form?.get("alertDetails") || text || "No details";
        const isDown = String(alertType) === "1";

        await sendNotification({
          title: isDown ? `DOWN: ${monitorName}` : `UP: ${monitorName}`,
          body: String(alertDetails),
          source: "uptime",
        });
        return new Response("OK", { status: 200 });
      } catch (e) {
        console.error("[Webhook] UptimeRobot error:", e);
        return new Response("Error", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`[CloudWorker] Health endpoint on port ${PORT}`);

// Send startup notification
await sendNotification({
  title: "Cloud Worker Started",
  body: singleMode
    ? `Mode: ${emailOnly ? "email-only" : "jobs-only"}`
    : "All services active",
  source: "healthcheck",
}).catch(() => {});
