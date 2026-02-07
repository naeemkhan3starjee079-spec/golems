/**
 * External CLI helpers layer - unified interface for Gemini, Cursor, Codex, Kiro, Haiku
 * with rate limit tracking and automatic fallback.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

export type HelperBackend = "gemini" | "cursor" | "codex" | "kiro" | "haiku";

export interface HelperResult {
  output: string;
  backend: HelperBackend;
  durationMs: number;
}

export interface HelperOptions {
  backend?: HelperBackend;
  file?: string;
  timeout?: number;
}

interface RateLimitEntry {
  limited: boolean;
  limited_at: string | null;
  resets_at: string | null;
}

type RateLimitsFile = Record<HelperBackend, RateLimitEntry>;

const ALL_BACKENDS: HelperBackend[] = ["gemini", "kiro", "codex", "cursor", "haiku"];

const FALLBACK_CHAIN: HelperBackend[] = ["gemini", "kiro", "codex", "cursor", "haiku"];

const DEFAULT_TIMEZONE = "Asia/Jerusalem";

function getTimezone(): string {
  return process.env.TZ || DEFAULT_TIMEZONE;
}

function getStateDir(): string {
  return process.env.GOLEMS_STATE_DIR || join(process.env.HOME || "~", ".golems-zikaron");
}

function getRateLimitsPath(): string {
  return join(getStateDir(), "rate-limits.json");
}

function readRateLimits(): RateLimitsFile {
  const path = getRateLimitsPath();
  const defaults: RateLimitsFile = {
    gemini: { limited: false, limited_at: null, resets_at: null },
    kiro: { limited: false, limited_at: null, resets_at: null },
    codex: { limited: false, limited_at: null, resets_at: null },
    cursor: { limited: false, limited_at: null, resets_at: null },
    haiku: { limited: false, limited_at: null, resets_at: null },
  };
  try {
    const data = readFileSync(path, "utf-8");
    return { ...defaults, ...JSON.parse(data) };
  } catch {
    return defaults;
  }
}

function writeRateLimits(limits: RateLimitsFile): void {
  const dir = getStateDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getRateLimitsPath(), JSON.stringify(limits, null, 2));
}

/**
 * Compute resets_at timestamp for a given backend.
 */
function computeResetsAt(backend: HelperBackend, now: Date = new Date()): string {
  switch (backend) {
    case "gemini": {
      // Resets at midnight UTC
      const reset = new Date(now);
      reset.setUTCDate(reset.getUTCDate() + 1);
      reset.setUTCHours(0, 0, 0, 0);
      return reset.toISOString();
    }
    case "kiro": {
      // Resets at end of current month in user's timezone
      const tz = getTimezone();
      const localized = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      const year = localized.getFullYear();
      const month = localized.getMonth();
      // Last day of current month, 23:59:59
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      // Convert back: create a date in the target timezone
      const resetStr = endOfMonth.toLocaleString("en-US", { timeZone: tz });
      // Store as ISO by reconstructing
      const parts = new Date(resetStr);
      // Approximate: offset from UTC
      const offset = now.getTime() - new Date(now.toLocaleString("en-US", { timeZone: tz })).getTime();
      return new Date(endOfMonth.getTime() + offset).toISOString();
    }
    case "codex": {
      // 1 minute RPM
      return new Date(now.getTime() + 60_000).toISOString();
    }
    case "cursor": {
      // Monthly (30 days)
      return new Date(now.getTime() + 30 * 24 * 60 * 60_000).toISOString();
    }
    case "haiku": {
      // 1 minute RPM
      return new Date(now.getTime() + 60_000).toISOString();
    }
  }
}

/**
 * Mark a backend as rate-limited. Call when you get a 429.
 */
export function helperLimitReached(backend: HelperBackend, now: Date = new Date()): void {
  const limits = readRateLimits();
  limits[backend] = {
    limited: true,
    limited_at: now.toISOString(),
    resets_at: computeResetsAt(backend, now),
  };
  writeRateLimits(limits);
}

/**
 * Check if a backend is available (not rate-limited, or limit has expired).
 * Auto-clears expired limits.
 */
export function isHelperAvailable(backend: HelperBackend, now: Date = new Date()): boolean {
  const limits = readRateLimits();
  const entry = limits[backend];

  if (!entry.limited) return true;

  // Auto-clear if resets_at has passed
  if (entry.resets_at && new Date(entry.resets_at) <= now) {
    limits[backend] = { limited: false, limited_at: null, resets_at: null };
    writeRateLimits(limits);
    return true;
  }

  return false;
}

/**
 * Get status of all backends.
 */
export function getHelperStatus(now: Date = new Date()): Record<HelperBackend, { available: boolean; resets_at: string | null }> {
  const limits = readRateLimits();
  const result: Record<string, { available: boolean; resets_at: string | null }> = {};

  for (const backend of ALL_BACKENDS) {
    const entry = limits[backend];
    if (!entry.limited) {
      result[backend] = { available: true, resets_at: null };
    } else if (entry.resets_at && new Date(entry.resets_at) <= now) {
      // Auto-clear
      limits[backend] = { limited: false, limited_at: null, resets_at: null };
      result[backend] = { available: true, resets_at: null };
    } else {
      result[backend] = { available: false, resets_at: entry.resets_at };
    }
  }

  writeRateLimits(limits);
  return result as Record<HelperBackend, { available: boolean; resets_at: string | null }>;
}

/**
 * Build the CLI command for a given backend.
 */
function buildCommand(backend: HelperBackend, prompt: string, opts: HelperOptions): string[] {
  switch (backend) {
    case "gemini":
      // Pipe mode
      return ["bash", "-c", `echo ${JSON.stringify(prompt)} | gemini`];
    case "cursor":
      return ["cursor", "agent", prompt, "--model", "gpt-5.2-codex-high", "--output-format", "text"];
    case "codex":
      return ["codex", prompt];
    case "kiro":
      return ["kiro-cli", "chat", "--no-interactive", "-w", "never", prompt];
    case "haiku":
      // Handled separately via fetch
      return [];
  }
}

/**
 * Run haiku via Anthropic API.
 */
async function runHaiku(prompt: string, timeout: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (resp.status === 429) {
      throw new Error("RATE_LIMITED");
    }

    if (!resp.ok) {
      throw new Error(`Haiku API error: ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as { content: { type: string; text: string }[] };
    return data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run a CLI helper command via subprocess.
 */
async function runCliHelper(backend: HelperBackend, prompt: string, opts: HelperOptions): Promise<string> {
  const args = buildCommand(backend, prompt, opts);
  const timeout = opts.timeout || 120_000;

  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });

  const timer = setTimeout(() => proc.kill(), timeout);

  try {
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      if (stderr.includes("429") || stderr.includes("rate limit") || stderr.toLowerCase().includes("quota")) {
        throw new Error("RATE_LIMITED");
      }
      throw new Error(`${backend} failed (exit ${exitCode}): ${stderr.slice(0, 500)}`);
    }

    return stdout.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run a helper, with automatic fallback on rate limit.
 */
export async function runHelper(prompt: string, opts: HelperOptions = {}): Promise<HelperResult> {
  const timeout = opts.timeout || 120_000;
  const now = new Date();

  // If specific backend requested, try it first then fall back
  const chain = opts.backend
    ? [opts.backend, ...FALLBACK_CHAIN.filter((b) => b !== opts.backend)]
    : [...FALLBACK_CHAIN];

  for (const backend of chain) {
    if (!isHelperAvailable(backend, now)) continue;

    const start = Date.now();
    try {
      let output: string;
      if (backend === "haiku") {
        output = await runHaiku(prompt, timeout);
      } else {
        output = await runCliHelper(backend, prompt, opts);
      }

      return {
        output,
        backend,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        helperLimitReached(backend, new Date());
        continue;
      }
      // Non-rate-limit error, try next backend
      continue;
    }
  }

  throw new Error("All helper backends are rate-limited or unavailable");
}
