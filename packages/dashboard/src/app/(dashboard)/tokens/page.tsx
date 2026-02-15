"use client";

import { Coins, RefreshCw, TrendingUp, Clock, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchTokenStats } from "@/lib/supabase/queries";
import { timeAgo } from "@/lib/format";
import type { DayStats, ModelStats, SourceStats, TokenStats } from "@/lib/types";

const PERIODS = [7, 14, 30] as const;

const FREE_MODELS = new Set([
  "glm-4.7-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite",
]);

const CHEAP_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-3-5-haiku-20241022",
]);

type SourceEnv = "local" | "cloud" | "cli";

const SOURCE_ENV: Record<string, { env: SourceEnv; label: string }> = {
  enrichment: { env: "local", label: "Enrichment" },
  "email-golem": { env: "cloud", label: "Email Golem" },
  "email-scorer": { env: "cloud", label: "Email Scorer" },
  "job-golem": { env: "cloud", label: "Job Golem" },
  briefing: { env: "cloud", label: "Briefing" },
  whoopsync: { env: "cloud", label: "Whoop Sync" },
  nightshift: { env: "local", label: "Night Shift" },
  test: { env: "local", label: "Test" },
};

function getSourceEnv(source: string): { env: SourceEnv; label: string } {
  return SOURCE_ENV[source] ?? { env: "cloud", label: source.replace(/-/g, " ") };
}

const ENV_BADGE: Record<SourceEnv, { classes: string; label: string }> = {
  local: { classes: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", label: "Local" },
  cloud: { classes: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", label: "Cloud" },
  cli: { classes: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "CLI" },
};

function costTier(model: string): "free" | "cheap" | "expensive" {
  const lower = model.toLowerCase();
  for (const m of FREE_MODELS) {
    if (lower.includes(m)) return "free";
  }
  for (const m of CHEAP_MODELS) {
    if (lower.includes(m)) return "cheap";
  }
  return "expensive";
}

function tierColor(tier: "free" | "cheap" | "expensive"): string {
  switch (tier) {
    case "free": return "text-emerald";
    case "cheap": return "text-amber";
    case "expensive": return "text-rose";
  }
}

function tierBadge(tier: "free" | "cheap" | "expensive"): string {
  switch (tier) {
    case "free": return "bg-emerald/10 text-emerald border-emerald/20";
    case "cheap": return "bg-amber/10 text-amber border-amber/20";
    case "expensive": return "bg-rose/10 text-rose border-rose/20";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IL", { month: "short", day: "numeric" });
}


/** Fill missing days with zero values so chart shows gaps.
 * Uses local date to match the query boundary (which uses setDate(-days) at current time). */
function fillDays(byDay: Record<string, DayStats>, days: number): { date: string; calls: number; input_tokens: number; output_tokens: number; cost_usd: number }[] {
  const result: { date: string; calls: number; input_tokens: number; output_tokens: number; cost_usd: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const stats = byDay[key];
    result.push({
      date: key,
      calls: stats?.calls ?? 0,
      input_tokens: stats?.input_tokens ?? 0,
      output_tokens: stats?.output_tokens ?? 0,
      cost_usd: stats?.cost_usd ?? 0,
    });
  }
  return result;
}

export default function TokensPage() {
  const [data, setData] = useState<TokenStats | null>(null);
  const [days, setDays] = useState<number>(14);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async (d: number) => {
    const id = ++fetchIdRef.current;
    setRefreshing(true);
    try {
      const result = await fetchTokenStats(d);
      if (id !== fetchIdRef.current) return; // stale response — discard
      setData(result);
      setFailed(false);
      setLastUpdated(new Date());
    } catch {
      if (id !== fetchIdRef.current) return;
      setFailed(true);
    } finally {
      if (id === fetchIdRef.current) setRefreshing(false);
    }
  }, []);

  // Fetch on mount and period change
  useEffect(() => { fetchData(days); }, [days, fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(days), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [days, fetchData]);

  // Tick every 10s to update "last updated" display
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

  if (failed && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
        <Coins className="w-10 h-10 text-muted/30" />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Failed to load token data</p>
          <button type="button" onClick={() => fetchData(days)} className="text-xs text-accent hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <PageSkeleton />;

  // Build filled daily data array
  const dailyEntries = fillDays(data.by_day ?? {}, days);
  const maxDailyCost = Math.max(...dailyEntries.map((d) => d.cost_usd), 0.001);
  const maxDailyCalls = Math.max(...dailyEntries.map((d) => d.calls), 1);
  const avgDailyCost = days > 0 ? data.total_cost_usd / days : 0;
  const hasAnyData = dailyEntries.some((d) => d.calls > 0);

  return (
    <div className="space-y-6">
      {/* Header with period selector, refresh, last updated */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Coins className="w-5 h-5 text-accent" />
          Token Usage
        </h2>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-muted/50 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {timeAgo(lastUpdated.toISOString())}
            </span>
          )}
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                disabled={refreshing}
                className={`px-3 py-1.5 transition-colors ${
                  days === p
                    ? "bg-accent text-background font-medium"
                    : "bg-surface hover:bg-surface-hover text-muted"
                } ${refreshing ? "opacity-50" : ""}`}
              >
                {p}d
              </button>
            ))}
          </div>
          <button type="button" onClick={() => fetchData(days)} disabled={refreshing} className="text-muted hover:text-foreground transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Total Cost</p>
          <p className="text-2xl font-bold text-amber">${data.total_cost_usd.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Avg/Day</p>
          <p className="text-2xl font-bold text-amber">${avgDailyCost.toFixed(3)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Total Calls</p>
          <p className="text-2xl font-bold">{data.total_calls.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Input Tokens</p>
          <p className="text-2xl font-bold">{data.total_input_tokens.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Output Tokens</p>
          <p className="text-2xl font-bold">{data.total_output_tokens.toLocaleString()}</p>
        </div>
      </div>

      {/* Daily cost bar chart */}
      <div>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          Daily Cost ({days}d)
        </h3>
        <div className="rounded-lg border border-border bg-surface p-4">
          {!hasAnyData ? (
            <div className="flex items-center justify-center h-32 text-muted text-sm">
              No usage data in the last {days} days
            </div>
          ) : (
            <>
              <div className="flex items-end gap-1 h-32">
                {dailyEntries.map((d) => {
                  const heightPct = d.cost_usd > 0 ? Math.max((d.cost_usd / maxDailyCost) * 100, 3) : 0;
                  const callsPct = d.calls > 0 ? Math.max((d.calls / maxDailyCalls) * 100, 3) : 0;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative min-w-[4px]">
                      {/* Tooltip */}
                      {d.calls > 0 && (
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="bg-background border border-border rounded-md px-2 py-1.5 text-[10px] whitespace-nowrap shadow-lg">
                            <div className="font-medium">{formatDate(d.date)}</div>
                            <div className="text-amber">${d.cost_usd.toFixed(4)}</div>
                            <div className="text-muted">{d.calls} calls</div>
                            <div className="text-muted">{(d.input_tokens + d.output_tokens).toLocaleString()} tok</div>
                          </div>
                        </div>
                      )}
                      {/* Bars */}
                      <div className="w-full flex items-end gap-px" style={{ height: "100%" }}>
                        <div
                          className={`flex-1 rounded-t-sm transition-all ${d.cost_usd > 0 ? "bg-amber/70 hover:bg-amber" : "bg-transparent"}`}
                          style={{ height: `${heightPct}%` }}
                        />
                        <div
                          className={`flex-1 rounded-t-sm transition-all ${d.calls > 0 ? "bg-accent/40 hover:bg-accent/60" : "bg-transparent"}`}
                          style={{ height: `${callsPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex gap-1 mt-2">
                {dailyEntries.map((d, i) => {
                  const step = dailyEntries.length > 14 ? 7 : dailyEntries.length > 7 ? 3 : 1;
                  const show = i % step === 0 || i === dailyEntries.length - 1;
                  return (
                    <div key={d.date} className="flex-1 text-center text-[9px] text-muted/60 truncate">
                      {show ? formatDate(d.date) : ""}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 text-[10px] text-muted">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-amber/70" />
                  <span>Cost</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-accent/40" />
                  <span>Calls</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* By Source breakdown */}
      {data.by_source && Object.keys(data.by_source).length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            By Source
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(data.by_source)
              .sort(([, a], [, b]) => b.calls - a.calls)
              .map(([source, stats]) => {
                const srcInfo = getSourceEnv(source);
                const envBadge = ENV_BADGE[srcInfo.env];
                return (
                  <div key={source} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-xs text-muted truncate">{srcInfo.label}</p>
                      <span className={`text-[8px] px-1 py-0.5 rounded border ${envBadge.classes}`}>{envBadge.label}</span>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{stats.calls.toLocaleString()} <span className="text-xs font-normal text-muted">calls</span></p>
                    <p className="text-xs text-amber tabular-nums">${stats.cost_usd.toFixed(3)}</p>
                    <p className="text-[10px] text-muted tabular-nums">{(stats.input_tokens + stats.output_tokens).toLocaleString()} tokens</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Model breakdown table */}
      {data.by_model && Object.keys(data.by_model).length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">By Model</h3>
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="text-left p-3">Model</th>
                  <th className="text-left p-3">Source</th>
                  <th className="text-right p-3">Calls</th>
                  <th className="text-right p-3">Input</th>
                  <th className="text-right p-3">Output</th>
                  <th className="text-right p-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.by_model)
                  .sort(([, a], [, b]) => b.cost_usd - a.cost_usd || b.calls - a.calls)
                  .map(([model, stats]) => {
                    const tier = costTier(model);
                    return (
                      <tr key={model} className="border-b border-border/50 hover:bg-surface-hover">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{model}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${tierBadge(tier)}`}>
                              {tier}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-muted">{stats.sources.join(", ")}</td>
                        <td className="p-3 text-right">{stats.calls}</td>
                        <td className="p-3 text-right">{stats.input_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right">{stats.output_tokens.toLocaleString()}</td>
                        <td className={`p-3 text-right ${tierColor(tier)}`}>${stats.cost_usd.toFixed(3)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-[10px] text-muted/40 space-y-1">
        <p className="text-right">
          {data.entry_count.toLocaleString()} entries across {data.unique_sources} source{data.unique_sources !== 1 ? "s" : ""} in last {days} days
          {refreshing && " · refreshing..."}
        </p>
        <p className="text-right">
          Not tracked: Claude Code sessions (billed to Anthropic subscription) · CLI agents (Cursor, Codex, Gemini CLI)
        </p>
      </div>
    </div>
  );
}
