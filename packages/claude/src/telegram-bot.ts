#!/usr/bin/env bun
/**
 * ClaudeGolem Telegram Bot — Thin Router
 *
 * All domain logic lives in Composer modules:
 * - composers/claude-composer.ts  — System commands + interactive chat
 * - composers/job-composer.ts     — Job viewing + /jobq
 * - composers/recruiter-composer.ts — Interview practice + outreach
 *
 * Infrastructure:
 * - lib/bot-shared.ts     — Shared state, Claude CLI spawning, queue
 * - lib/notify-server.ts  — HTTP notification server (port 3847)
 */

import "@golems/shared/lib/load-env";
import { installProcessGuards } from "@golems/shared/lib/process-guards";
import { Bot } from "grammy";
import { GITS, askClaude, queue, processQueue } from "./lib/bot-shared";

// Catch unhandled errors before they crash the bot silently
installProcessGuards("telegram-bot");
import { startNotifyServer } from "./lib/notify-server";

// Composers
import { claudeComposer } from "./composers/claude-composer";
import { jobComposer, initJobComposer } from "@golems/jobs/composer";
import {
  recruiterComposer,
  initRecruiterComposer,
} from "@golems/recruiter/composer";
import { coachComposer } from "@golems/coach/composer";
import { tellerComposer } from "@golems/teller/composer";

// Wire up composer dependencies (breaks circular imports)
initJobComposer({ askClaude });
initRecruiterComposer({ queue, processQueue });

// ═══════════════════════════════════════════════════════
// Bot Setup
// ═══════════════════════════════════════════════════════

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
}
const bot = new Bot(token);

// Security: Whitelist allowed Telegram user IDs
const ALLOWED_USER_IDS =
  process.env.TELEGRAM_ALLOWED_IDS?.split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id)) || [];

function isAuthorized(userId: number | undefined): boolean {
  if (ALLOWED_USER_IDS.length === 0) return true;
  if (!userId) return false;
  return ALLOWED_USER_IDS.includes(userId);
}

// Global auth middleware
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!isAuthorized(userId)) {
    console.log(`[Auth] Blocked user ${userId} from ${ctx.chat?.id}`);
    return;
  }
  await next();
});

// ═══════════════════════════════════════════════════════
// Register Composers (order matters — specific before general)
// ═══════════════════════════════════════════════════════

bot.use(jobComposer);
bot.use(recruiterComposer);
bot.use(coachComposer);
bot.use(tellerComposer);
bot.use(claudeComposer); // Must be last — has catch-all message:text handler

// ═══════════════════════════════════════════════════════
// Infrastructure
// ═══════════════════════════════════════════════════════

// Start notification HTTP server
const notifyServer = startNotifyServer(bot);

// Start Telegram bot
console.log("🤖 ClaudeGolem v6 (Composer Architecture)");
console.log("📍 Working dir:", GITS);

bot.start({
  onStart: (botInfo) => {
    console.log(`✅ @${botInfo.username} running`);
  },
});

// Graceful shutdown — release port 3847 before exit so KeepAlive restarts cleanly
async function gracefulShutdown(signal: string) {
  console.log(`[Shutdown] ${signal} received, cleaning up...`);
  try {
    await bot.stop();
    await notifyServer.stop(true);
    console.log("[Shutdown] Server and bot stopped cleanly");
  } catch (err) {
    console.error("[Shutdown] Error during cleanup:", err);
  }
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
