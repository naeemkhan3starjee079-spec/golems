import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { $ } from "bun";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { getPendingDrafts, approveDraft, rejectDraft, type Draft } from "./post-generator";
import { createPost as postToSoltome } from "./soltome-client";
import { logEvent, getRecentEvents, formatEventsForClaude } from "./event-log";
import { runJobSearch } from "./job-golem/index";
import { runCursorResearch, runCursorVerification, readResearch } from "./cursor-helper";
import {
  getCandidateRating,
  getRecommendedDifficulty,
  updateAfterSession,
  getQuestionRating,
  getStatsSummary,
  ALL_MODES,
  type InterviewMode,
} from "./recruiter-golem/elo";
import {
  initDb as initPracticeDb,
  createSession,
  completeSession,
  getStats,
  getActiveSession,
  formatStats,
} from "./recruiter-golem/practice-db";
import {
  initDb as initOutreachDb,
  getOutreachStats,
  getPendingFollowups,
  getOutreachByJob,
  updateOutreachStatus,
  formatOutreachStats,
  type Outreach,
} from "./recruiter-golem/outreach-db";

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

// Security: Whitelist allowed Telegram user IDs
// Get your ID: message @userinfobot on Telegram, or check logs below
const ALLOWED_USER_IDS = process.env.TELEGRAM_ALLOWED_IDS
  ?.split(",")
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => !isNaN(id)) || [];

// Auth check helper - returns true if authorized
function isAuthorized(userId: number | undefined): boolean {
  if (ALLOWED_USER_IDS.length === 0) return true; // No whitelist = allow all (backwards compat)
  if (!userId) return false;
  return ALLOWED_USER_IDS.includes(userId);
}

// Global auth middleware - blocks ALL interactions from non-whitelisted users
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!isAuthorized(userId)) {
    console.log(`[Auth] Blocked user ${userId} from ${ctx.chat?.id}`);
    return; // Silent block
  }
  await next();
});

// Paths
import { homedir } from "os";

const HOME = process.env.HOME || homedir();
const GITS = join(HOME, "Gits");  // gitsClaude - access all repos
const STATE_FILE = join(HOME, ".golems-zikaron/state.json");
const SOUL_FILE = join(GITS, "golems/packages/autonomous/SOUL.md");

// ClaudeGolem Telegram Bot - uses Claude Code CLI with conversation memory

// State
interface State {
  nightShiftTarget: string;
  rotation: string[];
  telegramChatId: number | null;
  nightShiftPRs: Array<{ url: string; repo: string; createdAt: string }>;
  lastNightShift: string | null;
  pendingDraftIds?: string[]; // Track which drafts were shown for approval
  // Group with Topics support
  groupChatId?: number;        // The group chat ID
  topics?: {
    // Note: "claude" source goes to General (no thread ID needed)
    alerts?: number;           // 🔔 Alerts topic thread ID
    nightshift?: number;       // 🌙 Night Shift topic thread ID
    email?: number;            // 📧 Email topic thread ID
    jobs?: number;             // 🎯 Jobs topic thread ID
    recruiter?: number;        // 👔 Recruiter topic thread ID
  };
}

// ═══════════════════════════════════════════════════════
// CONTENT PIPELINE (A2)
// ═══════════════════════════════════════════════════════

// Content task state machine: created → researching → drafting → verifying → review → posted
type ContentTaskStatus = "created" | "researching" | "drafting" | "verifying" | "review" | "posted" | "failed";

interface ContentTask {
  id: string;
  topic: string;
  repo: string;
  status: ContentTaskStatus;
  createdAt: string;
  updatedAt: string;
  researchPath?: string;
  draftPath?: string;
  verificationAttempts: number;
  lastVerification?: {
    confidence: number;
    corrections: string[];
  };
  error?: string;
}

const TASKS_DIR = join(HOME, ".golems-zikaron/tasks");
const DRAFTS_DIR = join(HOME, ".golems-zikaron/drafts");
const MAX_VERIFICATION_ATTEMPTS = 2;
const CONFIDENCE_THRESHOLD = 75;

// Ensure directories exist
function ensureContentDirs(): void {
  if (!existsSync(TASKS_DIR)) mkdirSync(TASKS_DIR, { recursive: true });
  if (!existsSync(DRAFTS_DIR)) mkdirSync(DRAFTS_DIR, { recursive: true });
}

/**
 * Create a new content task
 */
function createContentTask(topic: string, repo: string = "golems/packages/autonomous"): ContentTask {
  ensureContentDirs();
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const task: ContentTask = {
    id,
    topic,
    repo,
    status: "created",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    verificationAttempts: 0,
  };
  saveContentTask(task);
  console.log(`[ContentPipeline] Created task ${id}: ${topic}`);
  return task;
}

function saveContentTask(task: ContentTask): void {
  task.updatedAt = new Date().toISOString();
  writeFileSync(join(TASKS_DIR, `${task.id}.json`), JSON.stringify(task, null, 2));
}

function loadContentTask(taskId: string): ContentTask | null {
  const path = join(TASKS_DIR, `${taskId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Run research phase using Cursor CLI
 */
async function runResearchPhase(taskId: string): Promise<boolean> {
  const task = loadContentTask(taskId);
  if (!task) return false;

  task.status = "researching";
  saveContentTask(task);

  console.log(`[ContentPipeline] Starting research for: ${task.topic}`);

  const researchPrompt = `Research "${task.topic}" in this codebase for a Soltome post.

Use @codebase to find:
1. Core files and entry points related to ${task.topic}
2. Key functions, types, and data flow
3. How it integrates with other systems
4. Any interesting implementation details

Output a comprehensive technical overview that can be used to write an engaging post.
Include code snippets and file paths.`;

  const result = await runCursorResearch(task.repo, task.topic, researchPrompt, { verbose: true });

  if (result.success && result.outputPath) {
    task.researchPath = result.outputPath;
    task.status = "drafting";
    saveContentTask(task);
    console.log(`[ContentPipeline] Research complete: ${result.outputPath}`);
    return true;
  } else {
    task.status = "failed";
    task.error = result.error || "Research failed";
    saveContentTask(task);
    console.error(`[ContentPipeline] Research failed: ${task.error}`);
    return false;
  }
}

/**
 * Run influencer phase - spawn Claude to write draft
 */
async function runInfluencerPhase(taskId: string): Promise<boolean> {
  const task = loadContentTask(taskId);
  if (!task || !task.researchPath) return false;

  task.status = "drafting";
  saveContentTask(task);

  console.log(`[ContentPipeline] Starting influencer for: ${task.topic}`);

  // Read research
  const research = readResearch(task.repo, task.topic);
  if (!research) {
    task.status = "failed";
    task.error = "Research file not found";
    saveContentTask(task);
    return false;
  }

  // Spawn Claude with influencer agent
  const soulContent = getSystemPromptContent();
  const draftPath = join(DRAFTS_DIR, `${task.id}.json`);

  const influencerPrompt = `You are the soltome-influencer agent. Create an engaging post about "${task.topic}".

## Research (use this as source material):
${research.slice(0, 8000)}

## Instructions:
1. Write in ClaudeGolem voice (first person, technical but accessible)
2. Create a compelling hook in the first line
3. Use markdown formatting
4. Include a CLAIMS section at the end with factual claims that can be verified

## Output Format (JSON):
{
  "title": "Engaging title here",
  "content": "Full post content here...",
  "claims": [
    "Claim 1 that can be verified against code",
    "Claim 2 about specific files or functions"
  ]
}

Output ONLY the JSON, no explanation.`;

  const args = [
    "/Users/etanheyman/.local/bin/claude",
    "--dangerously-skip-permissions",
    "--print",
    "--system-prompt", soulContent,
    influencerPrompt,
  ];

  try {
    const proc = Bun.spawn(args, {
      cwd: join(GITS, task.repo),
      stdout: "pipe",
      stderr: "pipe",
    });

    const timeout = setTimeout(() => proc.kill(), 3 * 60 * 1000); // 3 min timeout
    await proc.exited;
    clearTimeout(timeout);

    const output = await new Response(proc.stdout).text();

    // Parse JSON from output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      task.status = "failed";
      task.error = "No JSON in influencer output";
      saveContentTask(task);
      return false;
    }

    const draft = JSON.parse(jsonMatch[0]);
    writeFileSync(draftPath, JSON.stringify(draft, null, 2));
    task.draftPath = draftPath;
    task.status = "verifying";
    saveContentTask(task);

    console.log(`[ContentPipeline] Draft created: ${draftPath}`);
    return true;
  } catch (err) {
    task.status = "failed";
    task.error = `Influencer error: ${err}`;
    saveContentTask(task);
    return false;
  }
}

/**
 * Run verification phase using Cursor CLI
 */
async function runVerificationPhase(taskId: string): Promise<{ passed: boolean; confidence: number; corrections: string[] }> {
  const task = loadContentTask(taskId);
  if (!task || !task.draftPath || !task.researchPath) {
    return { passed: false, confidence: 0, corrections: ["Task or paths missing"] };
  }

  task.status = "verifying";
  task.verificationAttempts++;
  saveContentTask(task);

  console.log(`[ContentPipeline] Verification attempt ${task.verificationAttempts} for: ${task.topic}`);

  const result = await runCursorVerification(task.draftPath, task.researchPath, { verbose: true });

  if (!result.success) {
    return { passed: false, confidence: 0, corrections: [result.error || "Verification failed"] };
  }

  task.lastVerification = {
    confidence: result.confidence,
    corrections: result.corrections,
  };

  if (result.confidence >= CONFIDENCE_THRESHOLD) {
    task.status = "review";
    saveContentTask(task);
    console.log(`[ContentPipeline] Verification passed: ${result.confidence}%`);
    return { passed: true, confidence: result.confidence, corrections: result.corrections };
  }

  // Check if we should retry
  if (task.verificationAttempts < MAX_VERIFICATION_ATTEMPTS) {
    task.status = "drafting"; // Loop back to influencer
    saveContentTask(task);
    console.log(`[ContentPipeline] Verification failed (${result.confidence}%), will retry`);
  } else {
    task.status = "review"; // Send to human review even if failed
    saveContentTask(task);
    console.log(`[ContentPipeline] Max attempts reached, sending to review`);
  }

  return { passed: false, confidence: result.confidence, corrections: result.corrections };
}

/**
 * Handle verification result - loop back to influencer if needed
 */
async function handleVerificationResult(
  taskId: string,
  result: { passed: boolean; confidence: number; corrections: string[] }
): Promise<void> {
  const task = loadContentTask(taskId);
  if (!task) return;

  if (result.passed) {
    // Ready for human review
    console.log(`[ContentPipeline] Task ${taskId} ready for review`);
    return;
  }

  if (task.verificationAttempts < MAX_VERIFICATION_ATTEMPTS && task.status === "drafting") {
    // Loop back: run influencer with corrections
    console.log(`[ContentPipeline] Looping back to influencer with ${result.corrections.length} corrections`);

    // Update the research file with corrections for next influencer run
    // (The influencer will read this and adjust)
    await runInfluencerPhase(taskId);
    const verifyResult = await runVerificationPhase(taskId);
    await handleVerificationResult(taskId, verifyResult);
  }
}

/**
 * Run the full content pipeline for a topic
 */
async function runContentPipeline(
  topic: string,
  repo: string,
  onProgress: (status: string) => Promise<void>
): Promise<ContentTask> {
  // 1. Create task
  const task = createContentTask(topic, repo);
  await onProgress(`📋 Task created: ${task.id.slice(0, 12)}`);

  // 2. Research phase
  await onProgress(`🔬 Researching "${topic}"...`);
  const researchOk = await runResearchPhase(task.id);
  if (!researchOk) {
    await onProgress(`❌ Research failed: ${loadContentTask(task.id)?.error || "Unknown error"}`);
    return loadContentTask(task.id) || task;
  }

  // 3. Influencer phase
  await onProgress(`✍️ Drafting post...`);
  const draftOk = await runInfluencerPhase(task.id);
  if (!draftOk) {
    await onProgress(`❌ Draft failed: ${loadContentTask(task.id)?.error}`);
    return loadContentTask(task.id) || task;
  }

  // 4. Verification phase
  await onProgress(`🔍 Verifying claims...`);
  const verifyResult = await runVerificationPhase(task.id);

  // 5. Handle result (may loop)
  await handleVerificationResult(task.id, verifyResult);

  const finalTask = loadContentTask(task.id) || task;

  if (finalTask.status === "review") {
    await onProgress(`✅ Ready for review! Confidence: ${finalTask.lastVerification?.confidence || 0}%`);
  } else if (finalTask.status === "failed") {
    await onProgress(`❌ Pipeline failed: ${finalTask.error}`);
  }

  return finalTask;
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
      nightShiftPRs: [],
      lastNightShift: null,
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
  const now = new Date();
  const timeStr = now.toLocaleString("en-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("en-IL", { timeZone: "Asia/Jerusalem", weekday: "short", month: "short", day: "numeric" });
  const prompt = `Be brief (under 500 chars). You are ClaudeGolem.\n\n[${dateStr} ${timeStr} IL] ${message}`;

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

// Setup command - configure group topics
bot.command("setup", async (ctx) => {
  const chatId = ctx.chat.id;
  const threadId = ctx.message?.message_thread_id;
  const chatType = ctx.chat.type;

  // Must be run in a group
  if (chatType !== "group" && chatType !== "supergroup") {
    await ctx.reply("⚠️ Run /setup in a group with Topics enabled, not in DM.");
    return;
  }

  const state = loadState();
  state.groupChatId = chatId;

  // Initialize topics if not exists
  if (!state.topics) {
    state.topics = {};
  }

  // Detect which topic this message was sent from
  const topicArg = ctx.message?.text?.split(" ")[1]?.toLowerCase();

  if (!topicArg) {
    await ctx.reply(`🔧 *Group Setup*

Run this command in each topic to register it:

\`/setup alerts\` - in 🔔 Alerts topic
\`/setup nightshift\` - in 🌙 Night Shift topic
\`/setup email\` - in 📧 Email topic
\`/setup jobs\` - in 🎯 Jobs topic
\`/setup recruiter\` - in 👔 Recruiter topic

_Note: ClaudeGolem chat goes to General (no setup needed)_

Current config:
• Group: ${state.groupChatId || "not set"}
• General: ClaudeGolem chat (no thread ID needed)
• Alerts: ${state.topics?.alerts || "not set"}
• Night Shift: ${state.topics?.nightshift || "not set"}
• Email: ${state.topics?.email || "not set"}
• Jobs: ${state.topics?.jobs || "not set"}
• Recruiter: ${state.topics?.recruiter || "not set"}`, { parse_mode: "Markdown" });
    return;
  }

  // Save the topic thread ID
  // Note: "chat" removed - ClaudeGolem goes to General (no thread ID)
  const validTopics = ["alerts", "nightshift", "email", "jobs", "recruiter"];
  if (!validTopics.includes(topicArg)) {
    await ctx.reply(`❌ Unknown topic: ${topicArg}\nValid: ${validTopics.join(", ")}\n\n_ClaudeGolem chat goes to General automatically_`, { parse_mode: "Markdown" });
    return;
  }

  if (!threadId) {
    await ctx.reply(`⚠️ No thread ID detected. Make sure Topics are enabled in this group and you're in a topic (not General).`);
    return;
  }

  (state.topics as any)[topicArg] = threadId;
  saveState(state);

  await ctx.reply(`✅ Registered **${topicArg}** topic (thread ${threadId})`, { parse_mode: "Markdown" });
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

// ═══════════════════════════════════════════════════════
// Interview Practice Commands (RecruiterGolem E4)
// ═══════════════════════════════════════════════════════

// Interview modes imported from elo.ts (ALL_MODES) to keep single source of truth

// Track pending practice sessions for pass/fail input
const pendingPracticeSessions = new Map<number, { sessionId: string; mode: InterviewMode }>();

// Initialize practice database (sync init is acceptable at bot startup)
initPracticeDb();

// /practice command - start interview practice
bot.command("practice", async (ctx) => {
  const args = ctx.message?.text?.replace("/practice", "").trim().split(/\s+/) || [];
  const modeArg = args[0]?.toLowerCase() as InterviewMode;

  // If no mode provided, show mode selection
  if (!modeArg) {
    const keyboard = new InlineKeyboard();
    keyboard.text("💻 Leetcode", "practice:leetcode").text("🏗️ System Design", "practice:system-design").row();
    keyboard.text("🐛 Debugging", "practice:debugging").text("📝 Code Review", "practice:code-review").row();
    keyboard.text("🗣️ Behavioral", "practice:behavioral").text("⚡ Optimization", "practice:optimization").row();
    keyboard.text("📊 Complexity", "practice:complexity");

    await ctx.reply(`🎯 *Interview Practice*

Choose a mode to practice:

• *Leetcode* - Algorithms & data structures
• *System Design* - Architecture & scale
• *Debugging* - Bug finding
• *Code Review* - Quality & security
• *Behavioral* - Soft skills + technical depth
• *Optimization* - Performance improvement
• *Complexity* - Big O analysis

Your Elo ratings:
${getStatsSummary()}`, { parse_mode: "Markdown", reply_markup: keyboard });
    return;
  }

  // Validate mode
  if (!ALL_MODES.includes(modeArg)) {
    await ctx.reply(`❌ Unknown mode: ${modeArg}

Valid modes: ${ALL_MODES.join(", ")}`, { parse_mode: "Markdown" });
    return;
  }

  // Check for existing active session
  const existing = getActiveSession(modeArg);
  if (existing) {
    const keyboard = new InlineKeyboard()
      .text("✅ I Passed", `practice-result:${existing.id}:pass`)
      .text("❌ I Failed", `practice-result:${existing.id}:fail`);

    await ctx.reply(`⚠️ You have an active ${modeArg} session!

When you're done, mark your result:`, { parse_mode: "Markdown", reply_markup: keyboard });
    return;
  }

  // Get recommended difficulty and create session
  const difficulty = getRecommendedDifficulty(modeArg);
  const rating = getCandidateRating(modeArg);
  const session = createSession(modeArg, difficulty);

  // Track this session for result input
  pendingPracticeSessions.set(ctx.chat.id, { sessionId: session.id, mode: modeArg });

  // Build the practice prompt
  const company = args[1] || "a top tech company";
  const level = args[2] || "senior engineer";

  const practicePrompt = `Start a ${modeArg} interview practice session.

Company: ${company}
Level: ${level}
Difficulty: ${difficulty}
Current rating: ${rating}

Use the /interview-practice skill prompt for ${modeArg} mode.
Stay in character as the interviewer. One question at a time.`;

  await ctx.reply(`🎯 *Starting ${modeArg} Practice*

📊 Your rating: ${rating}
📈 Difficulty: ${difficulty}
🏢 Company: ${company}
💼 Level: ${level}

_Claude will now act as your interviewer..._

When you're done, use the buttons to record your result.`, { parse_mode: "Markdown" });

  // Queue for Claude - the actual interview
  queue.push({ ctx, text: practicePrompt });
  processQueue();
});

// /stats command - show practice statistics
bot.command("stats", async (ctx) => {
  const args = ctx.message?.text?.replace("/stats", "").trim().split(/\s+/) || [];
  const modeArg = args[0]?.toLowerCase() as InterviewMode | undefined;

  // Validate mode if provided
  if (modeArg && !ALL_MODES.includes(modeArg)) {
    await ctx.reply(`❌ Unknown mode: ${modeArg}

Valid modes: ${ALL_MODES.join(", ")}

Or use \`/stats\` for overall stats.`, { parse_mode: "Markdown" });
    return;
  }

  // Get stats
  const stats = getStats(modeArg);
  const eloSummary = getStatsSummary();

  let response = formatStats(stats, modeArg);
  response += "\n\n" + eloSummary;

  await ctx.reply(response, { parse_mode: "Markdown" });
});

// /outreach command - show outreach statistics and pending drafts
bot.command("outreach", async (ctx) => {
  try {
    initOutreachDb();
    const stats = getOutreachStats();
    const followups = getPendingFollowups(5);

    let msg = formatOutreachStats(stats);

    if (followups.length > 0) {
      msg += `\n\n⏰ *Pending Follow-ups (${followups.length})*\n`;
      for (const f of followups.slice(0, 5)) {
        const daysSince = Math.floor((Date.now() - new Date(f.sentAt!).getTime()) / (1000 * 60 * 60 * 24));
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
bot.command("followup", async (ctx) => {
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
      const daysSince = Math.floor((Date.now() - new Date(f.sentAt!).getTime()) / (1000 * 60 * 60 * 24));
      const typeEmoji = f.messageType === "email" ? "📧" : f.messageType === "linkedin_connect" ? "🔗" : "💬";

      msg += `${typeEmoji} *Job:* ${f.jobId}\n`;
      msg += `📅 Sent ${daysSince} days ago\n`;
      msg += `_${f.messageText.slice(0, 50)}..._\n\n`;
    }

    if (followups.length > 10) {
      msg += `+${followups.length - 10} more pending.`;
    }

    // Add action buttons
    const keyboard = new InlineKeyboard();
    if (followups.length > 0) {
      keyboard.text("✅ Mark Responded", `followup:responded:${followups[0].id}`);
      keyboard.text("❌ No Response", `followup:no_response:${followups[0].id}`);
    }

    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: keyboard });
  } catch (err) {
    await ctx.reply(`❌ Error loading follow-ups: ${err}`);
  }
});

// Follow-up action callback
bot.callbackQuery(/^followup:/, async (ctx) => {
  try {
    const parts = ctx.callbackQuery.data?.split(":") || [];
    const action = parts[1]; // "responded" or "no_response"
    const outreachId = parts[2];

    if (!outreachId || !["responded", "no_response"].includes(action)) {
      await ctx.answerCallbackQuery({ text: "Invalid action" });
      return;
    }

    initOutreachDb();
    updateOutreachStatus(outreachId, action as "responded" | "no_response");

    const emoji = action === "responded" ? "✅" : "❌";
    await ctx.answerCallbackQuery({ text: `${emoji} Status updated!` });
    await ctx.editMessageText(`${emoji} Outreach marked as: ${action.replace("_", " ")}`);
  } catch (err) {
    await ctx.answerCallbackQuery({ text: "Error updating status" });
  }
});

// Practice mode selection callback
bot.callbackQuery(/^practice:/, async (ctx) => {
  const mode = ctx.callbackQuery.data?.replace("practice:", "") as InterviewMode;

  if (!ALL_MODES.includes(mode)) {
    await ctx.answerCallbackQuery({ text: "Unknown mode" });
    return;
  }

  // Check for existing active session
  const existing = getActiveSession(mode);
  if (existing) {
    const keyboard = new InlineKeyboard()
      .text("✅ I Passed", `practice-result:${existing.id}:pass`)
      .text("❌ I Failed", `practice-result:${existing.id}:fail`);

    await ctx.editMessageText(`⚠️ You have an active ${mode} session!

When you're done, mark your result:`, { parse_mode: "Markdown", reply_markup: keyboard });
    await ctx.answerCallbackQuery();
    return;
  }

  // Get recommended difficulty and create session
  const difficulty = getRecommendedDifficulty(mode);
  const rating = getCandidateRating(mode);
  const session = createSession(mode, difficulty);

  // Track this session for result input
  const chatId = ctx.chat?.id;
  if (chatId) {
    pendingPracticeSessions.set(chatId, { sessionId: session.id, mode });
  }

  const practicePrompt = `Start a ${mode} interview practice session.

Difficulty: ${difficulty}
Current rating: ${rating}

Use the /interview-practice skill prompt for ${mode} mode.
Stay in character as the interviewer. One question at a time.`;

  await ctx.editMessageText(`🎯 *Starting ${mode} Practice*

📊 Your rating: ${rating}
📈 Difficulty: ${difficulty}

_Claude will now act as your interviewer..._

When you're done, reply with "pass" or "fail" to record your result.`, { parse_mode: "Markdown" });
  await ctx.answerCallbackQuery({ text: `Starting ${mode} practice` });

  // Queue for Claude - the actual interview
  if (chatId) {
    queue.push({ ctx, text: practicePrompt });
    processQueue();
  }
});

// Practice result callback (pass/fail)
bot.callbackQuery(/^practice-result:/, async (ctx) => {
  const parts = ctx.callbackQuery.data?.split(":") || [];
  const sessionId = parts[1];
  const result = parts[2]; // "pass" or "fail"

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

  // Update Elo rating
  const questionRating = getQuestionRating(session.difficulty);
  const eloResult = updateAfterSession(session.mode, passed, questionRating);

  // Clear pending session
  const chatId = ctx.chat?.id;
  if (chatId) {
    pendingPracticeSessions.delete(chatId);
  }

  const emoji = passed ? "✅" : "❌";
  const changeEmoji = eloResult.change > 0 ? "📈" : "📉";

  await ctx.editMessageText(`${emoji} *Session Complete*

Mode: ${session.mode}
Difficulty: ${session.difficulty}
Result: ${passed ? "PASSED" : "FAILED"}

${changeEmoji} Rating: ${eloResult.oldRating} → ${eloResult.newRating} (${eloResult.change > 0 ? "+" : ""}${eloResult.change})

Use \`/stats ${session.mode}\` to see your progress.`, { parse_mode: "Markdown" });
  await ctx.answerCallbackQuery({ text: passed ? "Great job!" : "Keep practicing!" });
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

// ═══════════════════════════════════════════════════════
// Content Pipeline Callbacks (A2)
// ═══════════════════════════════════════════════════════

// Approve pipeline draft
bot.callbackQuery(/^pipeline-approve:/, async (ctx) => {
  const taskId = ctx.callbackQuery.data?.replace("pipeline-approve:", "") || "";
  const task = loadContentTask(taskId);

  if (!task || !task.draftPath) {
    await ctx.answerCallbackQuery({ text: "Task not found" });
    return;
  }

  try {
    const draftContent = JSON.parse(readFileSync(task.draftPath, "utf-8"));

    // Post to Soltome
    await ctx.editMessageText(`✅ Approved! Posting to Soltome...`);

    const result = await postToSoltome(draftContent.title, draftContent.content);

    if (result.success) {
      task.status = "posted";
      saveContentTask(task);

      await logEvent("soltome_post", {
        title: draftContent.title,
        postId: result.postId,
        taskId: task.id,
        creditsRemaining: result.newBalance,
      }, "claudegolem");

      await ctx.editMessageText(`🎉 Posted to Soltome!\n\n*${draftContent.title}*\n\n(${result.newBalance} credits left)`, { parse_mode: "Markdown" });
      await ctx.answerCallbackQuery({ text: "Posted!" });
    } else {
      await ctx.editMessageText(`⚠️ Failed to post: ${result.error}`);
      await ctx.answerCallbackQuery({ text: "Post failed" });
    }
  } catch (err) {
    await ctx.answerCallbackQuery({ text: `Error: ${err}` });
  }
});

// Reject pipeline draft
bot.callbackQuery(/^pipeline-reject:/, async (ctx) => {
  const taskId = ctx.callbackQuery.data?.replace("pipeline-reject:", "") || "";
  const task = loadContentTask(taskId);

  if (!task) {
    await ctx.answerCallbackQuery({ text: "Task not found" });
    return;
  }

  task.status = "failed";
  task.error = "Rejected by user";
  saveContentTask(task);

  await logEvent("pipeline_draft_rejected", {
    taskId: task.id,
    topic: task.topic,
  }, "claudegolem");

  await ctx.editMessageText("❌ Draft rejected.");
  await ctx.answerCallbackQuery({ text: "Rejected" });
});

// Edit pipeline draft - send to chat for editing
bot.callbackQuery(/^pipeline-edit:/, async (ctx) => {
  const taskId = ctx.callbackQuery.data?.replace("pipeline-edit:", "") || "";
  const task = loadContentTask(taskId);

  if (!task || !task.draftPath) {
    await ctx.answerCallbackQuery({ text: "Task not found" });
    return;
  }

  try {
    const draftContent = JSON.parse(readFileSync(task.draftPath, "utf-8"));

    // Queue for Claude to edit
    const editPrompt = `[CONTENT MODE: EDIT DRAFT]

I need to improve this draft before posting. The verification found these issues:
${task.lastVerification?.corrections.map(c => `- ${c}`).join("\n") || "No specific issues"}

Current draft:
Title: ${draftContent.title}

${draftContent.content}

---

Please suggest improvements or ask me what changes I want.`;

    queue.push({ ctx, text: editPrompt });
    processQueue();

    await ctx.editMessageText(`✏️ Editing draft... Reply with your changes.`);
    await ctx.answerCallbackQuery({ text: "Editing mode" });
  } catch (err) {
    await ctx.answerCallbackQuery({ text: `Error: ${err}` });
  }
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

🔬 Research → ✍️ Draft → 🔍 Verify → 📝 Review

_Running full content pipeline... This may take several minutes._`, { parse_mode: "Markdown" });
    await ctx.replyWithChatAction("typing");

    // Run the full content pipeline (A2)
    const progressHandler = async (status: string) => {
      await ctx.reply(status);
      await ctx.replyWithChatAction("typing");
    };

    try {
      const task = await runContentPipeline(topic, "golems/packages/autonomous", progressHandler);

      if (task.status === "review" && task.draftPath) {
        // Read the draft and show it for approval
        try {
          const draftContent = JSON.parse(readFileSync(task.draftPath, "utf-8"));
          const confidence = task.lastVerification?.confidence || 0;
          const corrections = task.lastVerification?.corrections || [];

          let msg = `📝 *Draft Ready for Review*

*Title:* ${draftContent.title}

*Confidence:* ${confidence}%
${corrections.length > 0 ? `*Corrections needed:*\n${corrections.map((c: string) => `• ${c}`).join("\n")}\n` : ""}
---

${draftContent.content.slice(0, 2000)}${draftContent.content.length > 2000 ? "..." : ""}`;

          const keyboard = new InlineKeyboard()
            .text("✅ Approve", `pipeline-approve:${task.id}`)
            .text("❌ Reject", `pipeline-reject:${task.id}`)
            .row()
            .text("✏️ Edit", `pipeline-edit:${task.id}`);

          await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: keyboard });

          // Log event
          await logEvent("pipeline_draft_ready", {
            taskId: task.id,
            topic: task.topic,
            confidence,
          }, "claudegolem");
        } catch (parseErr) {
          await ctx.reply(`⚠️ Draft created but couldn't parse: ${task.draftPath}`);
        }
      } else if (task.status === "failed") {
        await ctx.reply(`❌ Pipeline failed: ${task.error}`);
      }
    } catch (err) {
      console.error("[ContentPipeline] Error:", err);
      await ctx.reply(`❌ Pipeline error: ${err}`);
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

// Per-source notification styles and topic routing
// Note: "claude" goes to General (no thread ID), others go to specific topics
const SOURCE_CONFIG: Record<string, {
  icon: string;
  topic: keyof NonNullable<State["topics"]> | "general";  // "general" = no thread ID
  format: (t: string, b: string) => string;
}> = {
  claude: {
    icon: "🤖",
    topic: "general",  // Goes to General topic (no thread ID)
    format: (t, b) => `🤖 *${t}*\n${b}`,
  },
  ralph: {
    icon: "🔄",
    topic: "alerts",
    format: (t, b) => `🔄 *Ralph*: ${t}\n\n${b}`,
  },
  nightshift: {
    icon: "🌙",
    topic: "nightshift",
    format: (t, b) => `🌙 *Night Shift*\n${t}\n${b}`,
  },
  email: {
    icon: "📧",
    topic: "email",
    format: (t, b) => `📧 *${t}*\n\n${b}`,
  },
  jobs: {
    icon: "🎯",
    topic: "jobs",
    format: (t, b) => `🎯 *${t}*\n\n${b}`,
  },
  recruiter: {
    icon: "👔",
    topic: "recruiter",
    format: (t, b) => `👔 *${t}*\n\n${b}`,
  },
  healthcheck: {
    icon: "🏥",
    topic: "alerts",
    format: (t, b) => `🏥 *${t}*\n\n${b}`,
  },
  default: {
    icon: "📨",
    topic: "alerts",
    format: (t, b) => `📨 *${t}*\n\n${b}`,
  },
};

async function sendNotificationToTelegram(data: {
  title: string;
  body: string;
  priority?: string;
  source?: string;  // claude, ralph, nightshift, email, jobs, healthcheck
}) {
  const state = loadState();
  const config = SOURCE_CONFIG[data.source || "default"] || SOURCE_CONFIG.default;
  const priorityIcon = data.priority === "high" ? "🔔 " : "";
  const message = priorityIcon + config.format(data.title, data.body);

  // Determine where to send: group topic or DM fallback
  let chatId: number | null = null;
  let threadId: number | undefined = undefined;

  if (state.groupChatId && state.topics) {
    // Use group with topics
    chatId = state.groupChatId;
    // "general" means no thread ID (goes to General topic)
    threadId = config.topic === "general" ? undefined : state.topics[config.topic as keyof typeof state.topics];
    console.log(`[Notify] Routing to group ${chatId}, topic ${config.topic} (thread ${threadId ?? "General"})`);
  } else if (state.telegramChatId) {
    // Fallback to DM
    chatId = state.telegramChatId;
    console.log(`[Notify] Fallback to DM ${chatId}`);
  }

  if (!chatId) {
    console.log("[Notify] No chat ID saved, skipping");
    return;
  }

  try {
    // Try Markdown first, fall back to plain text if it fails
    const sendOptions: any = { parse_mode: "Markdown" };
    if (threadId) {
      sendOptions.message_thread_id = threadId;
    }

    try {
      await bot.api.sendMessage(chatId, message, sendOptions);
    } catch (mdErr) {
      // Markdown failed (likely special chars), send plain text
      console.warn("[Notify] Markdown failed, falling back to plain text:", (mdErr as Error).message);
      const plainMessage = message.replace(/[*_`\[\]]/g, "");
      const plainOptions: any = {};
      if (threadId) plainOptions.message_thread_id = threadId;
      await bot.api.sendMessage(chatId, plainMessage, plainOptions);
    }
    console.log(`[Notify] Sent: ${data.title} → ${config.topic}`);
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

    // Job scraping endpoint - trigger manually or via interval
    if (url.pathname === "/scrape-jobs") {
      console.log("[Job Golem] Manual scrape triggered via HTTP");
      // Run async, return immediately
      runJobSearch().then(result => {
        if (result) {
          console.log(`[Job Golem] Scrape complete: ${result.scraped} scraped, ${result.filtered} filtered, ${result.matched} matched`);
        }
      }).catch(err => {
        console.error("[Job Golem] Scrape failed:", err);
      });
      return new Response(JSON.stringify({ status: "started" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(`📡 Notification server on port ${NOTIFY_PORT}`);

// ═══════════════════════════════════════════════════════
// Job Golem Auto-Scrape (every 10 minutes)
// ═══════════════════════════════════════════════════════
const JOB_SCRAPE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Run initial scrape after 30 seconds (let bot fully start)
setTimeout(() => {
  console.log("[Job Golem] Running initial scrape...");
  runJobSearch().catch(err => console.error("[Job Golem] Initial scrape failed:", err));
}, 30 * 1000);

// Then every 10 minutes
setInterval(() => {
  const now = new Date().toTimeString().slice(0, 5);
  console.log(`[Job Golem] Auto-scrape triggered at ${now}`);
  runJobSearch().catch(err => console.error("[Job Golem] Auto-scrape failed:", err));
}, JOB_SCRAPE_INTERVAL_MS);

console.log(`⏰ Job Golem auto-scrape: every ${JOB_SCRAPE_INTERVAL_MS / 60000} minutes`);

// Start Telegram bot
console.log("🤖 ClaudeGolem v5 (gitsClaude + SOUL.md + Notifications)");
console.log("📍 Working dir:", GITS);

bot.start({
  onStart: (botInfo) => {
    console.log(`✅ @${botInfo.username} running`);
  },
});
