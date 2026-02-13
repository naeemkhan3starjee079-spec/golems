"use client";

import { Database } from "lucide-react";
import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";

type EnrichmentStats = {
  total_chunks: number;
  embeddings: { count: number; pct: number };
  tags: { count: number; pct: number };
  summaries: { count: number; pct: number };
  importance: { count: number; pct: number };
  intent: { count: number; pct: number };
  projects: { project: string; chunks: number }[];
};

function ProgressBar({ label, pct, count }: { label: string; pct: number; count: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span>
          {count.toLocaleString()} <span className="text-muted">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function EnrichmentPage() {
  const [data, setData] = useState<EnrichmentStats | null>(null);

  useEffect(() => {
    fetch("/api/stats/enrichment")
      .then((r) => { if (r.ok) return r.json(); })
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Database className="w-5 h-5 text-accent" />
        Enrichment Progress
        <span className="text-sm font-normal text-muted">
          ({data.total_chunks.toLocaleString()} chunks)
        </span>
      </h2>

      <div className="rounded-lg border border-border bg-surface p-6 space-y-4 max-w-xl">
        <ProgressBar label="Embeddings" pct={data.embeddings.pct} count={data.embeddings.count} />
        <ProgressBar label="Tags" pct={data.tags.pct} count={data.tags.count} />
        <ProgressBar label="Intent" pct={data.intent.pct} count={data.intent.count} />
        <ProgressBar label="Summaries" pct={data.summaries.pct} count={data.summaries.count} />
        <ProgressBar label="Importance" pct={data.importance.pct} count={data.importance.count} />
      </div>

      {data.projects.length > 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden max-w-xl">
          <h3 className="text-sm font-medium p-3 border-b border-border">By Project</h3>
          <div className="divide-y divide-border/50">
            {data.projects.slice(0, 10).map((p) => (
              <div key={p.project} className="flex justify-between px-3 py-2 text-sm hover:bg-surface-hover">
                <span className="font-mono text-xs truncate max-w-xs">{p.project}</span>
                <span className="text-muted">{p.chunks.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
