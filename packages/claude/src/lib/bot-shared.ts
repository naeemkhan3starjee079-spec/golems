/**
 * Bot Shared Module
 *
 * Shared state and functions used by telegram-bot.ts and all Composer modules.
 * Extracted to avoid circular dependencies between bot and composers.
 */

import { Keyboard } from "grammy";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { $ } from "bun";
import { logEvent, getRecentEvents, formatEventsForClaude } from "@golems/shared/lib/event-log";
import { getSupabase } from "@golems/shared/lib/supabase-factory";
import {
  shouldSuggestForking,
  extractTaskName,
  createForkSession,
  type ForkSessionMetadata,
} from "./session-fork";

// ═══════════════════════════════════════════════════════
// Constants & Paths
// ═══════════════════════════════════════════════════════

export const HOME = process.env.HOME || homedir();
export const GITS = join(HOME, "Gits");
export const STATE_FILE = join(HOME, ".golems-zikaron/state.json");
export const SOUL_FILE = join(GITS, "golems/packages/claude/SOUL.md");
export const RAILWAY_HEALTH_URL = process.env.RAILWAY_HEALTH_URL || "https://golems-production.up.railway.app/health";

// Re-export for composers that need forking
export { shouldSuggestForking, extractTaskName, createForkSession };
export type { ForkSessionMetadata };

// ═══════════════════════════════════════════════════════
// State Management
// ═══════════════════════════════════════════════════════

export interface State {
  nightShiftTarget: string;
  rotation: string[];
  telegramChatId: number | null;
  nightShiftPRs: Array<{ url: string; repo: string; createdAt: string }>;
  lastNightShift: string | null;
  groupChatId?: number;
  topics?: {
    alerts?: number;
  };
  golemSessions?: Record<string, string>;
}

export function loadState(): State {
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

export function saveState(state: State) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════════════════
// Per-Golem Telegram Routing
// ═══════════════════════════════════════════════════════

export interface GolemConfig {
  cwd: string;
  name: string;
  icon: string;
}

export const GOLEM_REGISTRY: Record<string, GolemConfig> = {
  recruitergolem: {
    cwd: join(HOME, "Gits", "golems", "packages", "recruiter"),
    name: "RecruiterGolem",
    icon: "👔",
  },
  tellergolem: {
    cwd: join(HOME, "Gits", "golems", "packages", "teller"),
    name: "TellerGolem",
    icon: "💰",
  },
};

// Per-golem topic routing is disabled (only General + Alerts topics exist).
// All chat goes to ClaudeGolem in General. Kept for future per-golem topics.
export function getGolemFromThreadId(_threadId: number | undefined, _state: State): GolemConfig | null {
  return null;
}

// ═══════════════════════════════════════════════════════
// Personas
// ═══════════════════════════════════════════════════════

export const PERSONAS: Record<string, { name: string; emoji: string; prompt: string }> = {
  default: {
    name: "ClaudeGolem",
    emoji: "🤖",
    prompt: "",
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

export let activePersona = "default";
export function setActivePersona(persona: string) {
  activePersona = persona;
}

// ═══════════════════════════════════════════════════════
// Shared UI
// ═══════════════════════════════════════════════════════

export const menuKeyboard = new Keyboard()
  .text("📊 Status").text("🌙 Tonight")
  .resized()
  .persistent();

// ═══════════════════════════════════════════════════════
// Shared State Maps
// ═══════════════════════════════════════════════════════

export const pendingContentTopics = new Map<number, { type: string }>();
export const activeForkSessions = new Map<number, ForkSessionMetadata>();

// ═══════════════════════════════════════════════════════
// Message Queue
// ═══════════════════════════════════════════════════════

export let isProcessing = false;
export const queue: Array<{ ctx: any; text: string }> = [];

export function setIsProcessing(value: boolean) {
  isProcessing = value;
}

// ═══════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════

export async function notify(title: string, message: string) {
  try {
    const escaped = message.replace(/["'\\]/g, " ").slice(0, 100);
    await $`osascript -e ${"display notification \"" + escaped + "\" with title \"" + title + "\""}`.quiet();
  } catch (e) {
    console.error("Notify error:", e);
  }
}

export function findLatestSessionId(cwd: string): string | null {
  const projectDir = cwd.replace(/\//g, "-");
  const projectPath = join(HOME, ".claude", "projects", projectDir);
  try {
    if (!existsSync(projectPath)) return null;
    const files = readdirSync(projectPath)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => ({
        name: f.replace(".jsonl", ""),
        mtime: statSync(join(projectPath, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
    return files.length > 0 ? files[0].name : null;
  } catch {
    return null;
  }
}

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

export async function checkRailwayHealth(): Promise<string> {
  try {
    const res = await fetch(RAILWAY_HEALTH_URL, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json() as { golemStatus?: string; isWorkHours?: boolean; uptime?: number; israelTime?: string };
      return `${data.golemStatus || "ok"} (up ${Math.round((data.uptime || 0) / 60)}min)`;
    }
    return "down";
  } catch {
    return "unreachable";
  }
}

export async function getDailyStats(): Promise<{ emailStats: string; jobStats: string }> {
  try {
    const supabase = getSupabase();
    if (!supabase) return { emailStats: "", jobStats: "" };
    const today = new Date().toISOString().slice(0, 10);
    const [emailsToday, urgentEmails, jobsToday] = await Promise.all([
      supabase.from("emails").select("id", { count: "exact", head: true }).gte("received_at", today),
      supabase.from("emails").select("id", { count: "exact", head: true }).gte("score", 8).eq("notified", false),
      supabase.from("golem_jobs").select("id", { count: "exact", head: true }).gte("created_at", today),
    ]);
    return {
      emailStats: `\n📧 Emails today: ${emailsToday.count || 0}${(urgentEmails.count || 0) > 0 ? ` (${urgentEmails.count} urgent!)` : ""}`,
      jobStats: `\n💼 Jobs today: ${jobsToday.count || 0}`,
    };
  } catch {
    return { emailStats: "", jobStats: "" };
  }
}

// ═══════════════════════════════════════════════════════
// Claude CLI Spawning
// ═══════════════════════════════════════════════════════

export async function askGolem(
  config: GolemConfig,
  message: string,
  onHeartbeat?: () => void
): Promise<string> {
  const now = new Date();
  const timeStr = now.toLocaleString("en-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("en-IL", { timeZone: "Asia/Jerusalem", weekday: "short", month: "short", day: "numeric" });
  const prompt = `[${dateStr} ${timeStr} IL] ${message}`;

  const telegramPrompt = `You are chatting on Telegram. Keep responses SHORT (mobile). Always reply in your topic thread only. Casual tone. Hebrew/English ok.`;

  try {
    if (!existsSync(config.cwd)) {
      mkdirSync(config.cwd, { recursive: true });
    }

    const currentState = loadState();
    const sessionId = currentState.golemSessions?.[config.name];

    const args = [
      "/Users/etanheyman/.local/bin/claude",
      "--dangerously-skip-permissions",
      "--print",
      ...(sessionId ? ["--resume", sessionId] : []),
      "--append-system-prompt", telegramPrompt,
      prompt,
    ];

    console.log(`[${config.name}] Spawning claude ${sessionId ? `--resume ${sessionId.slice(0, 8)}...` : "(new session)"}`);

    const { ANTHROPIC_API_KEY: _, ...cleanEnv } = process.env;
    const proc = Bun.spawn(args, {
      cwd: config.cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...cleanEnv, HOME },
    });

    const timeout = setTimeout(() => {
      proc.kill();
      console.error(`[${config.name}] Timeout (5 min)`);
    }, 300000);

    const heartbeat = onHeartbeat ? setInterval(() => {
      console.log(`[${config.name}] Still working...`);
      onHeartbeat();
    }, 60000) : null;

    const [, output, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    clearTimeout(timeout);
    if (heartbeat) clearInterval(heartbeat);

    if (stderr) {
      console.error(`[${config.name}] stderr:`, stderr.slice(0, 200));
    }
    if (!output.trim()) {
      console.warn(`[${config.name}] Empty stdout, exit code:`, proc.exitCode);
    }

    if (!sessionId) {
      const newSessionId = findLatestSessionId(config.cwd);
      if (newSessionId) {
        const freshState = loadState();
        if (!freshState.golemSessions) freshState.golemSessions = {};
        freshState.golemSessions[config.name] = newSessionId;
        saveState(freshState);
        console.log(`[${config.name}] Stored session UUID: ${newSessionId.slice(0, 8)}...`);
      }
    }

    return output.trim() || "No response.";
  } catch (error) {
    console.error(`[${config.name}] Error:`, error);
    return "⚠️ Error.";
  }
}

export async function askClaude(
  message: string,
  onHeartbeat?: () => void
): Promise<string> {
  const now = new Date();
  const timeStr = now.toLocaleString("en-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("en-IL", { timeZone: "Asia/Jerusalem", weekday: "short", month: "short", day: "numeric" });
  const prompt = `Be brief (under 500 chars). You are ClaudeGolem.\n\n[${dateStr} ${timeStr} IL] ${message}`;

  const BOT_WORKING_DIR = join(HOME, "Gits");

  try {
    if (!existsSync(BOT_WORKING_DIR)) {
      mkdirSync(BOT_WORKING_DIR, { recursive: true });
    }

    const recentEvents = await getRecentEvents(24);
    const eventSummary = formatEventsForClaude(recentEvents);
    const soulContent = getSystemPromptContent();
    const personaPrompt = PERSONAS[activePersona]?.prompt || "";
    const systemPrompt = `${soulContent}${personaPrompt}

## While You Were Down
${eventSummary}`;

    const args = [
      "/Users/etanheyman/.local/bin/claude",
      "--dangerously-skip-permissions",
      "--print",
      "--continue",
      "--system-prompt", systemPrompt,
      prompt,
    ];

    const { ANTHROPIC_API_KEY: _, ...cleanEnv } = process.env;
    const proc = Bun.spawn(args, {
      cwd: BOT_WORKING_DIR,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...cleanEnv, HOME },
    });

    const timeout = setTimeout(() => {
      proc.kill();
      console.error("Claude timeout (5 min)");
    }, 300000);

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

export async function askClaudeForked(
  sessionId: string,
  message: string,
  onHeartbeat?: () => void
): Promise<string> {
  const now = new Date();
  const timeStr = now.toLocaleString("en-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("en-IL", { timeZone: "Asia/Jerusalem", weekday: "short", month: "short", day: "numeric" });
  const prompt = `[${dateStr} ${timeStr} IL] ${message}`;

  const BOT_WORKING_DIR = join(HOME, "Gits");

  try {
    if (!existsSync(BOT_WORKING_DIR)) {
      mkdirSync(BOT_WORKING_DIR, { recursive: true });
    }

    const recentEvents = await getRecentEvents(24);
    const eventSummary = formatEventsForClaude(recentEvents);
    const soulContent = getSystemPromptContent();
    const personaPrompt = PERSONAS[activePersona]?.prompt || "";
    const systemPrompt = `${soulContent}${personaPrompt}

## While You Were Down
${eventSummary}

## Session Context
This is a forked session for a specific task. Work on this task independently, then summarize your results.`;

    const args = [
      "/Users/etanheyman/.local/bin/claude",
      "--dangerously-skip-permissions",
      "--print",
      "--resume", sessionId,
      "--system-prompt", systemPrompt,
      prompt,
    ];

    const proc = Bun.spawn(args, {
      cwd: BOT_WORKING_DIR,
      stdout: "pipe",
      stderr: "pipe",
    });

    const timeout = setTimeout(() => {
      proc.kill();
      console.error("Claude forked session timeout (10 min)");
    }, 600000);

    const heartbeat = onHeartbeat ? setInterval(() => {
      console.log(`[Claude Fork ${sessionId}] Still working...`);
      onHeartbeat();
    }, 60000) : null;

    await proc.exited;
    clearTimeout(timeout);
    if (heartbeat) clearInterval(heartbeat);

    const output = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    if (stderr) {
      console.error(`[Claude Fork ${sessionId}] stderr:`, stderr.slice(0, 200));
    }
    if (!output.trim()) {
      console.warn(`[Claude Fork ${sessionId}] Empty stdout, exit code:`, proc.exitCode);
    }
    return output.trim() || "No response.";
  } catch (error) {
    console.error(`Claude forked session error (${sessionId}):`, error);
    return "⚠️ Error.";
  }
}

// ═══════════════════════════════════════════════════════
// Queue Processing
// ═══════════════════════════════════════════════════════

export async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  setIsProcessing(true);
  const { ctx, text } = queue.shift()!;

  try {
    await ctx.replyWithChatAction("typing");

    console.log(`🤖 Spawning Claude for: "${text.slice(0, 50)}..."`);
    await notify("🤖 ClaudeGolem", `Processing: ${text.slice(0, 50)}...`);

    const response = await askClaude(text, async () => {
      await ctx.replyWithChatAction("typing");
    });

    console.log(`✅ Claude responded (${response.length} chars)`);
    await notify("✅ Claude Done", response.slice(0, 80));

    logEvent("telegram_message_out", {
      preview: response.slice(0, 120),
      length: response.length,
      prompt: text.slice(0, 80),
    }, "claudegolem").catch(() => {});

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

  setIsProcessing(false);
  processQueue();
}
