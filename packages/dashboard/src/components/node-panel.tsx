"use client";

import { X, GitBranch, FileCode, Layers, Clock, Star, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { GraphNode, GraphEdge } from "@/lib/types";
import { getNodeColorHex } from "@/lib/graph-colors";

type Props = {
  node: GraphNode;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
};

function isEnriched(node: GraphNode): boolean {
  return node.color_type !== "unknown";
}

export function NodePanel({ node, edges, allNodes, onClose }: Props) {
  const enriched = isEnriched(node);
  const color = getNodeColorHex(node.color_type, enriched);

  // Find connected nodes
  const connectedIds = new Set<string>();
  const connectedEdges: { node: GraphNode; weight: number }[] = [];
  for (const e of edges) {
    const src = typeof e.source === "object" ? (e.source as any).id : e.source;
    const tgt = typeof e.target === "object" ? (e.target as any).id : e.target;
    if (src === node.id) connectedIds.add(tgt);
    if (tgt === node.id) connectedIds.add(src);
  }

  for (const id of connectedIds) {
    const n = allNodes.find((n) => n.id === id);
    const e = edges.find((e) => {
      const src =
        typeof e.source === "object" ? (e.source as any).id : e.source;
      const tgt =
        typeof e.target === "object" ? (e.target as any).id : e.target;
      return (
        (src === node.id && tgt === id) || (tgt === node.id && src === id)
      );
    });
    if (n && e) {
      connectedEdges.push({ node: n, weight: e.weight });
    }
  }
  connectedEdges.sort((a, b) => b.weight - a.weight);

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-surface/95 backdrop-blur-sm border-l border-border overflow-y-auto z-10">
      <div className="sticky top-0 bg-surface/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-semibold truncate max-w-[200px]">
            {node.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-surface-hover rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Metadata */}
        <div className="space-y-2">
          {enriched && (
            <div className="flex items-center gap-2 text-xs">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span className="text-muted">Type:</span>
              <span
                className="capitalize font-medium"
                style={{ color }}
              >
                {node.color_type}
              </span>
            </div>
          )}
          {!enriched && (
            <div className="text-xs text-muted/60 italic">
              Not yet enriched — will light up after enrichment
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <Star className="w-3.5 h-3.5 text-amber" />
            <span className="text-muted">Importance:</span>
            <span className="font-medium">{node.importance.toFixed(1)}</span>
          </div>

          {node.project && (
            <div className="flex items-center gap-2 text-xs">
              <FileCode className="w-3.5 h-3.5 text-cyan" />
              <span className="text-muted">Project:</span>
              <span className="font-medium">{node.project}</span>
            </div>
          )}

          {node.branch && (
            <div className="flex items-center gap-2 text-xs">
              <GitBranch className="w-3.5 h-3.5 text-emerald" />
              <span className="text-muted">Branch:</span>
              <span className="font-medium font-mono text-[11px]">
                {node.branch}
              </span>
            </div>
          )}

          {node.started_at && (
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-muted" />
              <span className="text-muted">Started:</span>
              <span className="font-medium">
                {new Date(node.started_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-background/50 p-3 text-center">
            <div className="text-lg font-semibold">
              {node.chunk_count.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted">Chunks</div>
          </div>
          <div className="rounded-md bg-background/50 p-3 text-center">
            <div className="text-lg font-semibold">{node.files_count}</div>
            <div className="text-[10px] text-muted">Files</div>
          </div>
        </div>

        {/* View Session */}
        {node.session_id && (
          <Link
            href={`/session?id=${encodeURIComponent(node.session_id)}`}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Session Detail
          </Link>
        )}

        {/* Community */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted uppercase tracking-wider">
            Community
          </h4>
          <div className="text-xs text-muted/80 space-y-0.5">
            <div>
              Coarse: cluster {node.community.coarse}
            </div>
            <div>
              Medium: cluster {node.community.medium}
            </div>
            <div>Fine: cluster {node.community.fine}</div>
          </div>
        </div>

        {/* Connected Sessions */}
        {connectedEdges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider">
              Connected ({connectedEdges.length})
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {connectedEdges.slice(0, 20).map(({ node: cn, weight }) => {
                const ce = isEnriched(cn);
                return (
                  <div
                    key={cn.id}
                    className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-surface-hover transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: getNodeColorHex(cn.color_type, ce),
                      }}
                    />
                    <span className="truncate flex-1">{cn.label}</span>
                    <span className="text-muted shrink-0">
                      {(weight * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
