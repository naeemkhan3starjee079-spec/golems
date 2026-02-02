import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { $ } from "bun";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getPendingDrafts, approveDraft, rejectDraft, type Draft } from "./post-generator";
import { postToMoltbook } from "./moltbook-client";

// Mac notification helper
async function notify(title: string, message: string) {
  try {
    const escaped = message.replace(/["'\\]/g, " ").slice(0, 100);
    await $`osascript -e ${"display notification \"" + escaped + "\" with title \"" + title + "\""}`.quiet();
  } catch (e) {
    console.error("Notify error:", e);
  }
}

// GolemsZikaron Telegram Bot - On-Demand Claude Spawning
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
}
const bot = new Bot(token);

// Paths
const HOME = process.env.HOME || "/Users/etanheyman";
const GITS = join(HOME, "Gits");  // gitsClaude - access all repos
const STATE_FILE = join(HOME, ".golems-zikaron/state.json");
const SOUL_FILE = join(GITS, "golems/packages/autonomous/SOUL.md");

// Session ID for Master Golem (persists across restarts)
const CHAT_SESSION_ID = "telegram-chat";

// State
interface State {
  nightShiftTarget: string;
  rotation: string[];
  telegramChatId: number | null;
  moltbookApiKey?: string;
  pendingDraftIds?: string[]; // Track which drafts were shown for approval
}

function loadState(): State {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch (err) {
    console.warn("[State] Failed to load, using defaults:", (err as Error).message);
    return {
      nightShiftTarget: "songscript",
      rotation: ["songscript", "zikaron", "claude-golem"],
      telegramChatId: null,
    };
  }
}

function saveState(state: State) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Load SOUL.md for persona
function getSystemPromptContent(): string {
  try {
    const content = readFileSync(SOUL_FILE, "utf-8");
    console.log(`[Soul] Loaded ${content.length} chars from ${SOUL_FILE}`);
    return content;
  } catch (err) {
    console.error(`[Soul] Failed to load ${SOUL_FILE}:`, (err as Error).message);
    return "";
  }
}

// Queue for processing (one at a time)
let isProcessing = false;
const queue: Array<{ ctx: any; text: string }> = [];

// Spawn Claude - simple approach that works
async function askClaude(message: string): Promise<string> {
  const prompt = `Be brief (under 500 chars). You are GolemsZikaron.\n\n${message}`;

  try {
    const proc = Bun.spawn([
      "/Users/etanheyman/.local/bin/claude",
      "--dangerously-skip-permissions",
      "--print",  // Non-interactive mode (can't use --resume with -p)
      "--system-prompt", getSystemPromptContent(),  // Read SOUL.md content
      prompt
    ], {
      cwd: GITS,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Timeout 120s (complex questions may take longer in one-shot mode)
    const timeout = setTimeout(() => {
      proc.kill();
      console.error("Claude timeout");
    }, 120000);

    await proc.exited;
    clearTimeout(timeout);

    const output = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    if (stderr) {
      console.error("[Claude] stderr:", stderr.slice(0, 200));
    }
    if (!output.trim()) {
      console.warn("[Claude] Empty stdout, exit code:", proc.exitCode);
    }
    return output.trim() || "No response.";
  } catch (error) {
    console.error("Claude error:", error);
    return "⚠️ Error.";
  }
}

// Process queue
async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;
  const { ctx, text } = queue.shift()!;

  try {
    await ctx.replyWithChatAction("typing");

    console.log(`🤖 Spawning Claude for: "${text.slice(0, 50)}..."`);
    await notify("🤖 GolemsZikaron", `Processing: ${text.slice(0, 50)}...`);

    const response = await askClaude(text);
    console.log(`✅ Claude responded (${response.length} chars)`);
    await notify("✅ Claude Done", response.slice(0, 80));

    // Split long messages
    if (response.length > 4000) {
      const chunks = response.match(/.{1,4000}/gs) || [response];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(response);
    }
  } catch (error) {
    console.error("Error:", error);
    await ctx.reply("⚠️ Error processing message.");
  }

  isProcessing = false;
  processQueue();
}

// Persistent Reply Keyboard (menu at bottom)
const menuKeyboard = new Keyboard()
  .text("📝 Drafts").text("🌙 Tonight").text("📊 Status")
  .resized()
  .persistent();

// Commands
bot.command("start", (ctx) => {
  const state = loadState();
  state.telegramChatId = ctx.chat.id;
  saveState(state);

  ctx.reply(`🤖 *GolemsZikaron v5*

Master Golem + Night Shift workers.

Use the buttons below or just chat!`, {
    parse_mode: "Markdown",
    reply_markup: menuKeyboard
  });
});

bot.command("status", (ctx) => {
  const state = loadState();
  const queueLen = queue.length;

  ctx.reply(`📊 *Status*

🎯 Night Shift: \`${state.nightShiftTarget}\`
📬 Queue: ${queueLen} messages
⚙️ Processing: ${isProcessing ? "yes" : "idle"}
🧠 Mode: gitsClaude (~/Gits)

_Using -s (skip) + SOUL.md_`, { parse_mode: "Markdown" });
});

// Morning briefing command
bot.command("morning", async (ctx) => {
  ctx.reply("☀️ Generating morning briefing...");
  try {
    const { sendBriefing } = await import("./briefing");
    await sendBriefing();
  } catch (err) {
    ctx.reply(`❌ Briefing failed: ${err}`);
  }
});

// Job Golem - view matched jobs
bot.command("jobs", async (ctx) => {
  const resultsDir = join(HOME, ".golems-zikaron/job-golem/results");
  const fs = require("fs");

  try {
    // Find latest results file
    const files = fs.readdirSync(resultsDir)
      .filter((f: string) => f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) {
      await ctx.reply("📭 No job results yet. Run Job Golem first.");
      return;
    }

    const latestFile = join(resultsDir, files[0]);
    const matches = JSON.parse(fs.readFileSync(latestFile, "utf-8"));

    if (matches.length === 0) {
      await ctx.reply("📭 No matching jobs in latest search.");
      return;
    }

    // Parse page number from command
    const page = parseInt(ctx.message?.text?.split(" ")[1] || "1") || 1;
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

    // Navigation keyboard
    const keyboard = new InlineKeyboard();
    if (page > 1) keyboard.text("⬅️ Prev", `jobs:${page - 1}`);
    if (page < totalPages) keyboard.text("Next ➡️", `jobs:${page + 1}`);

    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: keyboard });
  } catch (err) {
    await ctx.reply(`❌ Error loading jobs: ${err}`);
  }
});

// Job query command - ask questions about your jobs
bot.command("jobq", async (ctx) => {
  console.log("[jobq] Received command");
  const question = ctx.message?.text?.replace("/jobq", "").trim();

  if (!question) {
    await ctx.reply("Usage: `/jobq <question>`\n\nExamples:\n• `/jobq which companies use React?`\n• `/jobq best AI/ML roles`\n• `/jobq tell me about the Taboola job`", { parse_mode: "Markdown" });
    return;
  }

  console.log(`[jobq] Question: ${question}`);
  const resultsDir = join(HOME, ".golems-zikaron/job-golem/results");
  const fs = require("fs");

  try {
    const files = fs.readdirSync(resultsDir).filter((f: string) => f.endsWith(".json")).sort().reverse();
    console.log(`[jobq] Found ${files.length} result files`);

    if (files.length === 0) {
      await ctx.reply("📭 No job results yet. Run Job Golem first.");
      return;
    }

    const latestFile = join(resultsDir, files[0]);
    const matches = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
    console.log(`[jobq] Loaded ${matches.length} job matches`);

    // Build job context for Claude
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
bot.callbackQuery(/^jobs:/, async (ctx) => {
  const page = parseInt(ctx.callbackQuery.data?.replace("jobs:", "") || "1");
  const resultsDir = join(HOME, ".golems-zikaron/job-golem/results");
  const fs = require("fs");

  try {
    const files = fs.readdirSync(resultsDir).filter((f: string) => f.endsWith(".json")).sort().reverse();
    const latestFile = join(resultsDir, files[0]);
    const matches = JSON.parse(fs.readFileSync(latestFile, "utf-8"));

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

    await ctx.editMessageText(msg, { parse_mode: "Markdown", reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  } catch (err) {
    await ctx.answerCallbackQuery({ text: "Error loading jobs" });
  }
});

bot.command("tonight", async (ctx) => {
  const state = loadState();
  const arg = ctx.message?.text?.split(" ")[1]?.toLowerCase();

  // If arg provided, handle directly
  if (arg && state.rotation.includes(arg)) {
    state.nightShiftTarget = arg;
    saveState(state);
    await ctx.reply(`✅ Tonight: \`${arg}\``, { parse_mode: "Markdown" });
    return;
  }

  // Build keyboard with repo buttons
  const keyboard = new InlineKeyboard();
  state.rotation.forEach(repo => {
    const current = repo === state.nightShiftTarget ? "✓ " : "";
    keyboard.text(`${current}${repo}`, `tonight:${repo}`);
  });

  await ctx.reply(
    `🌙 *Night Shift Target*\nCurrent: \`${state.nightShiftTarget}\`\n\nTap to change:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

bot.command("repos", (ctx) => {
  const state = loadState();
  ctx.reply(`📁 ${state.rotation.map(r => `\`${r}\``).join(" • ")}`, { parse_mode: "Markdown" });
});

// Surf command - trigger manual Moltbook surfing
bot.command("surf", async (ctx) => {
  await ctx.reply("🏄 Starting Moltbook surfing session...");
  try {
    const { surfMoltbook, getPendingApprovals } = await import("./ollama-moltbook-surfer");
    await surfMoltbook();
    const pending = getPendingApprovals();
    await ctx.reply(`✅ Surfing complete!\n\nPending approvals: ${pending.length}`);
  } catch (err) {
    await ctx.reply(`❌ Surfing failed: ${err}`);
  }
});

// Draft approval commands with inline keyboard
bot.command("drafts", async (ctx) => {
  const drafts = getPendingDrafts();

  if (drafts.length === 0) {
    await ctx.reply("📝 No pending drafts.");
    return;
  }

  let msg = `📝 *Pending Drafts* (${drafts.length})\n\n`;

  drafts.slice(0, 5).forEach((draft, i) => {
    msg += `*[${i + 1}]* ${draft.title}\n`;
    msg += `_${draft.content.slice(0, 60)}..._\n`;
    msg += `Score: ${draft.avgScore.toFixed(1)}/10\n\n`;
  });

  // Build inline keyboard with approve buttons
  const keyboard = new InlineKeyboard();
  drafts.slice(0, 5).forEach((draft, i) => {
    keyboard.text(`✅ ${i + 1}`, `approve:${draft.id}`);
  });
  keyboard.row();
  keyboard.text("❌ Reject All", "reject-all");
  keyboard.text("⏭️ Skip", "skip-drafts");

  await ctx.reply(msg, {
    parse_mode: "Markdown",
    reply_markup: keyboard
  });
});

bot.command("approve", async (ctx) => {
  const num = parseInt(ctx.message?.text?.split(" ")[1] || "");
  await handleApproval(ctx, num);
});

bot.command("skip", (ctx) => {
  const drafts = getPendingDrafts();
  drafts.forEach((d) => rejectDraft(d.id));
  ctx.reply(`⏭️ Skipped ${drafts.length} drafts.`);
});

// Handle approval by number
async function handleApproval(ctx: any, num: number) {
  const state = loadState();
  const draftIds = state.pendingDraftIds || [];

  if (num < 1 || num > draftIds.length) {
    ctx.reply(`❌ Invalid. Reply 1-${draftIds.length} or "skip all"`);
    return;
  }

  const draftId = draftIds[num - 1];
  const draft = approveDraft(draftId);

  if (!draft) {
    ctx.reply("❌ Draft not found.");
    return;
  }

  ctx.reply(`✅ Approved: "${draft.title}"\n\nPosting to Moltbook...`);

  // Post to Moltbook if API key is set
  if (state.moltbookApiKey) {
    const success = await postToMoltbook(
      state.moltbookApiKey,
      draft.submolt || "todayilearned",
      draft.title,
      draft.content
    );

    if (success) {
      ctx.reply(`🎉 Posted to m/${draft.submolt}!`);
    } else {
      ctx.reply(`⚠️ Failed to post. Check Moltbook API key.`);
    }
  } else {
    ctx.reply(`⚠️ No Moltbook API key. Set with /setmoltkey YOUR_KEY`);
  }
}

bot.command("setmoltkey", (ctx) => {
  const key = ctx.message?.text?.split(" ").slice(1).join(" ");

  if (!key) {
    ctx.reply("Usage: /setmoltkey YOUR_MOLTBOOK_API_KEY");
    return;
  }

  const state = loadState();
  state.moltbookApiKey = key;
  saveState(state);

  ctx.reply("✅ Moltbook API key saved.");
});

// ═══════════════════════════════════════════════════════
// Inline Keyboard Callback Handlers
// ═══════════════════════════════════════════════════════

// Approve draft by ID
bot.callbackQuery(/^approve:/, async (ctx) => {
  const draftId = ctx.callbackQuery.data?.replace("approve:", "") || "";
  const draft = approveDraft(draftId);

  if (draft) {
    await ctx.editMessageText(`✅ Approved: "${draft.title}"`);

    // Post to Moltbook if API key is set
    const state = loadState();
    if (state.moltbookApiKey) {
      const success = await postToMoltbook(
        state.moltbookApiKey,
        draft.submolt || "todayilearned",
        draft.title,
        draft.content
      );
      if (success) {
        await ctx.answerCallbackQuery({ text: `Posted to m/${draft.submolt}!` });
      } else {
        await ctx.answerCallbackQuery({ text: "Failed to post to Moltbook" });
      }
    } else {
      await ctx.answerCallbackQuery({ text: "Approved (no Moltbook key)" });
    }
  } else {
    await ctx.answerCallbackQuery({ text: "Draft not found" });
  }
});

// Reject all drafts
bot.callbackQuery("reject-all", async (ctx) => {
  const drafts = getPendingDrafts();
  drafts.forEach(d => rejectDraft(d.id));
  await ctx.editMessageText(`❌ Rejected ${drafts.length} drafts.`);
  await ctx.answerCallbackQuery();
});

// Skip drafts (dismiss without action)
bot.callbackQuery("skip-drafts", async (ctx) => {
  await ctx.editMessageText("⏭️ Skipped for now.");
  await ctx.answerCallbackQuery();
});

// Tonight repo selection - close buttons after selection
bot.callbackQuery(/^tonight:/, async (ctx) => {
  const repo = ctx.callbackQuery.data?.replace("tonight:", "") || "";
  const state = loadState();

  if (state.rotation.includes(repo)) {
    state.nightShiftTarget = repo;
    saveState(state);

    // Remove buttons, just show confirmation
    await ctx.editMessageText(`🌙 Tonight: \`${repo}\``, { parse_mode: "Markdown" });
    await ctx.answerCallbackQuery({ text: `Set to ${repo}` });
  } else {
    await ctx.answerCallbackQuery({ text: "Unknown repo" });
  }
});

// Catch-all for unknown callbacks
bot.on("callback_query:data", async (ctx) => {
  console.log("Unknown callback:", ctx.callbackQuery.data);
  await ctx.answerCallbackQuery();
});

// Handle messages - queue and spawn Claude
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  // Skip commands - they're handled by bot.command() handlers
  if (text.startsWith("/")) {
    return;
  }

  // Save chat ID
  const state = loadState();
  state.telegramChatId = ctx.chat.id;
  saveState(state);

  // Handle Reply Keyboard buttons
  if (text === "📝 Drafts") {
    // Trigger /drafts command
    const drafts = getPendingDrafts();
    if (drafts.length === 0) {
      await ctx.reply("📝 No pending drafts.");
      return;
    }
    let msg = `📝 *Pending Drafts* (${drafts.length})\n\n`;
    drafts.slice(0, 5).forEach((draft, i) => {
      msg += `*[${i + 1}]* ${draft.title}\n`;
      msg += `_${draft.content.slice(0, 60)}..._\n`;
      msg += `Score: ${draft.avgScore.toFixed(1)}/10\n\n`;
    });
    const keyboard = new InlineKeyboard();
    drafts.slice(0, 5).forEach((draft, i) => {
      keyboard.text(`✅ ${i + 1}`, `approve:${draft.id}`);
    });
    keyboard.row();
    keyboard.text("❌ Reject All", "reject-all");
    keyboard.text("⏭️ Skip", "skip-drafts");
    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: keyboard });
    return;
  }

  if (text === "🌙 Tonight") {
    // Trigger /tonight command
    const keyboard = new InlineKeyboard();
    state.rotation.forEach(repo => {
      const current = repo === state.nightShiftTarget ? "✓ " : "";
      keyboard.text(`${current}${repo}`, `tonight:${repo}`);
    });
    await ctx.reply(
      `🌙 *Night Shift Target*\nCurrent: \`${state.nightShiftTarget}\`\n\nTap to change:`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
    return;
  }

  if (text === "📊 Status") {
    // Trigger /status command
    const queueLen = queue.length;
    await ctx.reply(`📊 *Status*

🎯 Night Shift: \`${state.nightShiftTarget}\`
📬 Queue: ${queueLen} messages
⚙️ Processing: ${isProcessing ? "yes" : "idle"}
🧠 Session: \`${CHAT_SESSION_ID}\``, { parse_mode: "Markdown" });
    return;
  }

  // Check for draft approval shortcuts
  if (/^[1-5]$/.test(text)) {
    await handleApproval(ctx, parseInt(text));
    return;
  }

  if (text.toLowerCase() === "skip all" || text.toLowerCase() === "skip") {
    const drafts = getPendingDrafts();
    drafts.forEach((d) => rejectDraft(d.id));
    ctx.reply(`⏭️ Skipped ${drafts.length} drafts.`);
    return;
  }

  // Add to queue for Claude
  queue.push({ ctx, text });
  console.log(`📥 Queued: "${text.slice(0, 50)}..."`);

  // Process
  if (!isProcessing) {
    processQueue();
  } else if (queue.length > 1) {
    await ctx.reply(`⏳ Queued (${queue.length - 1} ahead)`);
  }
});

// ═══════════════════════════════════════════════════════
// HTTP Server for notifications (replaces ntfy)
// ═══════════════════════════════════════════════════════
const NOTIFY_PORT = 3847;

// Per-bot notification styles
const BOT_STYLES: Record<string, { icon: string; format: (t: string, b: string) => string }> = {
  claude: {
    icon: "🤖",
    format: (t, b) => `🤖 *${t}*\n${b}`,
  },
  ralph: {
    icon: "🔄",
    format: (t, b) => `🔄 *Ralph*: ${t}\n\n${b}`,
  },
  nightshift: {
    icon: "🌙",
    format: (t, b) => `🌙 *Night Shift*\n${t}\n${b}`,
  },
  default: {
    icon: "📨",
    format: (t, b) => `📨 *${t}*\n\n${b}`,
  },
};

async function sendNotificationToTelegram(data: {
  title: string;
  body: string;
  priority?: string;
  source?: string;  // claude, ralph, nightshift
}) {
  const state = loadState();
  const chatId = state.telegramChatId;

  if (!chatId) {
    console.log("[Notify] No chat ID saved, skipping");
    return;
  }

  const style = BOT_STYLES[data.source || "default"] || BOT_STYLES.default;
  const priorityIcon = data.priority === "high" ? "🔔 " : "";
  const message = priorityIcon + style.format(data.title, data.body);

  try {
    // Try Markdown first, fall back to plain text if it fails
    try {
      await bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (mdErr) {
      // Markdown failed (likely special chars), send plain text
      console.warn("[Notify] Markdown failed, falling back to plain text:", (mdErr as Error).message);
      const plainMessage = message.replace(/[*_`\[\]]/g, "");
      await bot.api.sendMessage(chatId, plainMessage);
    }
    console.log(`[Notify] Sent: ${data.title}`);
  } catch (err) {
    console.error("[Notify] Failed:", err);
  }
}

// Start HTTP server for receiving notifications from hooks
Bun.serve({
  port: NOTIFY_PORT,
  fetch: async (req) => {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/notify") {
      try {
        const data = await req.json();
        await sendNotificationToTelegram(data);
        return new Response("ok");
      } catch (err) {
        console.error("[Notify] Error:", err);
        return new Response("error", { status: 500 });
      }
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(`📡 Notification server on port ${NOTIFY_PORT}`);

// Start Telegram bot
console.log("🤖 GolemsZikaron v5 (gitsClaude + SOUL.md + Notifications)");
console.log("📍 Working dir:", GITS);

bot.start({
  onStart: (botInfo) => {
    console.log(`✅ @${botInfo.username} running`);
  },
});
