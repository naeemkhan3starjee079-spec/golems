/**
 * Agent Runner - Unified Multi-Model Agent Interface
 *
 * Provides a common interface for running AI agents across different backends:
 * - cursor: Cursor CLI (Gemini-powered codebase research & verification)
 * - ollama: Local Ollama (scoring, classification, JSON extraction)
 * - claude: Claude Code CLI (complex reasoning, code generation)
 *
 * Shared infrastructure: subprocess management, timeouts, notifications, file I/O.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export type AgentBackend = "cursor" | "ollama" | "claude";

export interface AgentRunResult {
  output: string;
  success: boolean;
  backend: AgentBackend;
  error?: string;
  outputPath?: string;
}

export interface AgentRunOptions {
  backend?: AgentBackend;
  timeoutMs?: number;
  model?: string;
  cwd?: string;
  verbose?: boolean;
  saveTo?: string; // Save output to this path
}

export interface VerificationResult {
  confidence: number;
  corrections: string[];
  success: boolean;
  backend: AgentBackend;
  error?: string;
}

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const HOME = process.env.HOME || homedir();
const GITS = join(HOME, "Gits");
const RESEARCH_BASE = join(HOME, ".golems-zikaron/research/gits");
const NOTIFY_URL = "http://localhost:3847/notify";
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ═══════════════════════════════════════════════════════
// SHARED UTILITIES
// ═══════════════════════════════════════════════════════

/**
 * Sanitize a topic/filename for filesystem use.
 */
export function sanitizeFilename(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  return sanitized || "unnamed";
}

/**
 * Ensure directory exists.
 */
function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Send notification via Telegram server.
 */
async function sendNotification(
  title: string,
  body: string,
  priority: "default" | "high" = "default"
): Promise<void> {
  try {
    await fetch(NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, source: "agent-runner", priority }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Notification is best-effort
  }
}

/**
 * Run a subprocess with timeout.
 */
export async function runWithTimeout(
  args: string[],
  cwd: string,
  timeoutMs: number,
  stdin?: string
): Promise<{ stdout: string; stderr: string; success: boolean; timedOut: boolean }> {
  const proc = Bun.spawn(args, {
    cwd,
    stdin: stdin ? new Response(stdin) : undefined,
    stdout: "pipe",
    stderr: "pipe",
  });

  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });

  const result = await Promise.race([proc.exited, timeoutPromise]);
  clearTimeout(timer!);

  if (result === "timeout") {
    proc.kill();
    // Drain pipes and await exit to prevent zombie processes
    await Promise.allSettled([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return {
      stdout: "",
      stderr: `Process timed out after ${timeoutMs / 1000}s`,
      success: false,
      timedOut: true,
    };
  }

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = result as number;

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    success: exitCode === 0,
    timedOut: false,
  };
}

// ═══════════════════════════════════════════════════════
// BACKEND: CURSOR
// ═══════════════════════════════════════════════════════

/**
 * Run Cursor CLI for codebase research.
 */
export async function runCursorResearch(
  repo: string,
  topic: string,
  prompt: string,
  options: AgentRunOptions = {}
): Promise<AgentRunResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, model = "gemini-3-flash", verbose = false } = options;

  const repoPath = join(GITS, repo);
  if (!repoPath.startsWith(GITS + "/")) {
    return { output: "", success: false, backend: "cursor", error: `Invalid repo path: ${repo}` };
  }
  if (!existsSync(repoPath)) {
    return { output: "", success: false, backend: "cursor", error: `Repository not found: ${repoPath}` };
  }

  const sanitizedTopic = sanitizeFilename(topic);
  const outputDir = join(RESEARCH_BASE, repo);
  const outputPath = join(outputDir, `${sanitizedTopic}.md`);
  ensureDir(outputDir);

  if (verbose) {
    console.log(`[AgentRunner/cursor] Research: ${repo} / ${topic}`);
  }

  const args = ["agent", "--output-format", "text", "--model", model, prompt];

  try {
    const result = await runWithTimeout(args, repoPath, timeoutMs);

    if (result.timedOut) {
      await sendNotification("Agent Timeout", `cursor/${repo}/${topic}`, "high");
      return { output: "", success: false, backend: "cursor", error: "Timed out" };
    }

    if (!result.success) {
      return { output: "", success: false, backend: "cursor", error: result.stderr };
    }

    writeFileSync(outputPath, result.stdout);
    return { output: result.stdout, success: true, backend: "cursor", outputPath };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { output: "", success: false, backend: "cursor", error };
  }
}

/**
 * Run Cursor CLI to verify a draft against research.
 */
export async function runCursorVerification(
  draftPath: string,
  researchPath: string,
  options: AgentRunOptions = {}
): Promise<VerificationResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, model = "gemini-3-flash", verbose = false } = options;

  const expandedDraft = draftPath.replace(/^~/, HOME);
  const expandedResearch = researchPath.replace(/^~/, HOME);

  if (!existsSync(expandedDraft)) {
    return { confidence: 0, corrections: [], success: false, backend: "cursor", error: `Draft not found: ${expandedDraft}` };
  }
  if (!existsSync(expandedResearch)) {
    return { confidence: 0, corrections: [], success: false, backend: "cursor", error: `Research not found: ${expandedResearch}` };
  }

  let draftContent: string;
  let researchContent: string;
  try {
    draftContent = readFileSync(expandedDraft, "utf-8");
    researchContent = readFileSync(expandedResearch, "utf-8");
  } catch (err) {
    return { confidence: 0, corrections: [], success: false, backend: "cursor", error: `Read failed: ${err}` };
  }

  const repoMatch = expandedResearch.match(/research\/gits\/(.+?)\/[^/]+\.md$/);
  const repo = repoMatch ? repoMatch[1] : "";
  const repoPath = repo ? join(GITS, repo) : GITS;
  if (repo && !repoPath.startsWith(GITS + "/")) {
    return { confidence: 0, corrections: [], success: false, backend: "cursor", error: `Invalid repo path: ${repo}` };
  }

  const verificationPrompt = `You are verifying a content draft against research and the actual codebase.

## Research:
${researchContent.slice(0, 5000)}

## Draft:
${draftContent.slice(0, 5000)}

## Task:
1. Use @codebase to verify each technical claim
2. Check file paths, function names, code behavior
3. Return JSON: {"confidence": 0-100, "corrections": ["issue1", "issue2"]}

Only output JSON.`;

  const args = ["agent", "--output-format", "text", "--model", model, verificationPrompt];

  try {
    const result = await runWithTimeout(args, repoPath, timeoutMs);

    if (result.timedOut || !result.success) {
      return { confidence: 0, corrections: [], success: false, backend: "cursor", error: result.stderr || "Failed" };
    }

    const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { confidence: 0, corrections: [], success: false, backend: "cursor", error: "No JSON in output" };
    }

    const parsed = JSON.parse(jsonMatch[0]) as { confidence: number; corrections: string[] };
    return {
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
      success: true,
      backend: "cursor",
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { confidence: 0, corrections: [], success: false, backend: "cursor", error };
  }
}

// ═══════════════════════════════════════════════════════
// RESEARCH UTILITIES
// ═══════════════════════════════════════════════════════

export function getResearchPath(repo: string, topic: string): string {
  const fullPath = join(RESEARCH_BASE, repo, `${sanitizeFilename(topic)}.md`);
  if (!fullPath.startsWith(RESEARCH_BASE + "/")) {
    throw new Error(`Invalid repo path: ${repo}`);
  }
  return fullPath;
}

export function hasResearch(repo: string, topic: string): boolean {
  try {
    return existsSync(getResearchPath(repo, topic));
  } catch {
    return false;
  }
}

export function readResearch(repo: string, topic: string): string | null {
  let path: string;
  try {
    path = getResearchPath(repo, topic);
  } catch {
    return null;
  }
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// BACKEND DISCOVERY
// ═══════════════════════════════════════════════════════

/**
 * Get list of available agent backends on this system.
 */
export function getAvailableBackends(): AgentBackend[] {
  const backends: AgentBackend[] = [];

  // Ollama is always available (local)
  backends.push("ollama");

  // Claude is always available (we're running in it)
  backends.push("claude");

  // Cursor - check if agent command exists
  try {
    const proc = Bun.spawnSync(["which", "cursor"], { stdout: "pipe", stderr: "pipe" });
    if (proc.exitCode === 0) backends.push("cursor");
  } catch {
    // Not available
  }

  return backends;
}
