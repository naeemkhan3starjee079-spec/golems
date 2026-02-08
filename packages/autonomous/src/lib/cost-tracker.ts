/**
 * Unified Cost Tracker
 *
 * Reads api_costs.jsonl and provides aggregation for:
 * - Total cost (today, this week, this month, all-time)
 * - Cost by source (email-scorer, job-scorer, etc.)
 * - Cost by model (haiku, sonnet, opus, etc.)
 * - Daily breakdown
 *
 * JSONL format (one per line):
 * { timestamp, model, source, input_tokens, output_tokens, cost_usd }
 */

import { readFileSync, existsSync, appendFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ─── Types ─────────────────────────────────────────────────────────

export interface CostEntry {
  timestamp: string;
  model: string;
  source: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface CostSummary {
  totalCost: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  period: string;
}

export interface CostBySource {
  [source: string]: CostSummary;
}

export interface CostByModel {
  [model: string]: CostSummary;
}

export interface DailyCost {
  date: string;
  cost: number;
  calls: number;
}

// ─── Reader ────────────────────────────────────────────────────────

/**
 * Read all cost entries from the JSONL file.
 * Returns empty array if file doesn't exist.
 */
export function readCostLog(costLogPath: string): CostEntry[] {
  if (!existsSync(costLogPath)) return [];

  const raw = readFileSync(costLogPath, "utf-8").trim();
  if (!raw) return [];

  const entries: CostEntry[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }
  return entries;
}

/**
 * Append a cost entry to the JSONL log.
 */
export function logCost(costLogPath: string, entry: CostEntry): void {
  const dir = dirname(costLogPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  appendFileSync(costLogPath, JSON.stringify(entry) + "\n");
}

// ─── Filters ───────────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function filterByPeriod(
  entries: CostEntry[],
  period: "today" | "week" | "month" | "all",
  now = new Date()
): CostEntry[] {
  if (period === "all") return entries;

  let cutoff: Date;
  switch (period) {
    case "today":
      cutoff = startOfDay(now);
      break;
    case "week":
      cutoff = startOfWeek(now);
      break;
    case "month":
      cutoff = startOfMonth(now);
      break;
  }

  return entries.filter((e) => new Date(e.timestamp) >= cutoff);
}

// ─── Aggregations ──────────────────────────────────────────────────

export function summarize(entries: CostEntry[], period: string): CostSummary {
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const e of entries) {
    totalCost += e.cost_usd;
    totalInputTokens += e.input_tokens;
    totalOutputTokens += e.output_tokens;
  }

  return {
    totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
    totalCalls: entries.length,
    totalInputTokens,
    totalOutputTokens,
    period,
  };
}

export function groupBySource(entries: CostEntry[]): CostBySource {
  const groups: Record<string, CostEntry[]> = {};
  for (const e of entries) {
    const key = e.source || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  const result: CostBySource = {};
  for (const [source, group] of Object.entries(groups)) {
    result[source] = summarize(group, source);
  }
  return result;
}

export function groupByModel(entries: CostEntry[]): CostByModel {
  const groups: Record<string, CostEntry[]> = {};
  for (const e of entries) {
    const key = e.model || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  const result: CostByModel = {};
  for (const [model, group] of Object.entries(groups)) {
    result[model] = summarize(group, model);
  }
  return result;
}

export function groupByDay(entries: CostEntry[]): DailyCost[] {
  const groups: Record<string, { cost: number; calls: number }> = {};
  for (const e of entries) {
    const date = e.timestamp.slice(0, 10); // YYYY-MM-DD
    if (!groups[date]) groups[date] = { cost: 0, calls: 0 };
    groups[date].cost += e.cost_usd;
    groups[date].calls++;
  }

  return Object.entries(groups)
    .map(([date, data]) => ({
      date,
      cost: Math.round(data.cost * 1_000_000) / 1_000_000,
      calls: data.calls,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Formatter ─────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  if (amount < 0.01) return `$${amount.toFixed(6)}`;
  if (amount < 1) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function formatSummary(summary: CostSummary): string {
  const lines = [
    `Period: ${summary.period}`,
    `Calls:  ${summary.totalCalls}`,
    `Cost:   ${formatUSD(summary.totalCost)}`,
    `Tokens: ${formatTokens(summary.totalInputTokens)} in / ${formatTokens(summary.totalOutputTokens)} out`,
  ];
  return lines.join("\n");
}

export function formatBySource(bySource: CostBySource): string {
  const entries = Object.entries(bySource).sort(
    (a, b) => b[1].totalCost - a[1].totalCost
  );

  if (entries.length === 0) return "No data.";

  const maxNameLen = Math.max(...entries.map(([name]) => name.length), 6);
  const header = `${"Source".padEnd(maxNameLen)}  Calls  Cost       Tokens`;
  const separator = "─".repeat(header.length);

  const rows = entries.map(([name, s]) => {
    const tokens = `${formatTokens(s.totalInputTokens)}/${formatTokens(s.totalOutputTokens)}`;
    return `${name.padEnd(maxNameLen)}  ${String(s.totalCalls).padStart(5)}  ${formatUSD(s.totalCost).padStart(9)}  ${tokens}`;
  });

  return [header, separator, ...rows].join("\n");
}

export function formatByModel(byModel: CostByModel): string {
  const entries = Object.entries(byModel).sort(
    (a, b) => b[1].totalCost - a[1].totalCost
  );

  if (entries.length === 0) return "No data.";

  const maxNameLen = Math.max(...entries.map(([name]) => name.length), 5);
  const header = `${"Model".padEnd(maxNameLen)}  Calls  Cost       Tokens`;
  const separator = "─".repeat(header.length);

  const rows = entries.map(([name, s]) => {
    const tokens = `${formatTokens(s.totalInputTokens)}/${formatTokens(s.totalOutputTokens)}`;
    return `${name.padEnd(maxNameLen)}  ${String(s.totalCalls).padStart(5)}  ${formatUSD(s.totalCost).padStart(9)}  ${tokens}`;
  });

  return [header, separator, ...rows].join("\n");
}

export function formatDaily(daily: DailyCost[]): string {
  if (daily.length === 0) return "No data.";

  const header = "Date        Calls  Cost";
  const separator = "─".repeat(header.length);

  const rows = daily.map(
    (d) => `${d.date}  ${String(d.calls).padStart(5)}  ${formatUSD(d.cost).padStart(9)}`
  );

  const total = daily.reduce((sum, d) => sum + d.cost, 0);
  const totalCalls = daily.reduce((sum, d) => sum + d.calls, 0);
  const totalRow = `${"TOTAL".padEnd(10)}  ${String(totalCalls).padStart(5)}  ${formatUSD(total).padStart(9)}`;

  return [header, separator, ...rows, separator, totalRow].join("\n");
}
