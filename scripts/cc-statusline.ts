#!/usr/bin/env bun
/**
 * Lightweight Claude Code status line — replaces ccstatusline (60K lines, 85% CPU)
 *
 * Reads JSON from stdin (piped by Claude Code), formats two status lines.
 * No React, no Ink, no deps. ~120 lines.
 *
 * Output (with ANSI colors):
 *   ⎇ master | (+1786,-179)
 *   🤖 Opus 4.6 | 💰 $3.49 | ⏱️  17m | 📦 4hr 3m | 🧠 64.8%
 *
 * Install: Update ~/.claude/settings.json statusLine.command
 */

// ANSI color codes
const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

// Read stdin (Claude Code pipes JSON)
const chunks: string[] = [];
for await (const chunk of Bun.stdin.stream()) {
  chunks.push(new TextDecoder().decode(chunk));
}
const raw = chunks.join("");

let status: any;
try {
  status = JSON.parse(raw);
} catch {
  process.stdout.write(`${c.dim}⎇ ? | no data${c.reset}\n`);
  process.exit(0);
}

// --- Extract fields from JSON ---

// Model
const model = typeof status.model === "object"
  ? (status.model.display_name || status.model.id || "?")
  : (status.model || "?");

// Cost
const cost = status.cost?.total_cost_usd ?? 0;
const costStr = cost < 0.01 ? "$0.00" : `$${cost.toFixed(2)}`;
const costColor = cost > 10 ? c.red : cost > 5 ? c.yellow : c.green;

// Session duration from total_duration_ms
const durationMs = status.cost?.total_duration_ms ?? 0;
const sessionStr = formatDuration(durationMs);

// Lines changed
const added = status.cost?.total_lines_added ?? 0;
const removed = status.cost?.total_lines_removed ?? 0;

// CWD for git
const cwd = status.cwd || status.workspace?.current_dir || process.cwd();

// --- Git info (fast, sync) ---
let gitBranch = "?";
try {
  gitBranch = Bun.spawnSync(["git", "branch", "--show-current"], { cwd }).stdout.toString().trim() || "detached";
} catch {}

// --- Context % from transcript ---
let contextPct = "";
let contextColor = c.green;
let blockStr = "";

if (status.transcript_path) {
  try {
    const transcriptStat = Bun.file(status.transcript_path);
    if (await transcriptStat.exists()) {
      const size = transcriptStat.size;
      const readFrom = Math.max(0, size - 50000);
      const tail = (await transcriptStat.slice(readFrom, size).text());

      const lines = tail.split("\n").filter(l => l.includes('"usage"'));
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        try {
          const entry = JSON.parse(lastLine);
          const usage = entry.usage || entry.message?.usage;
          if (usage) {
            const inputTokens = usage.input_tokens || 0;
            const cacheRead = usage.cache_read_input_tokens || 0;
            const cacheCreate = usage.cache_creation_input_tokens || 0;
            const contextTokens = inputTokens + cacheRead + cacheCreate;

            const modelId = typeof status.model === "object" ? status.model.id : status.model;
            const maxCtx = 200000; // all current Claude models

            const pct = (contextTokens / maxCtx) * 100;
            contextPct = `${pct.toFixed(1)}%`;
            contextColor = pct > 80 ? c.red : pct > 60 ? c.yellow : c.green;
          }
        } catch {}
      }

      // Block timer from first timestamp
      const firstLines = tail.substring(0, 5000);
      const tsMatch = firstLines.match(/"timestamp":\s*"([^"]+)"/);
      if (tsMatch) {
        const blockStart = new Date(tsMatch[1]).getTime();
        if (blockStart > 0) {
          const blockEnd = blockStart + 5 * 60 * 60 * 1000;
          const remaining = blockEnd - Date.now();
          blockStr = remaining > 0 ? formatDuration(remaining) : "expired";
        }
      }
    }
  } catch {}
}

// --- Format output ---
const linesStr = added || removed
  ? ` ${c.gray}|${c.reset} ${c.green}+${added}${c.reset}${c.gray},${c.reset}${c.red}-${removed}${c.reset}`
  : "";
const line1 = `${c.cyan}⎇${c.reset} ${c.bold}${gitBranch}${c.reset}${linesStr}`;

const sep = ` ${c.gray}|${c.reset} `;
const parts = [
  `${c.magenta}🤖 ${model}${c.reset}`,
  `${costColor}💰 ${costStr}${c.reset}`,
  `${c.blue}⏱️  ${sessionStr}${c.reset}`,
];
if (blockStr) parts.push(`${c.yellow}📦 ${blockStr}${c.reset}`);
if (contextPct) parts.push(`${contextColor}🧠 ${contextPct}${c.reset}`);
const line2 = parts.join(sep);

process.stdout.write(`${line1}\n${line2}\n`);

// --- Helpers ---
function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hrs}hr ${mins}m`;
}
