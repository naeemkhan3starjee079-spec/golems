"use client";

import { Coins } from "lucide-react";
import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";

type TokenStats = {
  days: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  entry_count: number;
  by_model?: Record<string, { calls: number; input_tokens: number; output_tokens: number; cost_usd: number }>;
};

export default function TokensPage() {
  const [data, setData] = useState<TokenStats | null>(null);

  useEffect(() => {
    fetch("/api/stats/tokens?days=30")
      .then((r) => { if (r.ok) return r.json(); })
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Coins className="w-5 h-5 text-accent" />
        Token Usage (last {data.days} days)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Total Cost</p>
          <p className="text-2xl font-bold text-amber">${data.total_cost_usd.toFixed(2)}</p>
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

      {data.by_model && (
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
              {Object.entries(data.by_model).map(([model, stats]) => (
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
      )}
    </div>
  );
}
