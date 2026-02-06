#!/usr/bin/env bun
/**
 * Cloud Worker - Railway Entry Point
 *
 * Runs all cloud golems on schedules in a single process.
 * Replaces launchd plists for email-golem, job-golem, briefing, and soltome-learner.
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
// Schedule helpers
// ═══════════════════════════════════════════════════════

function getIsraelHour(): number {
  const now = new Date();
  // Get Israel time (UTC+2 or UTC+3 depending on DST)
  const israelTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })
  );
  return israelTime.getHours();
}

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

if (!singleMode) {
  // ── Email Golem: every 10 minutes ──
  const processEmails = await getEmailGolem();
  safeRun("EmailGolem (initial)", processEmails);
  setInterval(() => safeRun("EmailGolem", processEmails), 10 * 60_000);

  // ── Job Golem: every 30 minutes ──
  const runJobSearch = await getJobGolem();
  // Stagger start by 5 minutes to avoid thundering herd
  setTimeout(() => {
    safeRun("JobGolem (initial)", runJobSearch);
    setInterval(() => safeRun("JobGolem", runJobSearch), 30 * 60_000);
  }, 5 * 60_000);

  // ── Morning Briefing: 8am Israel time ──
  const sendBriefing = await getBriefing();
  scheduleDaily("Briefing", 8, sendBriefing);

  // ── Soltome Learner: 2am Israel time ──
  const learnFromSoltome = await getSoltomeLearner();
  scheduleDaily("SoltomeLearner", 2, learnFromSoltome);

  console.log("[CloudWorker] All services scheduled:");
  console.log("  - EmailGolem: every 10min");
  console.log("  - JobGolem: every 30min (starts in 5min)");
  console.log("  - Briefing: 8am Israel");
  console.log("  - SoltomeLearner: 2am Israel");
} else if (emailOnly) {
  const processEmails = await getEmailGolem();
  safeRun("EmailGolem", processEmails);
  setInterval(() => safeRun("EmailGolem", processEmails), 10 * 60_000);
  console.log("[CloudWorker] Email-only mode: every 10min");
} else if (jobsOnly) {
  const runJobSearch = await getJobGolem();
  safeRun("JobGolem", runJobSearch);
  setInterval(() => safeRun("JobGolem", runJobSearch), 30 * 60_000);
  console.log("[CloudWorker] Jobs-only mode: every 30min");
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
      });
    }

    // API usage tracking endpoint - check cost at any time
    if (url.pathname === "/usage") {
      return Response.json({
        ...getUsageStats(),
        bySource: getUsageBySource(),
      });
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
