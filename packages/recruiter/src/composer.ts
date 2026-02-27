/**
 * RecruiterGolem Composer
 *
 * Telegram commands for interview practice (Elo-rated), outreach tracking,
 * and follow-up management. Extracted from telegram-bot.ts.
 */

import { Composer, InlineKeyboard } from "grammy";
import {
  getCandidateRating,
  getRecommendedDifficulty,
  updateAfterSession,
  getQuestionRating,
  getStatsSummary,
  ALL_MODES,
  type InterviewMode,
} from "./elo";
import {
  initDb as initPracticeDb,
  createSession,
  completeSession,
  getStats,
  getActiveSession,
  formatStats,
} from "./practice-db";
import {
  initDb as initOutreachDb,
  getOutreachStats,
  getPendingFollowups,
  updateOutreachStatus,
  formatOutreachStats,
} from "./outreach-db";
export const recruiterComposer = new Composer();

// Dependency injection to break claude↔recruiter circular dependency
let _queue: Array<{ ctx: unknown; text: string }>;
let _processQueue: () => void;

export function initRecruiterComposer(deps: {
  queue: Array<{ ctx: unknown; text: string }>;
  processQueue: () => void;
}): void {
  _queue = deps.queue;
  _processQueue = deps.processQueue;
}

function assertInitialized(): void {
  if (!_queue || !_processQueue) {
    throw new Error(
      "initRecruiterComposer() must be called before using recruiter composer",
    );
  }
}

// Track pending practice sessions for pass/fail input
const pendingPracticeSessions = new Map<
  number,
  { sessionId: string; mode: InterviewMode }
>();

// Initialize practice database at import time
initPracticeDb();

// /practice command - start interview practice
recruiterComposer.command("practice", async (ctx) => {
  const args =
    ctx.message?.text?.replace("/practice", "").trim().split(/\s+/) || [];
  const modeArg = args[0]?.toLowerCase() as InterviewMode;

  if (!modeArg) {
    const keyboard = new InlineKeyboard();
    keyboard
      .text("💻 Leetcode", "practice:leetcode")
      .text("🏗️ System Design", "practice:system-design")
      .row();
    keyboard
      .text("🐛 Debugging", "practice:debugging")
      .text("📝 Code Review", "practice:code-review")
      .row();
    keyboard
      .text("🗣️ Behavioral", "practice:behavioral")
      .text("⚡ Optimization", "practice:optimization")
      .row();
    keyboard.text("📊 Complexity", "practice:complexity");

    await ctx.reply(
      `🎯 *Interview Practice*

Choose a mode to practice:

• *Leetcode* - Algorithms & data structures
• *System Design* - Architecture & scale
• *Debugging* - Bug finding
• *Code Review* - Quality & security
• *Behavioral* - Soft skills + technical depth
• *Optimization* - Performance improvement
• *Complexity* - Big O analysis

Your Elo ratings:
${getStatsSummary()}`,
      { parse_mode: "Markdown", reply_markup: keyboard },
    );
    return;
  }

  if (!ALL_MODES.includes(modeArg)) {
    await ctx.reply(
      `❌ Unknown mode: ${modeArg}

Valid modes: ${ALL_MODES.join(", ")}`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  const existing = getActiveSession(modeArg);
  if (existing) {
    const keyboard = new InlineKeyboard()
      .text("✅ I Passed", `practice-result:${existing.id}:pass`)
      .text("❌ I Failed", `practice-result:${existing.id}:fail`);

    await ctx.reply(
      `⚠️ You have an active ${modeArg} session!

When you're done, mark your result:`,
      { parse_mode: "Markdown", reply_markup: keyboard },
    );
    return;
  }

  const difficulty = getRecommendedDifficulty(modeArg);
  const rating = getCandidateRating(modeArg);
  const session = createSession(modeArg, difficulty);

  pendingPracticeSessions.set(ctx.chat.id, {
    sessionId: session.id,
    mode: modeArg,
  });

  const company = args[1] || "a top tech company";
  const level = args[2] || "senior engineer";

  const practicePrompt = `Start a ${modeArg} interview practice session.

Company: ${company}
Level: ${level}
Difficulty: ${difficulty}
Current rating: ${rating}

Use the /interview-practice skill prompt for ${modeArg} mode.
Stay in character as the interviewer. One question at a time.`;

  await ctx.reply(
    `🎯 *Starting ${modeArg} Practice*

📊 Your rating: ${rating}
📈 Difficulty: ${difficulty}
🏢 Company: ${company}
💼 Level: ${level}

_Claude will now act as your interviewer..._

When you're done, use the buttons to record your result.`,
    { parse_mode: "Markdown" },
  );

  assertInitialized();
  _queue.push({ ctx, text: practicePrompt });
  _processQueue();
});

// /stats command - show practice statistics
recruiterComposer.command("stats", async (ctx) => {
  const args =
    ctx.message?.text?.replace("/stats", "").trim().split(/\s+/) || [];
  const modeArg = args[0]?.toLowerCase() as InterviewMode | undefined;

  if (modeArg && !ALL_MODES.includes(modeArg)) {
    await ctx.reply(
      `❌ Unknown mode: ${modeArg}

Valid modes: ${ALL_MODES.join(", ")}

Or use \`/stats\` for overall stats.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  const stats = getStats(modeArg);
  const eloSummary = getStatsSummary();

  let response = formatStats(stats, modeArg);
  response += "\n\n" + eloSummary;

  await ctx.reply(response, { parse_mode: "Markdown" });
});

// /outreach command - show outreach statistics and pending drafts
recruiterComposer.command("outreach", async (ctx) => {
  try {
    initOutreachDb();
    const stats = getOutreachStats();
    const followups = getPendingFollowups(5);

    let msg = formatOutreachStats(stats);

    if (followups.length > 0) {
      msg += `\n\n⏰ *Pending Follow-ups (${followups.length})*\n`;
      for (const f of followups.slice(0, 5)) {
        const daysSince = Math.floor(
          (Date.now() - new Date(f.sentAt!).getTime()) / (1000 * 60 * 60 * 24),
        );
        msg += `• Job ${f.jobId} - ${daysSince} days ago\n`;
      }
      if (followups.length > 5) {
        msg += `\n+${followups.length - 5} more. Use /followup to see all.`;
      }
    }

    await ctx.reply(msg, { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply(`❌ Error loading outreach: ${err}`);
  }
});

// /followup command - list outreach needing follow-up
recruiterComposer.command("followup", async (ctx) => {
  try {
    initOutreachDb();
    const daysArg = parseInt(ctx.message?.text?.split(" ")[1] || "5") || 5;
    const followups = getPendingFollowups(daysArg);

    if (followups.length === 0) {
      await ctx.reply(`✅ No pending follow-ups (older than ${daysArg} days).`);
      return;
    }

    let msg = `⏰ *Outreach Needing Follow-up* (>${daysArg} days)\n\n`;

    for (const f of followups.slice(0, 10)) {
      const daysSince = Math.floor(
        (Date.now() - new Date(f.sentAt!).getTime()) / (1000 * 60 * 60 * 24),
      );
      const typeEmoji =
        f.messageType === "email"
          ? "📧"
          : f.messageType === "linkedin_connect"
            ? "🔗"
            : "💬";

      msg += `${typeEmoji} *Job:* ${f.jobId}\n`;
      msg += `📅 Sent ${daysSince} days ago\n`;
      msg += `_${f.messageText.slice(0, 50)}..._\n\n`;
    }

    if (followups.length > 10) {
      msg += `+${followups.length - 10} more pending.`;
    }

    const keyboard = new InlineKeyboard();
    if (followups.length > 0) {
      keyboard.text(
        "✅ Mark Responded",
        `followup:responded:${followups[0].id}`,
      );
      keyboard.text(
        "❌ No Response",
        `followup:no_response:${followups[0].id}`,
      );
    }

    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: keyboard });
  } catch (err) {
    await ctx.reply(`❌ Error loading follow-ups: ${err}`);
  }
});

// Follow-up action callback
recruiterComposer.callbackQuery(/^followup:/, async (ctx) => {
  try {
    const parts = ctx.callbackQuery.data?.split(":") || [];
    const action = parts[1];
    const outreachId = parts[2];

    if (!outreachId || !["responded", "no_response"].includes(action)) {
      await ctx.answerCallbackQuery({ text: "Invalid action" });
      return;
    }

    initOutreachDb();
    updateOutreachStatus(outreachId, action as "responded" | "no_response");

    const emoji = action === "responded" ? "✅" : "❌";
    await ctx.answerCallbackQuery({ text: `${emoji} Status updated!` });
    await ctx.editMessageText(
      `${emoji} Outreach marked as: ${action.replace("_", " ")}`,
    );
  } catch (err) {
    await ctx.answerCallbackQuery({ text: "Error updating status" });
  }
});

// Practice mode selection callback
recruiterComposer.callbackQuery(/^practice:/, async (ctx) => {
  const mode = ctx.callbackQuery.data?.replace(
    "practice:",
    "",
  ) as InterviewMode;

  if (!ALL_MODES.includes(mode)) {
    await ctx.answerCallbackQuery({ text: "Unknown mode" });
    return;
  }

  const existing = getActiveSession(mode);
  if (existing) {
    const keyboard = new InlineKeyboard()
      .text("✅ I Passed", `practice-result:${existing.id}:pass`)
      .text("❌ I Failed", `practice-result:${existing.id}:fail`);

    await ctx.editMessageText(
      `⚠️ You have an active ${mode} session!

When you're done, mark your result:`,
      { parse_mode: "Markdown", reply_markup: keyboard },
    );
    await ctx.answerCallbackQuery();
    return;
  }

  const difficulty = getRecommendedDifficulty(mode);
  const rating = getCandidateRating(mode);
  const session = createSession(mode, difficulty);

  const chatId = ctx.chat?.id;
  if (chatId) {
    pendingPracticeSessions.set(chatId, { sessionId: session.id, mode });
  }

  const practicePrompt = `Start a ${mode} interview practice session.

Difficulty: ${difficulty}
Current rating: ${rating}

Use the /interview-practice skill prompt for ${mode} mode.
Stay in character as the interviewer. One question at a time.`;

  await ctx.editMessageText(
    `🎯 *Starting ${mode} Practice*

📊 Your rating: ${rating}
📈 Difficulty: ${difficulty}

_Claude will now act as your interviewer..._

When you're done, reply with "pass" or "fail" to record your result.`,
    { parse_mode: "Markdown" },
  );
  await ctx.answerCallbackQuery({ text: `Starting ${mode} practice` });

  if (chatId) {
    queue.push({ ctx, text: practicePrompt });
    processQueue();
  }
});

// Practice result callback (pass/fail)
recruiterComposer.callbackQuery(/^practice-result:/, async (ctx) => {
  const parts = ctx.callbackQuery.data?.split(":") || [];
  const sessionId = parts[1];
  const result = parts[2];

  if (!sessionId || !["pass", "fail"].includes(result)) {
    await ctx.answerCallbackQuery({ text: "Invalid result" });
    return;
  }

  const passed = result === "pass";
  const session = await completeSession(sessionId, passed);

  if (!session) {
    await ctx.answerCallbackQuery({ text: "Session not found" });
    return;
  }

  const questionRating = getQuestionRating(session.difficulty);
  const eloResult = updateAfterSession(session.mode, passed, questionRating);

  const chatId = ctx.chat?.id;
  if (chatId) {
    pendingPracticeSessions.delete(chatId);
  }

  const emoji = passed ? "✅" : "❌";
  const changeEmoji = eloResult.change > 0 ? "📈" : "📉";

  await ctx.editMessageText(
    `${emoji} *Session Complete*

Mode: ${session.mode}
Difficulty: ${session.difficulty}
Result: ${passed ? "PASSED" : "FAILED"}

${changeEmoji} Rating: ${eloResult.oldRating} → ${eloResult.newRating} (${eloResult.change > 0 ? "+" : ""}${eloResult.change})

Use \`/stats ${session.mode}\` to see your progress.`,
    { parse_mode: "Markdown" },
  );
  await ctx.answerCallbackQuery({
    text: passed ? "Great job!" : "Keep practicing!",
  });
});
