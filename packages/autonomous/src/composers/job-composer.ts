/**
 * JobGolem Composer
 *
 * Telegram commands for viewing job matches, querying jobs, and pagination.
 * Extracted from telegram-bot.ts for componentization.
 */

import { Composer, InlineKeyboard } from "grammy";
import { join } from "path";
import { readFileSync, readdirSync } from "fs";
import { HOME, askClaude } from "../lib/bot-shared";

export const jobComposer = new Composer();

const RESULTS_DIR = join(HOME, ".golems-zikaron/job-golem/results");

function loadLatestMatches(): any[] | null {
  try {
    const files = readdirSync(RESULTS_DIR)
      .filter((f: string) => f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const latestFile = join(RESULTS_DIR, files[0]);
    return JSON.parse(readFileSync(latestFile, "utf-8"));
  } catch {
    return null;
  }
}

function formatJobPage(matches: any[], page: number): { msg: string; keyboard: InlineKeyboard } {
  const perPage = 5;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const totalPages = Math.ceil(matches.length / perPage);

  let msg = `🎯 *Job Matches* (${matches.length} total)\nPage ${page}/${totalPages}\n\n`;

  for (const match of matches.slice(start, end)) {
    const emoji = match.score >= 8 ? "🔥" : match.score >= 7 ? "✨" : "👍";
    msg += `${emoji} *${match.score}/10* - ${match.job.title}\n`;
    msg += `🇮🇱 ${match.job.company} • ${match.job.location}\n`;
    msg += `${match.job.url}\n`;
    if (match.reason) {
      msg += `_${match.reason.slice(0, 100)}..._\n`;
    }
    msg += "\n";
  }

  const keyboard = new InlineKeyboard();
  if (page > 1) keyboard.text("⬅️ Prev", `jobs:${page - 1}`);
  if (page < totalPages) keyboard.text("Next ➡️", `jobs:${page + 1}`);

  return { msg, keyboard };
}

// /jobs command - view matched jobs
jobComposer.command("jobs", async (ctx) => {
  try {
    const matches = loadLatestMatches();

    if (!matches) {
      await ctx.reply("📭 No job results yet. Run Job Golem first.");
      return;
    }

    if (matches.length === 0) {
      await ctx.reply("📭 No matching jobs in latest search.");
      return;
    }

    const page = parseInt(ctx.message?.text?.split(" ")[1] || "1") || 1;
    const { msg, keyboard } = formatJobPage(matches, page);

    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: keyboard });
  } catch (err) {
    await ctx.reply(`❌ Error loading jobs: ${err}`);
  }
});

// /jobq command - ask questions about your jobs
jobComposer.command("jobq", async (ctx) => {
  console.log("[jobq] Received command");
  const question = ctx.message?.text?.replace("/jobq", "").trim();

  if (!question) {
    await ctx.reply("Usage: `/jobq <question>`\n\nExamples:\n• `/jobq which companies use React?`\n• `/jobq best AI/ML roles`\n• `/jobq tell me about the Taboola job`", { parse_mode: "Markdown" });
    return;
  }

  console.log(`[jobq] Question: ${question}`);

  try {
    const matches = loadLatestMatches();

    if (!matches || matches.length === 0) {
      await ctx.reply("📭 No job results yet. Run Job Golem first.");
      return;
    }

    console.log(`[jobq] Loaded ${matches.length} job matches`);

    const jobContext = matches.slice(0, 15).map((m: any, i: number) =>
      `[${i + 1}] ${m.score}/10 - ${m.job.title} @ ${m.job.company}\n   ${m.job.location} | ${m.job.source}\n   ${m.reason || "No reason"}\n   ${m.job.url}`
    ).join("\n\n");

    await ctx.replyWithChatAction("typing");

    const prompt = `Here are my latest job matches:\n\n${jobContext}\n\nQuestion: ${question}\n\nAnswer briefly and helpfully.`;
    console.log("[jobq] Calling Claude...");
    const response = await askClaude(prompt);
    console.log(`[jobq] Claude responded: ${response.slice(0, 50)}...`);

    await ctx.reply(response);
  } catch (err) {
    console.error("[jobq] Error:", err);
    await ctx.reply(`❌ Error: ${err}`);
  }
});

// Jobs pagination callback
jobComposer.callbackQuery(/^jobs:/, async (ctx) => {
  const page = parseInt(ctx.callbackQuery.data?.replace("jobs:", "") || "1");

  try {
    const matches = loadLatestMatches();
    if (!matches || matches.length === 0) {
      await ctx.answerCallbackQuery({ text: "No jobs found" });
      return;
    }

    const { msg, keyboard } = formatJobPage(matches, page);

    await ctx.editMessageText(msg, { parse_mode: "Markdown", reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  } catch (err) {
    await ctx.answerCallbackQuery({ text: "Error loading jobs" });
  }
});
