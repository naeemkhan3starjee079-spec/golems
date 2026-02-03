import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { $ } from "bun";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getPendingDrafts, approveDraft, rejectDraft, type Draft } from "./post-generator";
import { createPost as postToSoltome } from "./soltome-client";
import { logEvent, getRecentEvents, formatEventsForClaude } from "./event-log";

// Mac notification helper
async function notify(title: string, message: string) {
  try {
    const escaped = message.replace(/["'\\]/g, " ").slice(0, 100);
    await $`osascript -e ${"display notification \"" + escaped + "\" with title \"" + title + "\""}`.quiet();
  } catch (e) {
    console.error("Notify error:", e);
  }
}

// ClaudeGolem Telegram Bot - On-Demand Claude Spawning
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

// ClaudeGolem Telegram Bot - uses Claude Code CLI with conversation memory

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

// Spawn Claude with session persistence for memory
// Uses --continue to resume the most recent conversation in this directory
async function askClaude(
  message: string,
  onHeartbeat?: () => void
): Promise<string> {
  const prompt = `Be brief (under 500 chars). You are ClaudeGolem.\n\n${message}`;

  // Use a dedicated directory for this bot's conversations
  const BOT_WORKING_DIR = join(HOME, "Gits");  // Run from ~/Gits to access all repos

  try {
    // Ensure working directory exists
    const { mkdirSync, existsSync } = await import("fs");
    if (!existsSync(BOT_WORKING_DIR)) {
      mkdirSync(BOT_WORKING_DIR, { recursive: true });
    }

    // Inject recent events into system prompt so Claude knows what happened
    const recentEvents = await getRecentEvents(24);
    const eventSummary = formatEventsForClaude(recentEvents);
    const soulContent = getSystemPromptContent();
    const personaPrompt = PERSONAS[activePersona]?.prompt || "";
    const systemPrompt = `${soulContent}${personaPrompt}

## While You Were Down
${eventSummary}`;

    // Use --continue to resume from last conversation in this directory
    // This gives us memory across messages!
    const args = [
      "/Users/etanheyman/.local/bin/claude",
      "--dangerously-skip-permissions",
      "--print",
      "--continue",  // Continue from last conversation in cwd
      "--system-prompt", systemPrompt,
      prompt,
    ];

    const proc = Bun.spawn(args, {
      cwd: BOT_WORKING_DIR,  // Use dedicated dir for conversation continuity
      stdout: "pipe",
      stderr: "pipe",
    });

    // Timeout 5 minutes (complex tasks like research + subagents need time)
    const timeout = setTimeout(() => {
      proc.kill();
      console.error("Claude timeout (5 min)");
    }, 300000);

    // Heartbeat every 60s while Claude is working
    const heartbeat = onHeartbeat ? setInterval(() => {
      console.log("[Claude] Still working...");
      onHeartbeat();
    }, 60000) : null;

    await proc.exited;
    clearTimeout(timeout);
    if (heartbeat) clearInterval(heartbeat);

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
    await notify("🤖 ClaudeGolem", `Processing: ${text.slice(0, 50)}...`);

    // Heartbeat: typing indicator every 60s while Claude works
    const response = await askClaude(text, async () => {
      await ctx.replyWithChatAction("typing");
    });

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
  .row()
  .text("✍️ Content").text("📅 Queue").text("🎭 Persona")
  .resized()
  .persistent();

// Available personas for ClaudeGolem
const PERSONAS: Record<string, { name: string; emoji: string; prompt: string }> = {
  default: {
    name: "ClaudeGolem",
    emoji: "🤖",
    prompt: "", // Uses SOUL.md as-is
  },
  influencer: {
    name: "Influencer",
    emoji: "✍️",
    prompt: `\n\n## ACTIVE MODE: Content Creator
You are in CONTENT MODE. Focus on creating Soltome posts.
- Use first person as ClaudeGolem
- Be technical but accessible
- Use markdown formatting
- Keep posts engaging and mysterious`,
  },
  coder: {
    name: "Coder",
    emoji: "💻",
    prompt: `\n\n## ACTIVE MODE: Coder
You are in CODING MODE. Focus on implementation.
- Write working code
- Explain changes briefly
- Run tests when possible`,
  },
  researcher: {
    name: "Researcher",
    emoji: "🔬",
    prompt: `\n\n## ACTIVE MODE: Researcher
You are in RESEARCH MODE. Focus on finding information.
- Search thoroughly
- Cite sources
- Summarize findings`,
  },
};

// Track active persona
let activePersona = "default";

// Track pending content topic requests per chat (MVP content pipeline)
// Using Map to support multiple concurrent users
const pendingContentTopics = new Map<number, { type: string }>();

// Commands
bot.command("start", (ctx) => {
  const state = loadState();
  state.telegramChatId = ctx.chat.id;
  saveState(state);

  ctx.reply(`🤖 *ClaudeGolem v5*

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

// Surf command - disabled for now
bot.command("surf", async (ctx) => {
  await ctx.reply("🏄 Surfing disabled - feature being reworked");
});

// Forage command - disabled for now
bot.command("forage", async (ctx) => {
  await ctx.reply("🌾 Foraging disabled - feature being reworked");
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

bot.command("skip", async (ctx) => {
  const drafts = getPendingDrafts();
  for (const d of drafts) {
    rejectDraft(d.id);
    await logEvent("draft_rejected", { title: d.title, id: d.id, reason: "skipped" }, "claudegolem");
  }
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

  // Log draft approval event
  await logEvent("draft_approved", { title: draft.title, id: draftId }, "claudegolem");

  ctx.reply(`✅ Approved: "${draft.title}"\n\nPosting to Soltome...`);

  // Post to Soltome (uses API key from state.soltomeApiKey or env)
  const result = await postToSoltome(draft.title, draft.content);

  if (result.success) {
    // Log successful Soltome post event
    await logEvent("soltome_post", {
      title: draft.title,
      postId: result.postId,
      creditsUsed: 2,
      creditsRemaining: result.newBalance,
    }, "claudegolem");
    ctx.reply(`🎉 Posted to Soltome! (${result.newBalance} credits left)`);
  } else {
    ctx.reply(`⚠️ Failed to post: ${result.error}`);
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
    // Log draft approval event
    await logEvent("draft_approved", { title: draft.title, id: draftId }, "claudegolem");
    await ctx.editMessageText(`✅ Approved: "${draft.title}"`);

    // Post to Soltome
    const result = await postToSoltome(draft.title, draft.content);
    if (result.success) {
      // Log successful Soltome post event
      await logEvent("soltome_post", {
        title: draft.title,
        postId: result.postId,
        creditsUsed: 2,
        creditsRemaining: result.newBalance,
      }, "claudegolem");
      await ctx.answerCallbackQuery({ text: `Posted to Soltome!` });
    } else {
      await ctx.answerCallbackQuery({ text: `Failed: ${result.error}` });
    }
  } else {
    await ctx.answerCallbackQuery({ text: "Draft not found" });
  }
});

// Reject all drafts
bot.callbackQuery("reject-all", async (ctx) => {
  const drafts = getPendingDrafts();
  for (const d of drafts) {
    rejectDraft(d.id);
    // Log draft rejection event
    await logEvent("draft_rejected", { title: d.title, id: d.id }, "claudegolem");
  }
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

// Content creation callbacks - queue message with persona context
bot.callbackQuery(/^content:/, async (ctx) => {
  const type = ctx.callbackQuery.data?.replace("content:", "") || "";

  // Special handling for "research" - ask for topic first (MVP content pipeline)
  if (type === "research") {
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.answerCallbackQuery({ text: "Error: no chat ID" });
      return;
    }

    pendingContentTopics.set(chatId, { type: "research" });
    await ctx.answerCallbackQuery({ text: "Tell me the topic!" });
    await ctx.editMessageText(`📚 *Research Topic*

What topic should I create content about?

Examples:
• "Zikaron memory system"
• "Night Shift autonomous work"
• "How ClaudeGolem spawns and dies"

_Reply with your topic..._`, { parse_mode: "Markdown" });
    return;
  }

  await ctx.answerCallbackQuery({ text: `Queuing ${type} request...` });

  const typePrompts: Record<string, string> = {
    teaser: "[CONTENT MODE: TEASER] Draft a teaser for tomorrow's reveal. Current series: Philosophy (Spawn→Work→Die→Remember). Keep it mysterious, 1-2 lines max. Output ONLY the draft content.",
    reveal: "[CONTENT MODE: REVEAL] Draft a reveal post about the memory system (Zikaron). Deep-dive, use markdown. Output ONLY the draft content.",
    quick: "[CONTENT MODE: QUICK] Draft a quick hit - stats or humor about ClaudeGolem. Output ONLY the draft content.",
    author: "[CONTENT MODE: AUTHOR] Draft an author note from Etan's perspective about the spawn-and-die architecture. Sign as '- Etan'. Output ONLY the draft content.",
    plan: "[CONTENT MODE: PLAN] Read packages/autonomous/data/content-series/week-1-philosophy.md and show the content plan. Suggest what to post next.",
  };

  const prompt = typePrompts[type] || `Create ${type} content for Soltome.`;

  await ctx.editMessageText(`✍️ *Creating ${type}...*\n\n_Added to queue_`, { parse_mode: "Markdown" });

  // Queue the request - will be processed by regular askClaude with persona in SOUL.md
  queue.push({ ctx, text: prompt });
  console.log(`📥 Content request queued: ${type}`);
  processQueue();
});

// Discard draft
bot.callbackQuery("discard-draft", async (ctx) => {
  await ctx.editMessageText("🗑️ Draft discarded.");
  await ctx.answerCallbackQuery();
});

// Persona selection
bot.callbackQuery(/^persona:/, async (ctx) => {
  const personaKey = ctx.callbackQuery.data?.replace("persona:", "") || "default";
  if (PERSONAS[personaKey]) {
    activePersona = personaKey;
    const persona = PERSONAS[personaKey];
    await ctx.editMessageText(`🎭 Switched to: ${persona.emoji} *${persona.name}*`, { parse_mode: "Markdown" });
    await ctx.answerCallbackQuery({ text: `Now: ${persona.name}` });
  } else {
    await ctx.answerCallbackQuery({ text: "Unknown persona" });
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

  // Check if we're waiting for a content topic (MVP content pipeline)
  const pendingContent = pendingContentTopics.get(ctx.chat.id);
  if (pendingContent) {
    // Allow user to cancel
    if (text.toLowerCase() === "cancel") {
      pendingContentTopics.delete(ctx.chat.id);
      await ctx.reply("❌ Research topic cancelled.");
      return;
    }

    // Sanitize topic: limit length, strip control chars and quotes (prevent prompt injection)
    const topic = text.slice(0, 200).replace(/[\x00-\x1F"'`\\]/g, '').trim();
    pendingContentTopics.delete(ctx.chat.id); // Clear pending state

    if (!topic) {
      await ctx.reply("❌ Topic cannot be empty. Try again with ✍️ Content → 📚 Research Topic");
      return;
    }

    await ctx.reply(`📚 *Creating content about:* "${topic}"

_Spawning influencer agent... This may take a few minutes._`, { parse_mode: "Markdown" });
    await ctx.replyWithChatAction("typing");

    // Create the prompt for the influencer
    const influencerPrompt = `[CONTENT MODE: RESEARCH TOPIC]

Create an engaging Soltome post about: "${topic}"

Instructions:
1. First, explore the relevant code/docs in the golems monorepo to understand the topic
2. Write a post in ClaudeGolem voice (first person, technical but accessible)
3. Use markdown formatting
4. Include a hook/mystery element
5. Keep it factual - only include what you can verify from the code

Output format:
---
title: [Engaging title]
type: reveal
---

[Post content here]

After creating the draft, save it using the post-generator's addDraft function or output it clearly for manual approval.`;

    // Queue the request
    queue.push({ ctx, text: influencerPrompt });
    console.log(`📥 Content research topic queued: "${topic}"`);

    // Start processing
    if (!isProcessing) {
      processQueue();
    }
    return;
  }

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

  if (text === "✍️ Content") {
    // Show content menu with inline buttons
    const keyboard = new InlineKeyboard()
      .text("📚 Research Topic", "content:research")
      .row()
      .text("📝 Draft Teaser", "content:teaser")
      .text("📖 Draft Reveal", "content:reveal")
      .row()
      .text("💬 Draft Quick", "content:quick")
      .text("✏️ Author Note", "content:author")
      .row()
      .text("📅 Week Plan", "content:plan");
    await ctx.reply(`✍️ *Content Studio*

What would you like to create?

📚 *Research Topic* - Tell me a topic, I'll create content about it

_Uses soltome-influencer agent_`, { parse_mode: "Markdown", reply_markup: keyboard });
    return;
  }

  if (text === "📅 Queue") {
    // Show content queue from content-series files
    try {
      const seriesPath = join(GITS, "golems/packages/autonomous/data/content-series/week-1-philosophy.md");
      const { existsSync, readFileSync } = await import("fs");
      if (existsSync(seriesPath)) {
        const content = readFileSync(seriesPath, "utf-8");
        const statusMatch = content.match(/## Series Status[\s\S]*?\|[\s\S]*?\|([\s\S]*?)(?=\n\n##|$)/);
        if (statusMatch) {
          await ctx.reply(`📅 *Content Queue*

${statusMatch[0]}`, { parse_mode: "Markdown" });
        } else {
          await ctx.reply("📅 Content queue is empty. Use ✍️ Content to create posts.");
        }
      } else {
        await ctx.reply("📅 No content series found. Create one with ✍️ Content → Week Plan.");
      }
    } catch (err) {
      await ctx.reply("📅 Error reading content queue.");
    }
    return;
  }

  if (text === "🎭 Persona") {
    // Show persona selector
    const current = PERSONAS[activePersona];
    const keyboard = new InlineKeyboard();
    Object.entries(PERSONAS).forEach(([key, persona]) => {
      const isActive = key === activePersona ? "✓ " : "";
      keyboard.text(`${isActive}${persona.emoji} ${persona.name}`, `persona:${key}`);
    });
    await ctx.reply(`🎭 *Persona Selector*

Current: ${current.emoji} *${current.name}*

_Changes how ClaudeGolem responds_`, { parse_mode: "Markdown", reply_markup: keyboard });
    return;
  }

  // Check for draft approval shortcuts
  if (/^[1-5]$/.test(text)) {
    await handleApproval(ctx, parseInt(text));
    return;
  }

  if (text.toLowerCase() === "skip all" || text.toLowerCase() === "skip") {
    const drafts = getPendingDrafts();
    for (const d of drafts) {
      rejectDraft(d.id);
      await logEvent("draft_rejected", { title: d.title, id: d.id, reason: "skipped" }, "claudegolem");
    }
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
console.log("🤖 ClaudeGolem v5 (gitsClaude + SOUL.md + Notifications)");
console.log("📍 Working dir:", GITS);

bot.start({
  onStart: (botInfo) => {
    console.log(`✅ @${botInfo.username} running`);
  },
});
