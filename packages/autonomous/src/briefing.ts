#!/usr/bin/env bun
/**
 * Morning Briefing - 8 AM summary of overnight work
 *
 * Compiles:
 * - Night Shift PRs (if created)
 * - 24h Email digest (urgent, job updates, payments)
 * - Monthly subscription summary (on 1st of month)
 * - Soltome activity (posts, credits)
 * - Draft posts ready for approval
 */

import { readFileSync } from "fs";
import { join } from "path";
import { getPendingDrafts } from "./post-generator";
import { sendTelegram } from "./night-shift";
import {
  createDbClient,
  getRecentEmails,
  getSubscriptionSummary,
} from "./email-golem/db-client";
import type { Email, SubscriptionSummary } from "./email-golem/types";
import { getRecentEvents, type GolemEvent } from "./event-log";

const HOME = process.env.HOME || "/Users/etanheyman";
const STATE_FILE = join(HOME, ".golems-zikaron/state.json");
const DATA_DIR = join(HOME, "Gits/golems-zikaron/data");

interface State {
  nightShiftTarget: string;
  rotation: string[];
  telegramChatId: number | null;
  lastNightShift?: string;
  lastPrUrl?: string; // deprecated
  nightShiftPRs?: { url: string; repo: string; createdAt: string }[];
  moltbookApiKey?: string;
  pendingDraftIds?: string[];
}

function loadState(): State {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return {
      nightShiftTarget: "songscript",
      rotation: ["songscript", "zikaron", "claude-golem"],
      telegramChatId: null,
    };
  }
}

interface Learnings {
  posts: string[];
  extractedAt: string;
}

function loadLearnings(): Learnings | null {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, "learnings.json"), "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Fetch 24h email digest from Supabase
 */
async function getEmailDigest(): Promise<{
  urgent: Email[];
  job: Email[];
  payments: Email[];
  total: number;
} | null> {
  try {
    const db = createDbClient();
    const emails = await getRecentEmails(db, 24, 5); // Last 24h, score >= 5

    const urgent = emails.filter((e) => (e.score ?? 0) >= 10);
    const job = emails.filter(
      (e) => e.category === "job" && (e.score ?? 0) >= 7 && (e.score ?? 0) < 10
    );
    const payments = emails.filter((e) => e.category === "subscription");

    return {
      urgent,
      job,
      payments,
      total: emails.length,
    };
  } catch (err) {
    console.log("[Briefing] Could not fetch email digest:", err);
    return null;
  }
}

/**
 * Format email digest section for Telegram
 */
function formatEmailDigest(digest: {
  urgent: Email[];
  job: Email[];
  payments: Email[];
  total: number;
}): string {
  let msg = "📧 *Emails (24h)*\n\n";

  if (digest.urgent.length > 0) {
    msg += "🔴 *Urgent* (already notified):\n";
    for (const e of digest.urgent.slice(0, 3)) {
      msg += `   → ${e.subject?.slice(0, 40) || "No subject"}...\n`;
    }
    msg += "\n";
  }

  if (digest.job.length > 0) {
    msg += "💼 *Job Updates:*\n";
    for (const e of digest.job.slice(0, 3)) {
      msg += `   → ${e.subject?.slice(0, 40) || "No subject"}\n`;
    }
    msg += "\n";
  }

  if (digest.payments.length > 0) {
    msg += "💳 *Payments:*\n";
    for (const e of digest.payments.slice(0, 3)) {
      msg += `   → ${e.subject?.slice(0, 40) || "No subject"}\n`;
    }
    msg += "\n";
  }

  // Summary line
  const parts = [];
  if (digest.job.length > 0) parts.push(`${digest.job.length} job updates`);
  if (digest.urgent.length > 0) parts.push(`${digest.urgent.length} alerts`);
  if (digest.payments.length > 0) parts.push(`${digest.payments.length} payments`);

  if (parts.length > 0) {
    msg += `_${parts.join(" • ")}_\n`;
  } else {
    msg += "_No notable emails_\n";
  }

  return msg;
}

/**
 * Format subscription summary for Telegram (monthly)
 */
function formatSubscriptionSummary(summary: SubscriptionSummary): string {
  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  let msg = `💳 *Subscriptions Report - ${monthName}*\n\n`;

  if (summary.services.length > 0) {
    msg += "*Active Services:*\n";
    for (const svc of summary.services) {
      const amount = svc.amount ? `$${svc.amount.toFixed(2)}` : "???";
      msg += `   → ${svc.name}: ${amount}\n`;
    }
    msg += `\n*Total:* \`$${summary.totalMonthly.toFixed(2)}/month\`\n`;
  } else {
    msg += "No tracked subscriptions\n";
  }

  if (summary.newThisMonth.length > 0) {
    msg += "\n*Changes this month:*\n";
    for (const name of summary.newThisMonth) {
      msg += `✅ Added: ${name}\n`;
    }
  }

  if (summary.cancelledThisMonth.length > 0) {
    for (const name of summary.cancelledThisMonth) {
      msg += `❌ Cancelled: ${name}\n`;
    }
  }

  return msg;
}

/**
 * Check if today is the 1st of the month
 */
function isFirstOfMonth(): boolean {
  return new Date().getDate() === 1;
}

/**
 * Get Soltome activity from event log (last 24h)
 */
async function getSoltomeActivity(): Promise<{
  posts: GolemEvent[];
  creditsRemaining: number | null;
}> {
  const events = await getRecentEvents(24);
  const soltomePosts = events.filter((e) => e.type === "soltome_post");

  // Get most recent credits balance
  let creditsRemaining: number | null = null;
  for (const post of soltomePosts) {
    if (post.data.creditsRemaining !== undefined) {
      creditsRemaining = post.data.creditsRemaining;
      break; // Most recent first
    }
  }

  return { posts: soltomePosts, creditsRemaining };
}

/**
 * Format Soltome activity section for Telegram
 */
function formatSoltomeActivity(activity: {
  posts: GolemEvent[];
  creditsRemaining: number | null;
}): string {
  if (activity.posts.length === 0) {
    return "";
  }

  let msg = "📢 *Soltome Activity*\n";

  for (const post of activity.posts.slice(0, 3)) {
    const title = post.data.title || "(untitled)";
    msg += `   → "${title.slice(0, 35)}..."\n`;
  }

  if (activity.creditsRemaining !== null) {
    msg += `💰 Credits: ${activity.creditsRemaining} remaining\n`;
  }

  return msg + "\n";
}

async function sendBriefing() {
  console.log("☀️ Generating morning briefing...\n");

  const state = loadState();
  const drafts = getPendingDrafts();
  const learnings = loadLearnings();

  // Build briefing - concise and useful
  let msg = `☀️ *Morning Briefing*\n\n`;

  const separator = "━━━━━━━━━━━━━━━━━━━━━\n\n";

  // PR Section
  const prs = state.nightShiftPRs || [];
  const recentPRs = prs.filter((pr) => {
    const prDate = new Date(pr.createdAt);
    const hoursAgo = (Date.now() - prDate.getTime()) / (1000 * 60 * 60);
    return hoursAgo < 24;
  });

  if (recentPRs.length > 0) {
    msg += `🔧 *Night Shift*\n`;
    msg += `→ ${recentPRs.length} PR${recentPRs.length > 1 ? "s" : ""}:`;
    recentPRs.forEach((pr) => {
      msg += ` [${pr.repo}](${pr.url})`;
    });
    msg += `\n\n`;
  } else if (state.lastPrUrl) {
    const repoMatch = state.lastPrUrl.match(/github\.com\/[^/]+\/([^/]+)/);
    const repoName = repoMatch ? repoMatch[1] : "repo";
    msg += `🔧 *Night Shift*\n→ 1 PR: [${repoName}](${state.lastPrUrl})\n\n`;
  }

  msg += separator;

  // Email Digest Section (24h)
  const emailDigest = await getEmailDigest();
  if (emailDigest && emailDigest.total > 0) {
    msg += formatEmailDigest(emailDigest);
    msg += "\n" + separator;
  }

  // Monthly Subscription Summary (on 1st of month)
  if (isFirstOfMonth()) {
    try {
      const db = createDbClient();
      const subSummary = await getSubscriptionSummary(db);
      if (subSummary.services.length > 0) {
        msg += formatSubscriptionSummary(subSummary);
        msg += "\n" + separator;
      }
    } catch (err) {
      console.log("[Briefing] Could not fetch subscription summary:", err);
    }
  }

  // Soltome Activity Section (posts from last 24h)
  const soltomeActivity = await getSoltomeActivity();
  if (soltomeActivity.posts.length > 0) {
    msg += formatSoltomeActivity(soltomeActivity);
    msg += separator;
  }

  // Learnings Section (from pattern learning)
  if (learnings && learnings.posts.length > 0) {
    msg += `*${learnings.posts.length} pattern examples* saved\n\n`;
  }

  // Drafts Section - count + categorize by topic
  if (drafts.length > 0) {
    const updatedState = loadState();
    updatedState.pendingDraftIds = drafts.map((d) => d.id);
    require("fs").writeFileSync(STATE_FILE, JSON.stringify(updatedState, null, 2));

    // Categorize by keywords in title
    const categories: Record<string, number> = {};
    drafts.forEach((d) => {
      const title = d.title.toLowerCase();
      if (title.includes("ralph") || title.includes("autonomous") || title.includes("agent")) {
        categories["agents/ralph"] = (categories["agents/ralph"] || 0) + 1;
      } else if (title.includes("claude") || title.includes("ai") || title.includes("memory")) {
        categories["AI/claude"] = (categories["AI/claude"] || 0) + 1;
      } else if (title.includes("zikaron") || title.includes("conversation")) {
        categories["zikaron"] = (categories["zikaron"] || 0) + 1;
      } else {
        categories["other"] = (categories["other"] || 0) + 1;
      }
    });

    msg += `📝 *Drafts:* ${drafts.length} ready\n`;
    const cats = Object.entries(categories).map(([k, v]) => `${v} ${k}`).join(", ");
    msg += `→ ${cats}\n`;
    msg += `_/drafts to review_`;
  } else {
    msg += `📝 No drafts 📭`;
  }

  // Send
  await sendTelegram(msg);
  console.log("✅ Briefing sent!\n");
  console.log(msg);

  // Clear overnight PRs after briefing (they've been reported)
  const updatedState2 = loadState();
  updatedState2.nightShiftPRs = [];
  require("fs").writeFileSync(STATE_FILE, JSON.stringify(updatedState2, null, 2));
}

// CLI
if (import.meta.main) {
  sendBriefing()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Briefing failed:", err);
      process.exit(1);
    });
}

export { sendBriefing };
