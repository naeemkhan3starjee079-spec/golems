"use client";

import { Database, RefreshCw, Sparkles, Clock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchEnrichmentStats } from "@/lib/supabase/queries";
import { timeAgo } from "@/lib/format";
import type { FieldStats, EnrichmentStats } from "@/lib/types";

function ProgressBar({ label, pct, count, total }: { label: string; pct: number; count: number; total: number }) {
  const remaining = total - count;
  const color = pct >= 95 ? "bg-emerald" : pct >= 50 ? "bg-accent" : "bg-amber";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span>
          {count.toLocaleString()}
          <span className="text-muted"> / {total.toLocaleString()}</span>
          <span className={`ml-1.5 font-medium ${pct >= 95 ? "text-emerald" : pct >= 50 ? "text-accent" : "text-amber"}`}>
            {pct}%
          </span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {remaining > 0 && (
        <p className="text-[10px] text-muted/50">{remaining.toLocaleString()} remaining</p>
      )}
    </div>
  );
}

export default function EnrichmentPage() {
  const [data, setData] = useState<EnrichmentStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, setTick] = useState(0);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setRefreshing(true);
    try {
      const result = await fetchEnrichmentStats();
      if (id !== fetchIdRef.current) return;
      setData(result);
      setFailed(false);
    } catch {
      if (id !== fetchIdRef.current) return;
      setFailed(true);
    } finally {
      if (id === fetchIdRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

  if (failed && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
        <Database className="w-10 h-10 text-muted/30" />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">No enrichment data yet</p>
          <p className="text-xs text-muted/60">
            Run enrichment locally to sync stats: <code className="bg-surface px-1.5 py-0.5 rounded">zikaron enrich</code>
          </p>
          <p className="text-xs text-muted/40">
            Stats are synced to Supabase after each enrichment batch.
          </p>
          <button type="button" onClick={() => { setFailed(false); fetchData(); }} className="text-xs text-accent hover:underline mt-2">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <PageSkeleton />;

  // Overall enrichment: average of text fields only (skip embeddings — always 100%)
  const textFields = [
    { ...data.tags, label: "Tags" },
    { ...data.summaries, label: "Summaries" },
    { ...data.importance, label: "Importance" },
    { ...data.intent, label: "Intent" },
  ];
  const overallPct = textFields.reduce((s, f) => s + f.pct, 0) / textFields.length;

  // Estimate: ~2s/chunk average (GLM with thinking disabled: 1s simple, 13s complex)
  const needsEnrichment = data.total_chunks - Math.min(data.summaries.count, data.importance.count, data.intent.count);
  const estSeconds = needsEnrichment * 2;
  const estHours = estSeconds / 3600;

  // Sort projects by chunk count, group small ones
  const topProjects = data.projects.slice(0, 8);
  const otherCount = data.projects.slice(8).reduce((s, p) => s + p.chunks, 0);
  const maxProjectChunks = topProjects.length > 0 ? topProjects[0].chunks : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="w-5 h-5 text-accent" />
          Enrichment Progress
        </h2>
        <div className="flex items-center gap-3">
          {data.updated_at && (
            <span className="text-[10px] text-muted/50 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Synced {timeAgo(data.updated_at)}
            </span>
          )}
          <button type="button" onClick={fetchData} className="text-muted hover:text-foreground transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Total Chunks</p>
          <p className="text-2xl font-bold">{data.total_chunks.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Overall</p>
          <p className={`text-2xl font-bold ${overallPct >= 95 ? "text-emerald" : overallPct >= 50 ? "text-accent" : "text-amber"}`}>
            {overallPct.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Needs Enrichment</p>
          <p className="text-2xl font-bold">{needsEnrichment.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Est. Time</p>
          <p className="text-2xl font-bold">
            {estHours < 1 ? `${Math.ceil(estHours * 60)}m` : `${estHours.toFixed(1)}h`}
          </p>
        </div>
      </div>

      {/* Progress bars */}
      <div className="rounded-lg border border-border bg-surface p-6 space-y-5">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-medium text-muted uppercase tracking-wider">Field Coverage</span>
        </div>
        <ProgressBar label="Embeddings" pct={data.embeddings.pct} count={data.embeddings.count} total={data.total_chunks} />
        <ProgressBar label="Tags" pct={data.tags.pct} count={data.tags.count} total={data.total_chunks} />
        <ProgressBar label="Intent" pct={data.intent.pct} count={data.intent.count} total={data.total_chunks} />
        <ProgressBar label="Summaries" pct={data.summaries.pct} count={data.summaries.count} total={data.total_chunks} />
        <ProgressBar label="Importance" pct={data.importance.pct} count={data.importance.count} total={data.total_chunks} />
      </div>

      {/* Projects with proportional bars */}
      {topProjects.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
            By Project ({data.projects.length} total)
          </h3>
          <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
            {topProjects.map((p) => {
              const widthPct = (p.chunks / maxProjectChunks) * 100;
              // Clean up project name
              const name = p.project
                .replace(/^-Users-etanheyman-Gits-/, "~/")
                .replace(/^-Users-etanheyman-Desktop-Gits-/, "~/old/")
                .replace(/^-Users-etanheyman-/, "~/")
                .replace(/^-$/, "root");
              return (
                <div key={p.project} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono truncate max-w-[200px]">{name}</span>
                    <span className="text-muted shrink-0 ml-2">{p.chunks.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent/50"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {otherCount > 0 && (
              <div className="pt-1 border-t border-border/30">
                <div className="flex justify-between text-xs text-muted">
                  <span>{data.projects.length - 8} other projects</span>
                  <span>{otherCount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Intent distribution */}
      {data.by_intent && Object.keys(data.by_intent).length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
            Intent Distribution
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Object.entries(data.by_intent)
              .sort(([, a], [, b]) => b - a)
              .map(([intent, count]) => (
                <div key={intent} className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-[10px] text-muted capitalize">{intent}</p>
                  <p className="text-sm font-semibold">{count.toLocaleString()}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
