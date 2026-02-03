#!/usr/bin/env bun
/**
 * Job Golem - Main Runner
 *
 * Searches Israeli job boards, matches against your profile,
 * and sends top matches via Telegram.
 *
 * Schedule: 5-7 AM and 5-7 PM
 */

import { scrapeAllJobs } from "./scraper";
import { matchJobs, prefilterJobs, type MatchResult } from "./matcher";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "/Users/etanheyman";
const STATE_FILE = join(HOME, ".golems-zikaron/state.json");
const NOTIFY_URL = "http://localhost:3847/notify";
const RESULTS_DIR = join(HOME, ".golems-zikaron/job-golem/results");

// Ensure results directory exists
function ensureResultsDir() {
  const fs = require("fs");
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

// Load Telegram chat ID from state
function getTelegramChatId(): number | null {
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    return state.telegramChatId;
  } catch {
    return null;
  }
}

// Send Telegram notification
async function sendTelegram(title: string, body: string, priority: "default" | "high" = "default") {
  try {
    await fetch(NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, source: "jobs", priority }),  // Routes to 🎯 Jobs topic
    });
  } catch (err) {
    console.error("[Telegram] Failed:", err);
  }
}

// Format job matches for Telegram - consolidated in one message
async function sendJobMatches(matches: MatchResult[]) {
  if (matches.length === 0) {
    await sendTelegram("No Matches", "No new matching jobs found today.");
    return;
  }

  // High-scoring matches (8+) get highlighted
  const hotMatches = matches.filter(m => m.score >= 8);
  const goodMatches = matches.filter(m => m.score >= 6 && m.score < 8);

  // Build one consolidated message with context
  const lines: string[] = [`*${matches.length} Job Matches Found*\n`];

  // Show top matches with WHY they match
  for (const match of matches.slice(0, 6)) {
    const emoji = match.score >= 8 ? "🔥" : match.score >= 7 ? "✨" : "👍";

    lines.push(`${emoji} *${match.score}/10* - ${match.job.title}`);
    lines.push(`📍 ${match.job.company} | ${match.job.location}`);
    // Include the reason WHY this job matches
    if (match.reason) {
      lines.push(`💡 _${match.reason.slice(0, 80)}_`);
    }
    lines.push(`🔗 ${match.job.url}`);
    lines.push(""); // blank line between jobs
  }

  if (matches.length > 6) {
    lines.push(`+${matches.length - 6} more. Use /jobs to see all.`);
  }

  // High priority if we have hot matches
  const priority = hotMatches.length > 0 ? "high" : "default";
  const title = hotMatches.length > 0 ? `🔥 ${hotMatches.length} Hot Matches!` : "Job Matches";

  await sendTelegram(title, lines.join("\n"), priority);
}

// Format job matches for Telegram (legacy - used for /jobs command)
function formatMatchesForTelegram(matches: MatchResult[]): string {
  if (matches.length === 0) {
    return "No new matching jobs found.";
  }

  const lines: string[] = [];

  for (const match of matches.slice(0, 10)) {
    const emoji = match.score >= 8 ? "🔥" : match.score >= 7 ? "✨" : "👍";
    const location = match.job.location || "Israel";

    lines.push(
      `${emoji} *${match.score}/10* - ${match.job.title}`,
      `   🇮🇱 ${match.job.company} • ${location}`,
      `   ${match.job.url}`,
      ""
    );
  }

  if (matches.length > 10) {
    lines.push(`\n_+${matches.length - 10} more_\nUse /jobs to see all`);
  }

  return lines.join("\n");
}

// Save results to file
function saveResults(matches: MatchResult[]) {
  ensureResultsDir();
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "");
  const filename = join(RESULTS_DIR, `jobs-${date}-${time}.json`);

  writeFileSync(filename, JSON.stringify(matches, null, 2));
  console.log(`[Results] Saved to ${filename}`);

  return filename;
}

// Main job search routine
async function runJobSearch() {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${timestamp}] 🤖 Job Golem starting...\n`);
  const startTime = Date.now();

  // 1. Scrape all job boards
  console.log("📡 Scraping job boards...");
  const allJobs = await scrapeAllJobs();

  if (allJobs.length === 0) {
    console.log("No new jobs found.");
    await sendTelegram("Job Golem", "No new jobs found today.");
    return;
  }

  // 2. Quick keyword prefilter
  console.log("\n🔍 Pre-filtering by keywords...");
  const filtered = prefilterJobs(allJobs);
  console.log(`Filtered: ${filtered.length}/${allJobs.length} jobs match keywords`);

  if (filtered.length === 0) {
    await sendTelegram("Job Golem", `Scraped ${allJobs.length} jobs but none matched your keywords.`);
    return;
  }

  // 3. AI scoring with Ollama
  console.log("\n🧠 Scoring with AI...");
  const matches = await matchJobs(filtered, 6);

  // 4. Save results
  const resultsFile = saveResults(matches);

  // 5. Send Telegram notifications (one per job)
  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log("\n📱 Sending Telegram notifications...");
  await sendJobMatches(matches);

  const endTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n[${endTime}] ✅ Job Golem finished in ${duration}s`);
  console.log(`   • Scraped: ${allJobs.length} jobs`);
  console.log(`   • Filtered: ${filtered.length} by keywords`);
  console.log(`   • Matched: ${matches.length} scored 6+`);
}

// CLI
if (import.meta.main) {
  await runJobSearch();
}
