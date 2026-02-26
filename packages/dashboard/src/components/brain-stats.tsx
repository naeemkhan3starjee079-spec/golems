"use client";

import type { BrainGraph } from "@/lib/types";
import { TYPE_COLORS } from "@/lib/graph-colors";

type Props = {
  graph: BrainGraph;
};

export function BrainStats({ graph }: Props) {
  const total = graph.nodes.length;
  const enriched = graph.nodes.filter((n) => n.color_type !== "unknown").length;
  const pct = total > 0 ? ((enriched / total) * 100).toFixed(1) : "0";

  // Count by type (only enriched)
  const typeCounts: Record<string, number> = {};
  for (const n of graph.nodes) {
    if (n.color_type !== "unknown") {
      typeCounts[n.color_type] = (typeCounts[n.color_type] || 0) + 1;
    }
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-surface/90 backdrop-blur-sm border border-border rounded-lg p-3 text-xs space-y-2 max-w-[200px]">
      <div className="flex items-center justify-between">
        <span className="text-muted">Nodes</span>
        <span className="font-medium">{total.toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted">Edges</span>
        <span className="font-medium">
          {graph.edges.length.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted">Enriched</span>
        <span className="font-medium">
          {enriched} ({pct}%)
        </span>
      </div>

      {/* Type legend */}
      {Object.keys(typeCounts).length > 0 && (
        <div className="pt-1 border-t border-border/50 space-y-1">
          {Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      TYPE_COLORS[type] || "rgba(100,116,139,0.25)",
                  }}
                />
                <span className="text-muted capitalize flex-1">{type}</span>
                <span className="text-muted/70">{count}</span>
              </div>
            ))}
        </div>
      )}

      {graph.meta.generated_at && (
        <div className="pt-1 border-t border-border/50 text-[10px] text-muted/50">
          Generated {new Date(graph.meta.generated_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
