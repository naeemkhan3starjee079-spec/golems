#!/usr/bin/env bun
/**
 * Morning Briefing - 8 AM summary of overnight work
 *
 * Compiles:
 * - Night Shift PR (if created)
 * - Moltbook learnings
 * - Draft posts ready for approval
 */

import { readFileSync } from "fs";
import { join } from "path";
import { getPendingDrafts } from "./post-generator";
import { sendTelegram } from "./night-shift";

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

async function sendBriefing() {
  console.log("☀️ Generating morning briefing...\n");

  const state = loadState();
  const drafts = getPendingDrafts();
  const learnings = loadLearnings();

  // Build briefing - concise and useful
  let msg = `☀️ Morning\n\n`;

  // PR Section
  const prs = state.nightShiftPRs || [];
  const recentPRs = prs.filter((pr) => {
    const prDate = new Date(pr.createdAt);
    const hoursAgo = (Date.now() - prDate.getTime()) / (1000 * 60 * 60);
    return hoursAgo < 24;
  });

  if (recentPRs.length > 0) {
    msg += `*${recentPRs.length} PR${recentPRs.length > 1 ? "s" : ""} overnight:*\n`;
    recentPRs.forEach((pr) => {
      msg += `→ ${pr.repo}: ${pr.url}\n`;
    });
    msg += `\n`;
  } else if (state.lastPrUrl) {
    const repoMatch = state.lastPrUrl.match(/github\.com\/[^/]+\/([^/]+)/);
    const repoName = repoMatch ? repoMatch[1] : "repo";
    msg += `*1 PR:* ${repoName}\n${state.lastPrUrl}\n\n`;
  } else {
    msg += `No PRs overnight\n\n`;
  }

  // Learnings Section
  if (learnings && learnings.posts.length > 0) {
    msg += `*${learnings.posts.length} Moltbook finds* saved\n\n`;
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

    msg += `*${drafts.length} drafts* → `;
    const cats = Object.entries(categories).map(([k, v]) => `${v} ${k}`).join(", ");
    msg += `${cats}\n`;
    msg += `/drafts to review`;
  } else {
    msg += `No drafts 📭`;
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
