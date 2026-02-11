#!/usr/bin/env bun
/**
 * Cloud Worker - Railway Entry Point
 *
 * Runs all cloud golems on timezone-aware schedules in a single process.
 * Replaces launchd plists for email-golem, job-golem, and briefing.
 *
 * ══════════════════════════════════════════════════════════════
 * SCHEDULE (All times Israel/Asia/Jerusalem)
 * ══════════════════════════════════════════════════════════════
 *
 *   Email Golem:     Every 1h during 6am-7pm (skip 12pm lunch)
 *                    One final check at 10pm, OFF overnight (10pm-6am)
 *                    ~12 runs/day vs old 144 runs/day → 92% cost savings
 *
 *   Job Golem:       6am, 9am, 1pm Sun-Thu (Israeli work week)
 *                    ~15 runs/week vs old 336 runs/week → 95% cost savings
 *
 *   Briefing:        8am daily
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

// ALL imports are lazy — health endpoint must start before any module loads
async function getSendNotification() {
  const mod = await import("@golems/shared/lib/telegram-direct");
  return mod.sendNotification;
}

async function getUsage() {
  const mod = await import("@golems/shared/lib/cloud-llm");
  return { getUsageStats: mod.getUsageStats, getUsageBySource: mod.getUsageBySource };
}

async function getCostTracker() {
  const mod = await import("@golems/shared/lib/cost-tracker");
  return { getSupabaseUsageStats: mod.getSupabaseUsageStats };
}

// Lazy imports to avoid loading everything at startup
async function getEmailGolem() {
  const mod = await import("@golems/shared/email/index");
  return mod.processEmails;
}

async function getJobGolem() {
  const mod = await import("@golems/jobs/index");
  return mod.runJobSearch;
}

async function getBriefing() {
  const mod = await import("./briefing");
  return mod.sendBriefing;
}

// ═══════════════════════════════════════════════════════
// Safe execution wrapper
// ═══════════════════════════════════════════════════════

async function getServiceRunReporter() {
  return (await import("@golems/shared/lib/supabase-factory")).getSupabase();
}

async function safeRun(name: string, fn: () => Promise<unknown>): Promise<void> {
  const start = Date.now();
  const startedAt = new Date().toISOString();
  console.log(`[CloudWorker] Starting ${name}...`);

  let status = "success";
  let error: string | null = null;
  let result: Record<string, any> = {};

  try {
    const fnResult = await fn();
    if (fnResult && typeof fnResult === "object") {
      result = fnResult as Record<string, any>;
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[CloudWorker] ${name} completed (${elapsed}s)`);
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[CloudWorker] ${name} FAILED (${elapsed}s):`, message);
    status = "error";
    error = message;

    // Notify on failure
    const notify = await getSendNotification();
    await notify({
      title: `${name} Failed`,
      body: message.slice(0, 200),
      source: "healthcheck",
      priority: "high",
    }).catch(() => {}); // Don't let notification failure cascade
  }

  // Report service run to Supabase (fire-and-forget)
  try {
    const sb = await getServiceRunReporter();
    if (sb) {
      const durationMs = Date.now() - start;
      const endedAt = new Date().toISOString();
      sb.from("service_runs")
        .insert({
          service: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          started_at: startedAt,
          ended_at: endedAt,
          duration_ms: durationMs,
          status,
          result,
          error,
        })
        .then(({ error: dbErr }) => {
          if (dbErr) console.error("[CloudWorker] service_runs insert failed:", dbErr.message);
        })
        .catch(() => {});

      // Update golem_state timestamps for dashboard service status
      const stateKeyPrefixes: [string, string][] = [
        ["EmailGolem", "lastEmailCheck"],
        ["JobGolem", "lastJobRun"],
        ["Briefing", "lastBriefing"],
      ];
      const stateKey = stateKeyPrefixes.find(([prefix]) => name.startsWith(prefix))?.[1];
      if (stateKey) {
        sb.from("golem_state")
          .upsert({ key: stateKey, value: endedAt, updated_at: endedAt }, { onConflict: "key" })
          .then(({ error: stateErr }) => {
            if (stateErr) console.error(`[CloudWorker] golem_state ${stateKey} upsert failed:`, stateErr.message);
          })
          .catch(() => {});
      }
    }
  } catch {
    // Non-critical
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

/** Active hours: 6am-7pm Israel time (email runs hourly, skip lunch) */
function isActiveHours(): boolean {
  const hour = getIsraelHour();
  return hour >= 6 && hour < 19;
}

/** Lunch hour: 12pm Israel time (skip email check) */
function isLunchHour(): boolean {
  return getIsraelHour() === 12;
}

/** Late night check: 10pm Israel time (one final email check) */
function isLateNightCheck(): boolean {
  return getIsraelHour() === 22;
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
 * Email Golem scheduler:
 *   6am-7pm: hourly (skip 12pm lunch)
 *   10pm: one final check
 *   10pm-6am: OFF completely
 */
function scheduleEmail(fn: () => Promise<unknown>): void {
  let lastRunKey = "";

  const check = () => {
    const hour = getIsraelHour();
    const today = new Date().toISOString().slice(0, 10);
    const runKey = `${today}-${hour}`;

    // Already ran this hour
    if (lastRunKey === runKey) return;

    // Active hours (6am-7pm) but skip lunch (12pm)
    if (isActiveHours() && !isLunchHour()) {
      lastRunKey = runKey;
      safeRun("EmailGolem", fn);
      return;
    }

    // Late night check (10pm)
    if (isLateNightCheck()) {
      lastRunKey = runKey;
      safeRun("EmailGolem (night)", fn);
      return;
    }

    // Otherwise: OFF (7pm-10pm gap, 10pm-6am sleep)
  };

  // Run immediately on startup if within active hours
  if (isActiveHours() || isLateNightCheck()) {
    lastRunKey = `${new Date().toISOString().slice(0, 10)}-${getIsraelHour()}`;
    safeRun("EmailGolem (initial)", fn);
  }

  // Check every 10 minutes
  setInterval(check, 10 * 60_000);
}

/**
 * Job Golem scheduler: 6am, 9am, 1pm Israel time, Sun-Thu only.
 * 6am catches overnight postings, 9am + 1pm catch daytime.
 */
function scheduleJobs(fn: () => Promise<unknown>): void {
  let lastRunKey = "";

  setInterval(() => {
    const hour = getIsraelHour();
    const today = new Date().toISOString().slice(0, 10);
    const runKey = `${today}-${hour}`;

    // Run at 6am, 9am, or 1pm on Israeli workdays
    if ((hour === 6 || hour === 9 || hour === 13) && isIsraeliWorkday() && lastRunKey !== runKey) {
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
console.log(`[CloudWorker] Work hours now: ${isActiveHours()}, Workday: ${isIsraeliWorkday()}`);

// ═══════════════════════════════════════════════════════
// Health endpoint FIRST (Railway healthcheck must respond fast)
// Starts before golem imports so crashes don't kill healthcheck.
// ═══════════════════════════════════════════════════════

const PORT = parseInt(process.env.PORT || "8080", 10);
const startTime = Date.now();
let golemStatus = "loading";

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        golemStatus,
        uptime: Math.round((Date.now() - startTime) / 1000),
        backend: process.env.LLM_BACKEND,
        stateBackend: process.env.STATE_BACKEND,
        telegramMode: process.env.TELEGRAM_MODE,
        israelTime: new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }),
        isWorkHours: isActiveHours(),
        isWorkday: isIsraeliWorkday(),
      });
    }

    if (url.pathname === "/usage") {
      const validPeriods = ["today", "week", "month", "all"] as const;
      const rawPeriod = url.searchParams.get("period") || "today";
      const period = validPeriods.includes(rawPeriod as any) ? rawPeriod as typeof validPeriods[number] : "today";

      // Try Supabase first (persistent, survives deploys)
      try {
        const { getSupabaseUsageStats } = await getCostTracker();
        const stats = await getSupabaseUsageStats(period);
        return Response.json({
          source: "supabase",
          period,
          ...stats,
        });
      } catch {
        // Fall back to in-memory stats
        const { getUsageStats, getUsageBySource } = await getUsage();
        return Response.json({
          source: "memory",
          period: "since-deploy",
          ...getUsageStats(),
          bySource: getUsageBySource(),
        });
      }
    }

    if (url.pathname === "/webhook/uptimerobot" && req.method === "POST") {
      try {
        const form = await req.formData().catch(() => null);
        const text = await req.text().catch(() => "");
        const monitorName = form?.get("monitorFriendlyName") || "Unknown";
        const alertType = form?.get("alertType") || "";
        const alertDetails = form?.get("alertDetails") || text || "No details";
        const isDown = String(alertType) === "1";

        const notify = await getSendNotification();
        await notify({
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

// ═══════════════════════════════════════════════════════
// Load and schedule golems (after health endpoint is up)
// ═══════════════════════════════════════════════════════

try {
  if (!singleMode) {
    const processEmails = await getEmailGolem();
    scheduleEmail(processEmails);

    const runJobSearch = await getJobGolem();
    scheduleJobs(runJobSearch);

    const sendBriefing = await getBriefing();
    scheduleDaily("Briefing", 8, sendBriefing);

    console.log("[CloudWorker] All services scheduled:");
    console.log("  - EmailGolem: hourly 6am-7pm (skip lunch), 10pm final, OFF overnight");
    console.log("  - JobGolem: 6am + 9am + 1pm Sun-Thu (Israeli work week)");
    console.log("  - Briefing: 8am Israel");
  } else if (emailOnly) {
    const processEmails = await getEmailGolem();
    scheduleEmail(processEmails);
    console.log("[CloudWorker] Email-only mode");
  } else if (jobsOnly) {
    const runJobSearch = await getJobGolem();
    safeRun("JobGolem (initial)", runJobSearch);
    scheduleJobs(runJobSearch);
    console.log("[CloudWorker] Jobs-only mode");
  }

  golemStatus = "running";
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[CloudWorker] Failed to load golems:", message);
  golemStatus = `error: ${message}`;

  const notifyFail = await getSendNotification();
  await notifyFail({
    title: "Golem Load Failed",
    body: message.slice(0, 200),
    source: "healthcheck",
    priority: "high",
  }).catch(() => {});
}

// Send startup notification
const notifyStart = await getSendNotification();
await notifyStart({
  title: "Cloud Worker Started",
  body: `Golems: ${golemStatus}`,
  source: "healthcheck",
}).catch(() => {});
