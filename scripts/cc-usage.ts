#!/usr/bin/env bun
/**
 * Claude Code Usage Tracker — ccusage alternative + CLI agents
 *
 * Scans CC session transcripts for token usage, reads Supabase for API costs,
 * and outputs daily/monthly tables like ccusage.
 *
 * Data sources:
 * 1. CC transcripts (~/.claude/projects/\*\/\*.jsonl) — subscription usage
 * 2. Supabase llm_usage table — Haiku API + CLI helper calls
 * 3. (Future) CLI agent log files
 *
 * Usage:
 *   bun scripts/cc-usage.ts                    # This month summary
 *   bun scripts/cc-usage.ts --period=today     # Today only
 *   bun scripts/cc-usage.ts --period=week      # This week
 *   bun scripts/cc-usage.ts --period=month     # This month (default)
 *   bun scripts/cc-usage.ts --period=all       # All time
 *   bun scripts/cc-usage.ts --daily            # Daily breakdown
 *   bun scripts/cc-usage.ts --by-project       # By project
 *   bun scripts/cc-usage.ts --by-model         # By model
 *   bun scripts/cc-usage.ts --json             # JSON output (for statusline)
 *   bun scripts/cc-usage.ts --send-axiom       # Send CC sessions to Axiom
 */

import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join } from "path";

// ─── Types ─────────────────────────────────────────────────────────

interface SessionUsage {
  sessionId: string;
  project: string;
  model: string;
  timestamp: string; // ISO date of first message
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  apiCalls: number;
  costUsd: number; // calculated from model pricing
}

interface DayUsage {
  date: string;
  ccCost: number;
  ccCalls: number;
  ccInputTokens: number;
  ccOutputTokens: number;
  apiCost: number;
  apiCalls: number;
  totalCost: number;
}

// ─── Model Pricing (per MTok, as of Feb 2026) ─────────────────────

const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheCreate: number }> = {
  "claude-opus-4-6":              { input: 15.0,  output: 75.0,  cacheRead: 1.5,   cacheCreate: 18.75  },
  "claude-opus-4-5-20250620":     { input: 15.0,  output: 75.0,  cacheRead: 1.5,   cacheCreate: 18.75  },
  "claude-sonnet-4-5-20250929":   { input: 3.0,   output: 15.0,  cacheRead: 0.30,  cacheCreate: 3.75   },
  "claude-sonnet-4-5-20250514":   { input: 3.0,   output: 15.0,  cacheRead: 0.30,  cacheCreate: 3.75   },
  "claude-haiku-4-5-20251001":    { input: 0.80,  output: 4.0,   cacheRead: 0.08,  cacheCreate: 1.0    },
};

function getModelPricing(model: string) {
  if (PRICING[model]) return PRICING[model];
  if (model.includes("opus"))   return PRICING["claude-opus-4-6"];
  if (model.includes("sonnet")) return PRICING["claude-sonnet-4-5-20250929"];
  if (model.includes("haiku"))  return PRICING["claude-haiku-4-5-20251001"];
  return PRICING["claude-sonnet-4-5-20250929"]; // default
}

function calculateCost(model: string, input: number, output: number, cacheRead: number, cacheCreate: number): number {
  const p = getModelPricing(model);
  return (input / 1_000_000 * p.input)
       + (output / 1_000_000 * p.output)
       + (cacheRead / 1_000_000 * p.cacheRead)
       + (cacheCreate / 1_000_000 * p.cacheCreate);
}

// ─── ANSI Colors ──────────────────────────────────────────────────

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

// ─── Parse CC Transcripts ─────────────────────────────────────────

function scanCCTranscripts(cutoffDate?: Date): SessionUsage[] {
  const home = process.env.HOME;
  if (!home) return [];
  const projectsDir = join(home, ".claude", "projects");
  if (!existsSync(projectsDir)) return [];

  const sessions: SessionUsage[] = [];
  const projectDirs = readdirSync(projectsDir);

  for (const proj of projectDirs) {
    const projPath = join(projectsDir, proj);
    try {
      if (!statSync(projPath).isDirectory()) continue;
    } catch { continue; }

    const files = readdirSync(projPath).filter(f => f.endsWith(".jsonl"));

    for (const file of files) {
      const filePath = join(projPath, file);
      const sessionId = file.replace(".jsonl", "");

      // Quick check: skip old files by mtime
      if (cutoffDate) {
        try {
          const mtime = statSync(filePath).mtime;
          if (mtime < cutoffDate) continue;
        } catch { continue; }
      }

      try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter(l => l.trim());

        let totalInput = 0;
        let totalOutput = 0;
        let totalCacheRead = 0;
        let totalCacheCreate = 0;
        let apiCalls = 0;
        let model = "unknown";
        let firstTimestamp = "";

        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            if (obj.type !== "assistant") continue;

            const msg = obj.message;
            if (!msg || typeof msg !== "object") continue;

            const usage = msg.usage;
            if (!usage) continue;

            if (!firstTimestamp && obj.timestamp) firstTimestamp = obj.timestamp;
            if (msg.model) model = msg.model;

            totalInput += usage.input_tokens || 0;
            totalOutput += usage.output_tokens || 0;
            totalCacheRead += usage.cache_read_input_tokens || 0;
            totalCacheCreate += usage.cache_creation_input_tokens || 0;
            apiCalls++;
          } catch { /* skip malformed */ }
        }

        if (apiCalls > 0) {
          // Filter by cutoff on actual timestamp
          if (cutoffDate && firstTimestamp) {
            const sessionDate = new Date(firstTimestamp);
            if (sessionDate < cutoffDate) continue;
          }

          const cost = calculateCost(model, totalInput, totalOutput, totalCacheRead, totalCacheCreate);

          // Friendly project name
          const projectName = proj
            .replace(/^-Users-etanheyman-/, "")
            .replace(/-/g, "/");

          sessions.push({
            sessionId,
            project: projectName || "root",
            model,
            timestamp: firstTimestamp,
            inputTokens: totalInput,
            outputTokens: totalOutput,
            cacheReadTokens: totalCacheRead,
            cacheCreateTokens: totalCacheCreate,
            apiCalls,
            costUsd: cost,
          });
        }
      } catch { /* skip unreadable */ }
    }
  }

  return sessions;
}

// ─── Stats Cache + History (CC's activity trackers) ───────────────

interface StatsDay {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

function readStatsCache(): StatsDay[] {
  const statsPath = join(process.env.HOME!, ".claude", "stats-cache.json");
  if (!existsSync(statsPath)) return [];
  try {
    const data = JSON.parse(readFileSync(statsPath, "utf-8"));
    return data.dailyActivity || [];
  } catch { return []; }
}

interface HistoryStats {
  totalSessions: number;
  firstDate: string;
  lastDate: string;
  byMonth: Record<string, number>;
  byProject: Record<string, number>;
}

function readHistory(): HistoryStats {
  const histPath = join(process.env.HOME!, ".claude", "history.jsonl");
  if (!existsSync(histPath)) return { totalSessions: 0, firstDate: "", lastDate: "", byMonth: {}, byProject: {} };

  const content = readFileSync(histPath, "utf-8");
  const lines = content.split("\n").filter(l => l.trim());

  let firstTs = Infinity;
  let lastTs = 0;
  const byMonth: Record<string, number> = {};
  const byProject: Record<string, number> = {};

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      let ts = Number(obj.timestamp || 0);
      if (ts > 1e12) ts = ts / 1000; // ms → sec
      if (ts < firstTs) firstTs = ts;
      if (ts > lastTs) lastTs = ts;

      const d = new Date(ts * 1000);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[month] = (byMonth[month] || 0) + 1;

      const proj = (obj.project || "unknown")
        .replace(/^\/Users\/etanheyman\//, "")
        .replace(/^Desktop\/Gits\//, "")
        .replace(/^Gits\//, "");
      byProject[proj] = (byProject[proj] || 0) + 1;
    } catch { /* skip */ }
  }

  const firstDate = firstTs < Infinity ? new Date(firstTs * 1000).toISOString().slice(0, 10) : "";
  const lastDate = lastTs > 0 ? new Date(lastTs * 1000).toISOString().slice(0, 10) : "";

  return { totalSessions: lines.length, firstDate, lastDate, byMonth, byProject };
}

// ─── Supabase API Costs ───────────────────────────────────────────

interface SupabaseEntry {
  day: string;
  calls: number;
  cost: number;
  model: string;
  tier: string;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
}

async function fetchSupabaseCosts(period: string): Promise<SupabaseEntry[]> {
  // Use direct Supabase REST API
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  let dateFilter = "";
  const now = new Date();
  if (period === "today") {
    dateFilter = `&created_at=gte.${now.toISOString().slice(0, 10)}`;
  } else if (period === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    dateFilter = `&created_at=gte.${weekAgo.toISOString().slice(0, 10)}`;
  } else if (period === "month") {
    dateFilter = `&created_at=gte.${now.toISOString().slice(0, 8)}01`;
  }

  try {
    const resp = await fetch(`${url}/rest/v1/llm_usage?select=created_at,model,cost_usd,tier,input_tokens,output_tokens${dateFilter}&order=created_at.desc&limit=10000`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
      },
    });
    if (!resp.ok) return [];
    const data = await resp.json() as any[];

    return data.map(row => ({
      day: row.created_at?.slice(0, 10) || "?",
      calls: 1,
      cost: Number(row.cost_usd) || 0,
      model: row.model || "unknown",
      tier: row.tier || "paid",
      durationMs: row.duration_ms || 0,
      inputTokens: row.input_tokens || 0,
      outputTokens: row.output_tokens || 0,
    }));
  } catch {
    return [];
  }
}

// ─── Period Filtering ─────────────────────────────────────────────

function getCutoffDate(period: string): Date | undefined {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "all":
      return undefined;
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

function filterSessionsByPeriod(sessions: SessionUsage[], period: string): SessionUsage[] {
  const cutoff = getCutoffDate(period);
  if (!cutoff) return sessions;
  return sessions.filter(s => {
    if (!s.timestamp) return false;
    return new Date(s.timestamp) >= cutoff;
  });
}

// ─── Formatters ───────────────────────────────────────────────────

function formatUSD(amount: number): string {
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function costColor(cost: number): string {
  if (cost > 50) return c.red;
  if (cost > 20) return c.yellow;
  return c.green;
}

// ─── Output Renderers ─────────────────────────────────────────────

function estimateHaikuCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000 * 0.80) + (outputTokens / 1_000_000 * 4.0);
}

function renderSummary(
  sessions: SessionUsage[],
  apiEntries: SupabaseEntry[],
  period: string
) {
  // CC subscription stats
  const ccCalls = sessions.reduce((s, x) => s + x.apiCalls, 0);
  const ccCost = sessions.reduce((s, x) => s + x.costUsd, 0);
  const ccInput = sessions.reduce((s, x) => s + x.inputTokens + x.cacheReadTokens + x.cacheCreateTokens, 0);
  const ccOutput = sessions.reduce((s, x) => s + x.outputTokens, 0);
  const ccSessions = sessions.length;

  // Split API entries by tier
  const paidEntries = apiEntries.filter(e => e.tier === "paid");
  const freeEntries = apiEntries.filter(e => e.tier === "free");

  // Separate local models from CLI helpers in free tier
  const localModelNames = new Set(["glm-4.7-flash", "qwen2.5-coder:7b", "llama3", "deepseek"]);
  const localEntries = freeEntries.filter(e => localModelNames.has(e.model) || e.model.includes("glm") || e.model.includes("qwen") || e.model.includes("llama") || e.model.includes("deepseek"));
  const helperEntries = freeEntries.filter(e => !localModelNames.has(e.model) && !e.model.includes("glm") && !e.model.includes("qwen") && !e.model.includes("llama") && !e.model.includes("deepseek"));

  const apiCost = paidEntries.reduce((s, e) => s + e.cost, 0);
  const apiCalls = paidEntries.length;

  // Local model savings (what they'd cost at Haiku rates)
  const localCalls = localEntries.length;
  const localInputTokens = localEntries.reduce((s, e) => s + (e.inputTokens || 0), 0);
  const localOutputTokens = localEntries.reduce((s, e) => s + (e.outputTokens || 0), 0);
  const localSaved = estimateHaikuCost(localInputTokens, localOutputTokens);
  const localDurationSec = localEntries.reduce((s, e) => s + (e.durationMs || 0), 0) / 1000;

  // CLI helper savings (what they'd cost at Sonnet rates: ~$3/MTok in, $15/MTok out)
  const helperCalls = helperEntries.length;
  const helperDurationSec = helperEntries.reduce((s, e) => s + (e.durationMs || 0), 0) / 1000;
  // Estimate ~2K tokens per helper call at Sonnet rates
  const helperEstimatedSaved = helperCalls * 0.01; // ~$0.01 per call at Sonnet rates

  const totalValue = ccCost + apiCost + localSaved + helperEstimatedSaved;

  console.log();
  console.log(`${c.bold}${c.cyan}══════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  AI Usage — ${period.toUpperCase()}${c.reset}`);
  console.log(`${c.bold}${c.cyan}══════════════════════════════════════════${c.reset}`);
  console.log();

  // Claude Code subscription
  // Stats cache for broader activity metrics
  const statsCache = readStatsCache();
  const cutoff = getCutoffDate(period);
  const filteredStats = cutoff
    ? statsCache.filter(s => new Date(s.date) >= cutoff)
    : statsCache;
  const statsSessions = filteredStats.reduce((s, d) => s + d.sessionCount, 0);
  const statsMessages = filteredStats.reduce((s, d) => s + d.messageCount, 0);
  const statsTools = filteredStats.reduce((s, d) => s + d.toolCallCount, 0);
  const statsDays = filteredStats.length;

  // Estimate cost for days without transcript data
  // Average cost per API call from days we DO have transcript data
  const avgCostPerCall = ccCalls > 0 ? ccCost / ccCalls : 0.17; // fallback ~$0.17/call
  // Stats cache messages ≈ 2x API calls (user + assistant pairs)
  const statsOnlyDays = filteredStats.filter(d => {
    const dayStr = d.date;
    return !sessions.some(s => s.timestamp?.startsWith(dayStr));
  });
  const estimatedExtraCalls = statsOnlyDays.reduce((s, d) => s + Math.floor(d.messageCount / 2), 0);
  const estimatedExtraCost = estimatedExtraCalls * avgCostPerCall;

  console.log(`${c.bold}${c.magenta}Claude Code${c.reset} ${c.dim}($200/mo subscription)${c.reset}`);
  console.log(`  Sessions: ${c.bold}${statsSessions > ccSessions ? statsSessions : ccSessions}${c.reset} ${c.dim}(${statsDays} active days)${c.reset}    Messages: ${c.bold}${statsMessages.toLocaleString()}${c.reset}`);
  console.log(`  Tokens:   ${c.cyan}${formatTokens(ccInput)}${c.reset} in  ${c.yellow}${formatTokens(ccOutput)}${c.reset} out ${c.dim}(from ${ccSessions} sessions with transcript data)${c.reset}`);
  if (estimatedExtraCost > 0) {
    console.log(`  Value:    ${costColor(ccCost)}${formatUSD(ccCost)}${c.reset} ${c.dim}(exact)${c.reset} + ${c.dim}~${formatUSD(estimatedExtraCost)} estimated (${statsOnlyDays.length} days without transcripts)${c.reset}`);
    console.log(`  Saved:    ${c.green}~${formatUSD(Math.max(0, ccCost + estimatedExtraCost - 200))}${c.reset} ${c.dim}(value - $200 subscription)${c.reset}`);
  } else {
    console.log(`  Value:    ${costColor(ccCost)}${formatUSD(ccCost)}${c.reset} ${c.dim}(at API rates)${c.reset}`);
    console.log(`  Saved:    ${c.green}${formatUSD(Math.max(0, ccCost - 200))}${c.reset} ${c.dim}(value - $200 subscription)${c.reset}`);
  }
  console.log();

  // Haiku API
  if (apiCalls > 0) {
    console.log(`${c.bold}${c.blue}Haiku API${c.reset} ${c.dim}(pay-per-use)${c.reset}`);
    console.log(`  Calls:    ${c.bold}${apiCalls}${c.reset}`);
    console.log(`  Cost:     ${costColor(apiCost)}${formatUSD(apiCost)}${c.reset}`);
    console.log();
  }

  // Local models (Ollama/GLM)
  console.log(`${c.bold}${c.yellow}Local Models${c.reset} ${c.dim}(Ollama — $0 cost)${c.reset}`);
  if (localCalls > 0) {
    const byModel: Record<string, number> = {};
    for (const e of localEntries) {
      byModel[e.model] = (byModel[e.model] || 0) + 1;
    }
    const modelList = Object.entries(byModel)
      .map(([name, count]) => `${name}(${count})`)
      .join(", ");
    console.log(`  Calls:    ${c.bold}${localCalls}${c.reset}    ${c.dim}${modelList}${c.reset}`);
    if (localDurationSec > 0) {
      console.log(`  Runtime:  ${c.bold}${Math.round(localDurationSec / 60)}min${c.reset}`);
    }
    console.log(`  Saved:    ${c.green}~${formatUSD(localSaved)}${c.reset} ${c.dim}(vs Haiku API)${c.reset}`);
  } else {
    console.log(`  ${c.dim}No tracked calls yet — run email scorer or benchmarks to log${c.reset}`);
    console.log(`  ${c.dim}Tracking enabled in ollama-helper.ts${c.reset}`);
  }
  console.log();

  // CLI helpers (Gemini/Cursor/Codex/Kiro)
  console.log(`${c.bold}${c.green}CLI Helpers${c.reset} ${c.dim}(gemini/cursor/codex/kiro — free)${c.reset}`);
  if (helperCalls > 0) {
    const byHelper: Record<string, number> = {};
    for (const e of helperEntries) {
      byHelper[e.model] = (byHelper[e.model] || 0) + 1;
    }
    const helperList = Object.entries(byHelper)
      .map(([name, count]) => `${name}(${count})`)
      .join(", ");
    console.log(`  Calls:    ${c.bold}${helperCalls}${c.reset}    ${c.dim}${helperList}${c.reset}`);
    if (helperDurationSec > 0) {
      console.log(`  Runtime:  ${c.bold}${Math.round(helperDurationSec / 60)}min${c.reset}`);
    }
    console.log(`  Saved:    ${c.green}~${formatUSD(helperEstimatedSaved)}${c.reset} ${c.dim}(vs Sonnet API)${c.reset}`);
  } else {
    console.log(`  ${c.dim}No tracked calls yet — use helpers.ts functions to log${c.reset}`);
    console.log(`  ${c.dim}Tracking enabled in helpers.ts (tier: "free")${c.reset}`);
  }
  console.log();

  // Bottom line
  console.log(`${c.cyan}══════════════════════════════════════════${c.reset}`);
  const monthsActive = Math.max(1, Math.ceil(statsDays / 30) || 1);
  const actualSpend = apiCost + (200 * monthsActive); // subscription × months + API
  const totalSaved = (ccCost + estimatedExtraCost - 200 * monthsActive) + localSaved + helperEstimatedSaved;
  console.log(`${c.bold}  Total value:    ${costColor(totalValue + estimatedExtraCost)}${formatUSD(totalValue + estimatedExtraCost)}${c.reset}`);
  console.log(`${c.bold}  Actual spend:   ${costColor(actualSpend)}${formatUSD(actualSpend)}${c.reset} ${c.dim}($200×${monthsActive}mo + ${formatUSD(apiCost)} API)${c.reset}`);
  console.log(`${c.bold}  Total saved:    ${c.green}${formatUSD(Math.max(0, totalSaved))}${c.reset} ${c.dim}(CC sub + local + helpers)${c.reset}`);
  const roi = (totalValue + estimatedExtraCost) > 0 ? ((totalValue + estimatedExtraCost) / actualSpend).toFixed(1) : "0";
  console.log(`${c.bold}  ROI:            ${c.green}${roi}x${c.reset}`);

  // Full history if period=all
  if (period === "all") {
    const history = readHistory();
    if (history.totalSessions > 0) {
      console.log();
      console.log(`${c.bold}${c.gray}Full CC History${c.reset} ${c.dim}(from history.jsonl — no token data)${c.reset}`);
      console.log(`  ${c.dim}Since: ${history.firstDate}  |  Total prompts: ${history.totalSessions.toLocaleString()}${c.reset}`);
      const months = Object.entries(history.byMonth).sort();
      for (const [month, count] of months) {
        const bar = "█".repeat(Math.min(Math.round(count / 200), 40));
        console.log(`  ${c.dim}${month}: ${bar} ${count.toLocaleString()}${c.reset}`);
      }
    }
  }
  console.log();
}

function renderDaily(sessions: SessionUsage[], apiEntries: SupabaseEntry[]) {
  // Group CC sessions by day (use timestamp)
  const dayMap: Record<string, DayUsage> = {};

  for (const s of sessions) {
    const day = s.timestamp?.slice(0, 10);
    if (!day) continue;
    if (!dayMap[day]) dayMap[day] = { date: day, ccCost: 0, ccCalls: 0, ccInputTokens: 0, ccOutputTokens: 0, apiCost: 0, apiCalls: 0, totalCost: 0 };
    dayMap[day].ccCost += s.costUsd;
    dayMap[day].ccCalls += s.apiCalls;
    dayMap[day].ccInputTokens += s.inputTokens + s.cacheReadTokens + s.cacheCreateTokens;
    dayMap[day].ccOutputTokens += s.outputTokens;
  }

  // Add API costs
  for (const e of apiEntries.filter(e => e.tier === "paid")) {
    const day = e.day;
    if (!dayMap[day]) dayMap[day] = { date: day, ccCost: 0, ccCalls: 0, ccInputTokens: 0, ccOutputTokens: 0, apiCost: 0, apiCalls: 0, totalCost: 0 };
    dayMap[day].apiCost += e.cost;
    dayMap[day].apiCalls += e.calls;
  }

  // Calculate totals
  for (const d of Object.values(dayMap)) {
    d.totalCost = d.ccCost + d.apiCost;
  }

  const days = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

  console.log();
  console.log(`${c.bold}${c.cyan}Daily Breakdown${c.reset}`);
  console.log(`${c.dim}Date        CC Value    API Cost    CC Calls  API Calls  Tokens In    Tokens Out${c.reset}`);
  console.log(`${c.dim}${"─".repeat(80)}${c.reset}`);

  let totalCC = 0, totalAPI = 0, totalCCCalls = 0, totalAPICalls = 0;

  for (const d of days) {
    totalCC += d.ccCost;
    totalAPI += d.apiCost;
    totalCCCalls += d.ccCalls;
    totalAPICalls += d.apiCalls;

    const ccCol = costColor(d.ccCost);
    const apiCol = costColor(d.apiCost);

    console.log(
      `${d.date}  ` +
      `${ccCol}${formatUSD(d.ccCost).padStart(10)}${c.reset}  ` +
      `${apiCol}${formatUSD(d.apiCost).padStart(10)}${c.reset}  ` +
      `${String(d.ccCalls).padStart(8)}  ` +
      `${String(d.apiCalls).padStart(9)}  ` +
      `${formatTokens(d.ccInputTokens).padStart(10)}  ` +
      `${formatTokens(d.ccOutputTokens).padStart(10)}`
    );
  }

  console.log(`${c.dim}${"─".repeat(80)}${c.reset}`);
  console.log(
    `${c.bold}TOTAL       ` +
    `${costColor(totalCC)}${formatUSD(totalCC).padStart(10)}${c.reset}  ` +
    `${costColor(totalAPI)}${formatUSD(totalAPI).padStart(10)}${c.reset}  ` +
    `${String(totalCCCalls).padStart(8)}  ` +
    `${String(totalAPICalls).padStart(9)}${c.reset}`
  );
  console.log();
}

function renderByProject(sessions: SessionUsage[]) {
  const projectMap: Record<string, { cost: number; calls: number; sessions: number; input: number; output: number }> = {};

  for (const s of sessions) {
    if (!projectMap[s.project]) projectMap[s.project] = { cost: 0, calls: 0, sessions: 0, input: 0, output: 0 };
    projectMap[s.project].cost += s.costUsd;
    projectMap[s.project].calls += s.apiCalls;
    projectMap[s.project].sessions++;
    projectMap[s.project].input += s.inputTokens + s.cacheReadTokens + s.cacheCreateTokens;
    projectMap[s.project].output += s.outputTokens;
  }

  const projects = Object.entries(projectMap).sort((a, b) => b[1].cost - a[1].cost);

  console.log();
  console.log(`${c.bold}${c.cyan}By Project${c.reset}`);

  const maxName = Math.max(...projects.map(([n]) => n.length), 10);
  console.log(`${c.dim}${"Project".padEnd(maxName)}  Sessions  Calls  Value       Tokens In    Tokens Out${c.reset}`);
  console.log(`${c.dim}${"─".repeat(maxName + 60)}${c.reset}`);

  for (const [name, data] of projects) {
    const col = costColor(data.cost);
    console.log(
      `${name.padEnd(maxName)}  ` +
      `${String(data.sessions).padStart(8)}  ` +
      `${String(data.calls).padStart(5)}  ` +
      `${col}${formatUSD(data.cost).padStart(10)}${c.reset}  ` +
      `${formatTokens(data.input).padStart(10)}  ` +
      `${formatTokens(data.output).padStart(10)}`
    );
  }
  console.log();
}

function renderByModel(sessions: SessionUsage[]) {
  const modelMap: Record<string, { cost: number; calls: number; input: number; output: number }> = {};

  for (const s of sessions) {
    const m = s.model;
    if (!modelMap[m]) modelMap[m] = { cost: 0, calls: 0, input: 0, output: 0 };
    modelMap[m].cost += s.costUsd;
    modelMap[m].calls += s.apiCalls;
    modelMap[m].input += s.inputTokens + s.cacheReadTokens + s.cacheCreateTokens;
    modelMap[m].output += s.outputTokens;
  }

  const models = Object.entries(modelMap).sort((a, b) => b[1].cost - a[1].cost);

  console.log();
  console.log(`${c.bold}${c.cyan}By Model${c.reset}`);

  const maxName = Math.max(...models.map(([n]) => n.length), 8);
  console.log(`${c.dim}${"Model".padEnd(maxName)}  Calls   Value       Tokens In    Tokens Out${c.reset}`);
  console.log(`${c.dim}${"─".repeat(maxName + 50)}${c.reset}`);

  for (const [name, data] of models) {
    const col = costColor(data.cost);
    console.log(
      `${name.padEnd(maxName)}  ` +
      `${String(data.calls).padStart(5)}  ` +
      `${col}${formatUSD(data.cost).padStart(10)}${c.reset}  ` +
      `${formatTokens(data.input).padStart(10)}  ` +
      `${formatTokens(data.output).padStart(10)}`
    );
  }
  console.log();
}

function renderJSON(sessions: SessionUsage[], apiEntries: SupabaseEntry[], period: string) {
  const ccCost = sessions.reduce((s, x) => s + x.costUsd, 0);
  const ccCalls = sessions.reduce((s, x) => s + x.apiCalls, 0);
  const apiCost = apiEntries.filter(e => e.tier === "paid").reduce((s, e) => s + e.cost, 0);
  const apiCalls = apiEntries.filter(e => e.tier === "paid").length;

  console.log(JSON.stringify({
    period,
    cc: { sessions: sessions.length, calls: ccCalls, valueUsd: Math.round(ccCost * 100) / 100 },
    api: { calls: apiCalls, costUsd: Math.round(apiCost * 10000) / 10000 },
    total: { valueUsd: Math.round((ccCost + apiCost) * 100) / 100 },
  }));
}

// ─── Main ─────────────────────────────────────────────────────────

// ─── Axiom Integration ──────────────────────────────────────────

async function sendToAxiom(sessions: SessionUsage[]): Promise<void> {
  try {
    const { logCCUsage, flushAxiom } = await import("../packages/shared/src/lib/axiom");

    let sent = 0;
    for (const s of sessions) {
      logCCUsage({
        model: s.model,
        project: s.project,
        input_tokens: s.inputTokens,
        output_tokens: s.outputTokens,
        cache_read_tokens: s.cacheReadTokens,
        cache_write_tokens: s.cacheCreateTokens,
        cost_estimate_usd: s.costUsd,
        session_id: s.sessionId,
      });
      sent++;
    }

    await flushAxiom();
    console.log(`${c.green}Sent ${sent} CC sessions to Axiom${c.reset}`);
  } catch (err) {
    console.error(`${c.red}Failed to send to Axiom:${c.reset}`, (err as Error).message);
  }
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const period = args.find(a => a.startsWith("--period="))?.split("=")[1] || "month";
  const daily = args.includes("--daily");
  const byProject = args.includes("--by-project");
  const byModel = args.includes("--by-model");
  const jsonOutput = args.includes("--json");
  const sendAxiom = args.includes("--send-axiom");

  // Load env for Supabase access
  try {
    await import("../packages/shared/src/lib/load-env");
  } catch { /* ok if not in repo root */ }

  const cutoff = getCutoffDate(period);

  // Scan CC transcripts
  const allSessions = scanCCTranscripts(cutoff);
  const sessions = filterSessionsByPeriod(allSessions, period);

  // Fetch Supabase API costs
  const apiEntries = await fetchSupabaseCosts(period);

  // Send CC session data to Axiom if requested
  if (sendAxiom) {
    await sendToAxiom(sessions);
  }

  if (jsonOutput) {
    renderJSON(sessions, apiEntries, period);
    return;
  }

  renderSummary(sessions, apiEntries, period);

  if (daily) renderDaily(sessions, apiEntries);
  if (byProject) renderByProject(sessions);
  if (byModel) renderByModel(sessions);

  // If no specific view requested, show daily by default
  if (!daily && !byProject && !byModel) {
    renderDaily(sessions, apiEntries);
  }
}

main().catch(console.error);
