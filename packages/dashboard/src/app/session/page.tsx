"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  GitBranch,
  Layers,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { cleanProject, cleanPath } from "@/lib/format";
import { TYPE_ICONS, TYPE_COLORS, TYPE_BORDER_COLORS } from "@/lib/content-types";

type SessionChunk = {
  id: string;
  content_type: string;
  project: string;
  position: number | null;
  importance: number | null;
  tags: string | null;
  summary: string | null;
  intent: string | null;
  content: string | null;
  source_file: string | null;
};

type SessionContext = {
  session_id: string;
  project: string;
  branch: string;
  pr_number: number | null;
  commit_shas: string | null;
  files_changed: string | null;
  started_at: string | null;
  ended_at: string | null;
  plan_name: string | null;
  plan_phase: string | null;
};

type SessionData = {
  session_id: string;
  total_chunks: number;
  page: number;
  per_page: number;
  chunks: SessionChunk[];
  context: SessionContext | null;
  files: string[];
  type_distribution: Record<string, number>;
};


function SessionContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id") ?? "";
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const perPage = 30;

  const fetchSession = useCallback(() => {
    if (!sessionId) return;
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (filterType) params.set("content_type", filterType);
    fetch(`/api/session/${encodeURIComponent(sessionId)}?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [sessionId, page, filterType]);

  useEffect(() => {
    setPage(1); // Reset to page 1 when filter changes
  }, [filterType]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (!sessionId)
    return (
      <div className="text-center text-muted py-20">
        No session ID provided
      </div>
    );

  if (error)
    return (
      <div className="text-center text-rose py-20">
        Failed to load session: {error}
      </div>
    );

  if (!data) return <PageSkeleton />;

  const totalPages = Math.ceil(data.total_chunks / perPage);

  // Derive a short label for the session
  const sessionLabel = sessionId.split("/").pop()?.replace(".jsonl", "") ?? sessionId;

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/"
          className="p-1.5 hover:bg-surface-hover rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{sessionLabel}</h2>
          <div className="flex items-center gap-3 text-[10px] text-muted/60 mt-0.5">
            <span>{data.total_chunks.toLocaleString()} chunks</span>
            <span>{data.files.length} files</span>
            {data.context?.branch && (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {data.context.branch}
              </span>
            )}
            {data.context?.started_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(data.context.started_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 shrink-0 flex-wrap">
        {/* Type distribution */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType("")}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
              !filterType
                ? "bg-accent/20 text-accent border-accent/30"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            All ({data.total_chunks})
          </button>
          {Object.entries(data.type_distribution)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const color = TYPE_COLORS[type] ?? "text-muted";
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFilterType(filterType === type ? "" : type)
                  }
                  className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                    filterType === type
                      ? `bg-accent/20 ${color} border-accent/30`
                      : "bg-surface border-border text-muted hover:text-foreground"
                  }`}
                >
                  {type.replace(/_/g, " ")} ({count})
                </button>
              );
            })}
        </div>
      </div>

      {/* Context info */}
      {data.context && (
        <div className="rounded-lg border border-border bg-surface/50 p-3 space-y-1.5 text-xs shrink-0">
          <div className="flex items-center gap-2 text-muted uppercase tracking-wider text-[10px] font-medium">
            <Layers className="w-3.5 h-3.5" />
            Session Context
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {data.context.project && (
              <>
                <span className="text-muted">Project</span>
                <span className="font-mono">{cleanProject(data.context.project)}</span>
              </>
            )}
            {data.context.plan_name && (
              <>
                <span className="text-muted">Plan</span>
                <span>{data.context.plan_name}</span>
              </>
            )}
            {data.context.plan_phase && (
              <>
                <span className="text-muted">Phase</span>
                <span>{data.context.plan_phase}</span>
              </>
            )}
            {data.context.pr_number && (
              <>
                <span className="text-muted">PR</span>
                <span>#{data.context.pr_number}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Files touched */}
      {data.files.length > 0 && (
        <details className="rounded-lg border border-border bg-surface/50 shrink-0">
          <summary className="px-3 py-2 text-[10px] text-muted uppercase tracking-wider font-medium cursor-pointer hover:text-foreground transition-colors">
            Files touched ({data.files.length})
          </summary>
          <div className="px-3 pb-2 max-h-32 overflow-y-auto space-y-0.5">
            {data.files.map((f) => (
              <div key={f} className="text-[10px] font-mono text-muted/70 truncate">
                {cleanPath(f)}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Chunks */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {data.chunks.map((chunk) => {
          const tc = TYPE_BORDER_COLORS[chunk.content_type] ?? "border-l-muted text-muted";
          const borderClass = tc.split(" ")[0] ?? "border-l-muted";
          const Icon = TYPE_ICONS[chunk.content_type] ?? MessageSquare;
          return (
            <div
              key={chunk.id}
              className={`border-l-2 ${borderClass} rounded-r-md bg-surface/50 p-3 space-y-1`}
            >
              <div className="flex items-center gap-2 text-[10px] text-muted/60">
                <Icon className="w-3 h-3" />
                <span className="capitalize">
                  {chunk.content_type?.replace(/_/g, " ")}
                </span>
                {chunk.importance != null && (
                  <span className="text-amber">
                    imp: {chunk.importance.toFixed(1)}
                  </span>
                )}
                {chunk.intent && (
                  <span className="text-accent">{chunk.intent}</span>
                )}
              </div>
              {chunk.summary && (
                <div className="text-xs text-muted italic">
                  {chunk.summary}
                </div>
              )}
              {chunk.content ? (
                <pre className="text-xs whitespace-pre-wrap break-words leading-relaxed text-foreground/80 max-h-40 overflow-y-auto">
                  {chunk.content}
                </pre>
              ) : (
                <span className="text-[10px] text-muted/30 italic">No content</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2 shrink-0">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded hover:bg-surface-hover disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded hover:bg-surface-hover disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SessionContent />
    </Suspense>
  );
}
