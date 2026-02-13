"use client";

import { Coins, RefreshCw, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";

type DayStats = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
};

type TokenStats = {
  days: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  entry_count: number;
  by_model?: Record<string, { calls: number; input_tokens: number; output_tokens: number; cost_usd: number }>;
  by_day?: Record<string, DayStats>;
};

const PERIODS = [7, 14, 30] as const;

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IL", { month: "short", day: "numeric" });
}

export default function TokensPage() {
  const [data, setData] = useState<TokenStats | null>(null);
  const [days, setDays] = useState<number>(14);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback((d: number) => {
    setRefreshing(true);
    fetch(`/api/stats/tokens?days=${d}`)
      .then((r) => { if (r.ok) return r.json(); })
      .then((res) => { if (res) setData(res); })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => { fetchData(days); }, [days, fetchData]);

  if (!data) return <PageSkeleton />;

  // Build sorted daily data array
  const dailyEntries = data.by_day
    ? Object.entries(data.by_day)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const maxDailyCost = Math.max(...dailyEntries.map((d) => d.cost_usd), 0.01);
  const maxDailyCalls = Math.max(...dailyEntries.map((d) => d.calls), 1);
  const avgDailyCost = days > 0
    ? data.total_cost_usd / days
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with period selector and refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Coins className="w-5 h-5 text-accent" />
          Token Usage
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                className={`px-3 py-1.5 transition-colors ${
                  days === p
                    ? "bg-accent text-background font-medium"
                    : "bg-surface hover:bg-surface-hover text-muted"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
          <button type="button" onClick={() => fetchData(days)} className="text-muted hover:text-foreground transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Total Cost</p>
          <p className="text-2xl font-bold text-amber">${data.total_cost_usd.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Avg/Day</p>
          <p className="text-2xl font-bold text-amber">${avgDailyCost.toFixed(2)}</p>
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
      {dailyEntries.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Daily Cost
          </h3>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-end gap-1 h-32">
              {dailyEntries.map((d) => {
                const heightPct = Math.max((d.cost_usd / maxDailyCost) * 100, 2);
                const callsPct = Math.max((d.calls / maxDailyCalls) * 100, 2);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                      <div className="bg-background border border-border rounded-md px-2 py-1.5 text-[10px] whitespace-nowrap shadow-lg">
                        <div className="font-medium">{formatDate(d.date)}</div>
                        <div className="text-amber">${d.cost_usd.toFixed(3)}</div>
                        <div className="text-muted">{d.calls} calls</div>
                        <div className="text-muted">{(d.input_tokens + d.output_tokens).toLocaleString()} tok</div>
                      </div>
                    </div>
                    {/* Cost bar */}
                    <div className="w-full flex items-end gap-px" style={{ height: "100%" }}>
                      <div
                        className="flex-1 bg-amber/70 rounded-t-sm transition-all hover:bg-amber"
                        style={{ height: `${heightPct}%` }}
                      />
                      <div
                        className="flex-1 bg-accent/40 rounded-t-sm transition-all hover:bg-accent/60"
                        style={{ height: `${callsPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* X-axis labels — show every Nth for readability */}
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
          </div>
        </div>
      )}

      {/* Model breakdown table */}
      {data.by_model && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">By Model</h3>
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="text-left p-3">Model</th>
                  <th className="text-right p-3">Calls</th>
                  <th className="text-right p-3">Input</th>
                  <th className="text-right p-3">Output</th>
                  <th className="text-right p-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.by_model)
                  .sort(([, a], [, b]) => b.cost_usd - a.cost_usd)
                  .map(([model, stats]) => (
                    <tr key={model} className="border-b border-border/50 hover:bg-surface-hover">
                      <td className="p-3 font-mono text-xs">{model}</td>
                      <td className="p-3 text-right">{stats.calls}</td>
                      <td className="p-3 text-right">{stats.input_tokens.toLocaleString()}</td>
                      <td className="p-3 text-right">{stats.output_tokens.toLocaleString()}</td>
                      <td className="p-3 text-right text-amber">${stats.cost_usd.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entry count */}
      {data.entry_count != null && (
        <p className="text-[10px] text-muted/40 text-right">
          {data.entry_count.toLocaleString()} entries in last {data.days ?? days} days
        </p>
      )}
    </div>
  );
}
