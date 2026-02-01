#!/usr/bin/env bun
/**
 * Moltbook Monitor - Hourly health check
 *
 * Pings Moltbook API and sends Telegram notification when it comes back online.
 * Run via launchd hourly.
 */

import { checkMoltbookHealth } from "./moltbook-client";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "/Users/etanheyman";
const STATE_FILE = join(HOME, ".golems-zikaron/moltbook-health.json");
const NOTIFY_URL = "http://localhost:3847/notify";

interface HealthState {
  lastCheck: string;
  wasHealthy: boolean;
  consecutiveFailures: number;
}

function loadState(): HealthState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {}
  return {
    lastCheck: new Date().toISOString(),
    wasHealthy: false,
    consecutiveFailures: 0,
  };
}

function saveState(state: HealthState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function sendTelegramNotification(title: string, body: string) {
  try {
    await fetch(NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, source: "moltbot", priority: "high" }),
    });
    console.log(`[Notify] Sent: ${title}`);
  } catch (err) {
    console.error("[Notify] Failed to send notification:", err);
  }
}

async function main() {
  const state = loadState();
  const now = new Date().toISOString();

  console.log(`[Monitor] Checking Moltbook health at ${now}...`);
  const result = await checkMoltbookHealth();

  if (result.healthy) {
    console.log("[Monitor] Moltbook is HEALTHY");

    // Was it down before? Notify that it's back!
    if (!state.wasHealthy && state.consecutiveFailures > 0) {
      await sendTelegramNotification(
        "Moltbook Back Online",
        `API recovered after ${state.consecutiveFailures} failed checks. Ready to post!`
      );
    }

    state.wasHealthy = true;
    state.consecutiveFailures = 0;
  } else {
    console.log(`[Monitor] Moltbook is DOWN: ${result.error}`);

    state.wasHealthy = false;
    state.consecutiveFailures++;

    // Notify every 6 hours if still down (not every hour to avoid spam)
    if (state.consecutiveFailures === 1 || state.consecutiveFailures % 6 === 0) {
      await sendTelegramNotification(
        "Moltbook Still Down",
        `${result.error}. Check #${state.consecutiveFailures}`
      );
    }
  }

  state.lastCheck = now;
  saveState(state);

  console.log(`[Monitor] State saved. Consecutive failures: ${state.consecutiveFailures}`);
}

main().catch((err) => {
  console.error("[Monitor] Fatal error:", err);
  process.exit(1);
});
