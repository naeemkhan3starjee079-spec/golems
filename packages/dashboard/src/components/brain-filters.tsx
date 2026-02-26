"use client";

import { useMemo, useState } from "react";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import type { BrainGraph, GraphFilters } from "@/lib/types";
import { TYPE_COLORS, SOURCE_COLORS } from "@/lib/graph-colors";

type Props = {
  graph: BrainGraph;
  filters: GraphFilters;
  onChange: (filters: GraphFilters) => void;
  matchCount: number;
};

const SOURCE_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  unknown: "Other",
};

function Chip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border transition-all ${
        active
          ? "border-accent/50 bg-accent/10 text-foreground"
          : "border-border/50 bg-transparent text-muted hover:border-border hover:text-foreground/70"
      }`}
    >
      {color && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}

export function BrainFilters({ graph, filters, onChange, matchCount }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters =
    filters.projects.length > 0 ||
    filters.sources.length > 0 ||
    filters.intents.length > 0;

  // Derive available options from graph data
  const options = useMemo(() => {
    const projects = new Map<string, number>();
    const sources = new Map<string, number>();
    const intents = new Map<string, number>();

    for (const node of graph.nodes) {
      if (node.project) {
        projects.set(node.project, (projects.get(node.project) ?? 0) + 1);
      }
      const src = node.source || "unknown";
      sources.set(src, (sources.get(src) ?? 0) + 1);
      if (node.color_type && node.color_type !== "unknown") {
        intents.set(node.color_type, (intents.get(node.color_type) ?? 0) + 1);
      }
    }

    return {
      projects: [...projects.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      sources: [...sources.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      intents: [...intents.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
    };
  }, [graph.nodes]);

  function toggle(
    key: keyof GraphFilters,
    value: string,
  ) {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  function clearAll() {
    onChange({ projects: [], sources: [], intents: [] });
  }

  return (
    <div className="absolute top-14 left-4 z-10">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
          hasActiveFilters
            ? "bg-accent/10 border-accent/30 text-foreground"
            : "bg-surface/90 backdrop-blur-sm border-border text-muted hover:text-foreground"
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        Filters
        {hasActiveFilters && (
          <span className="bg-accent/20 text-accent px-1.5 rounded-full text-[10px] font-medium">
            {matchCount}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Filter panel */}
      {expanded && (
        <div className="mt-1.5 p-3 bg-surface/95 backdrop-blur-sm border border-border rounded-lg space-y-2.5 max-w-[320px] max-h-[60vh] overflow-y-auto">
          {/* Header with clear */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted">
                {matchCount} / {graph.nodes.length} nodes
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}

          {/* Source */}
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
              Source
            </div>
            <div className="flex flex-wrap gap-1">
              {options.sources.map(({ name, count }) => (
                <Chip
                  key={name}
                  label={`${SOURCE_LABELS[name] ?? name} (${count})`}
                  color={SOURCE_COLORS[name]}
                  active={filters.sources.includes(name)}
                  onClick={() => toggle("sources", name)}
                />
              ))}
            </div>
          </div>

          {/* Project */}
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
              Project
            </div>
            <div className="flex flex-wrap gap-1">
              {options.projects.map(({ name, count }) => (
                <Chip
                  key={name}
                  label={`${name} (${count})`}
                  active={filters.projects.includes(name)}
                  onClick={() => toggle("projects", name)}
                />
              ))}
            </div>
          </div>

          {/* Intent */}
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
              Intent
            </div>
            <div className="flex flex-wrap gap-1">
              {options.intents.map(({ name, count }) => (
                <Chip
                  key={name}
                  label={`${name} (${count})`}
                  color={TYPE_COLORS[name]}
                  active={filters.intents.includes(name)}
                  onClick={() => toggle("intents", name)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
