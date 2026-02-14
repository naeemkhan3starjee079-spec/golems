"use client";

import {
  Palette,
  RefreshCw,
  Circle,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  BarChart3,
  Send,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchPipelineRuns, fetchPipelineStats } from "@/lib/supabase/queries";

import type { PipelineRun, PipelineStat, RoutingResult, FlowStep } from "@/lib/types";
import { formatDuration, timeAgo } from "@/lib/format";

const PIPELINE_COLORS: Record<string, string> = {
  remotion: "text-violet-400",
  comfyui: "text-sky-400",
  dataviz: "text-emerald-400",
  satori: "text-amber-400",
  playwright: "text-green-400",
  "figma-remotion": "text-pink-400",
};

const PIPELINE_LABELS: Record<string, string> = {
  remotion: "Remotion Video",
  comfyui: "Flux Image Gen",
  dataviz: "Data Viz",
  satori: "Template Fill",
  playwright: "Playwright Screenshots",
  "figma-remotion": "Figma to Video",
};

const PIPELINE_FLOWS: Record<string, FlowStep[]> = {
  remotion: [
    { label: "Idea", detail: "Video concept", type: "input" },
    { label: "CC (Opus)", detail: "Picks React composition", type: "brain" },
    { label: "React", detail: "Renders frames", type: "tool" },
    { label: "Remotion", detail: "Encodes MP4/GIF", type: "tool" },
    { label: "Video", detail: "Final output", type: "output" },
  ],
  comfyui: [
    { label: "Idea", detail: "Image concept", type: "input" },
    { label: "CC (Opus)", detail: "Crafts Flux prompt", type: "brain" },
    { label: "ComfyUI", detail: "Flux on Apple Silicon", type: "tool" },
    { label: "Vision Gate", detail: "Quality review", type: "gate" },
    { label: "Image", detail: "PNG + brand overlay", type: "output" },
  ],
  dataviz: [
    { label: "Data", detail: "Supabase / API", type: "input" },
    { label: "CC (Opus)", detail: "Designs chart", type: "brain" },
    { label: "SVG Builder", detail: "Vector markup", type: "tool" },
    { label: "Sharp", detail: "Rasterize", type: "tool" },
    { label: "Chart", detail: "PNG / SVG", type: "output" },
  ],
  playwright: [
    { label: "URL", detail: "Target page", type: "input" },
    { label: "CC (Opus)", detail: "Plans capture", type: "brain" },
    { label: "Playwright", detail: "Browser control", type: "tool" },
    { label: "Screenshot", detail: "PNG output", type: "output" },
  ],
  satori: [
    { label: "Data", detail: "Content + template", type: "input" },
    { label: "CC (Opus)", detail: "Fills template", type: "brain" },
    { label: "Satori", detail: "JSX to SVG", type: "tool" },
    { label: "Card", detail: "Social PNG", type: "output" },
  ],
  "figma-remotion": [
    { label: "Figma", detail: "Design source", type: "input" },
    { label: "CC (Opus)", detail: "Extracts layout + props", type: "brain" },
    { label: "React", detail: "Renders composition", type: "tool" },
    { label: "Figma Gate", detail: "Compare to design", type: "gate" },
    { label: "Remotion", detail: "Encodes MP4/GIF", type: "tool" },
    { label: "Video", detail: "1:1 fidelity output", type: "output" },
  ],
};

const FLOW_BRAIN_STYLES: Record<string, string> = {
  remotion: "border-violet-400/50 shadow-[0_0_12px_-3px] shadow-violet-500/25",
  comfyui: "border-sky-400/50 shadow-[0_0_12px_-3px] shadow-sky-500/25",
  dataviz: "border-emerald-400/50 shadow-[0_0_12px_-3px] shadow-emerald-500/25",
  satori: "border-amber-400/50 shadow-[0_0_12px_-3px] shadow-amber-500/25",
  playwright: "border-green-400/50 shadow-[0_0_12px_-3px] shadow-green-500/25",
  "figma-remotion": "border-pink-400/50 shadow-[0_0_12px_-3px] shadow-pink-500/25",
};

function FlowNode({
  step,
  pipelineId,
}: {
  step: FlowStep;
  pipelineId: string;
}) {
  const typeStyles: Record<FlowStep["type"], string> = {
    input: "border-dashed border-zinc-500/50 bg-zinc-800/30",
    brain: `border-solid bg-zinc-800/80 ${FLOW_BRAIN_STYLES[pipelineId] ?? "border-zinc-400/50"}`,
    tool: "border-solid border-zinc-600/50 bg-zinc-800/50",
    gate: "border-dotted border-emerald-500/40 bg-emerald-950/20",
    output: "border-solid border-zinc-500/50 bg-zinc-800/30",
  };

  return (
    <div
      className={`flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-md border min-w-[88px] ${typeStyles[step.type]}`}
    >
      <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono">
        {step.type}
      </span>
      <span className="text-xs font-semibold text-zinc-100">{step.label}</span>
      <span className="text-[10px] text-zinc-400 text-center leading-tight">
        {step.detail}
      </span>
    </div>
  );
}

function FlowConnector() {
  return (
    <svg
      width="36"
      height="16"
      viewBox="0 0 36 16"
      className="shrink-0 mx-0.5"
      aria-hidden="true"
    >
      <line
        x1="0"
        y1="8"
        x2="26"
        y2="8"
        stroke="rgb(113 113 122)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="7;0"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </line>
      <polygon points="26,4 34,8 26,12" fill="rgb(113 113 122)" />
    </svg>
  );
}

function FlowDiagram({
  steps,
  pipelineId,
}: {
  steps: FlowStep[];
  pipelineId: string;
}) {
  return (
    <div
      className="relative rounded-lg p-6 overflow-x-auto"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgb(63 63 70 / 0.25) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      <div className="flex items-center justify-center gap-0 min-w-max">
        {steps.flatMap((step, i) => [
          <FlowNode
            key={`node-${i}`}
            step={step}
            pipelineId={pipelineId}
          />,
          ...(i < steps.length - 1
            ? [<FlowConnector key={`conn-${i}`} />]
            : []),
        ])}
      </div>
      <p className="text-[10px] text-zinc-500 text-center mt-4 font-mono tracking-wider">
        CC (Opus) is always the orchestrator — tools execute, CC decides
      </p>
    </div>
  );
}

// --- Components ---

function PipelineStatCard({ stat }: { stat: PipelineStat }) {
  const label = PIPELINE_LABELS[stat.pipeline_id] ?? stat.pipeline_id;
  const color = PIPELINE_COLORS[stat.pipeline_id] ?? "text-muted";

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${color}`}>{label}</span>
        <BarChart3 className={`w-4 h-4 ${color}`} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-lg font-bold">{stat.total_runs}</p>
          <p className="text-xs text-muted">Total runs</p>
        </div>
        <div>
          <p className="text-lg font-bold">{(stat.success_rate * 100).toFixed(0)}%</p>
          <p className="text-xs text-muted">Success rate</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(stat.avg_duration_ms)} avg
        </span>
        {stat.avg_quality != null && (
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {stat.avg_quality.toFixed(1)} quality
          </span>
        )}
      </div>
      {stat.top_idea_types.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {stat.top_idea_types.map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RunRow({ run }: { run: PipelineRun }) {
  const color = PIPELINE_COLORS[run.pipeline_id] ?? "text-muted";
  const label = PIPELINE_LABELS[run.pipeline_id] ?? run.pipeline_id;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="mt-0.5">
        {run.success ? (
          <CheckCircle className="w-4 h-4 text-emerald" />
        ) : (
          <XCircle className="w-4 h-4 text-rose" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${color}`}>{label}</span>
          {run.output_format && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-muted">
              {run.output_format}
            </span>
          )}
          <span className="text-[10px] text-muted ml-auto shrink-0">
            {timeAgo(run.created_at)}
          </span>
        </div>
        <p className="text-xs text-muted truncate mt-0.5">{run.idea}</p>
        {run.error && (
          <p className="text-xs text-rose mt-0.5 truncate">{run.error}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-mono">{formatDuration(run.duration_ms)}</p>
        {run.quality_score != null && (
          <p className="text-[10px] text-muted">Q: {run.quality_score}</p>
        )}
      </div>
    </div>
  );
}

function RequestForm() {
  const [idea, setIdea] = useState("");
  const [routing, setRouting] = useState(false);
  const [result, setResult] = useState<RoutingResult | null>(null);

  const handleRoute = useCallback(async () => {
    if (!idea.trim()) return;
    setRouting(true);
    setResult(null);

    try {
      const res = await fetch("http://localhost:3001/api/pipeline/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
      });
      if (res.ok) {
        setResult(await res.json());
      }
    } catch {
      // Render service may not be running
    } finally {
      setRouting(false);
    }
  }, [idea]);

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
      <h3 className="text-xs font-medium text-muted uppercase tracking-wider">
        Create Content
      </h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRoute()}
          placeholder="Describe what you want to create..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          onClick={handleRoute}
          disabled={routing || !idea.trim()}
          className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {routing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Route
        </button>
      </div>

      {result && (
        <div className="rounded-md border border-border/50 bg-background p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Pipeline: {result.steps.map((s) => PIPELINE_LABELS[s.pipelineId] ?? s.pipelineId).join(" → ")}
            </span>
            <span className="text-xs text-muted">
              {(result.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <p className="text-xs text-muted">{result.reasoning}</p>
          {result.steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs"
            >
              <Circle
                className={`w-2 h-2 fill-current ${PIPELINE_COLORS[step.pipelineId] ?? "text-muted"}`}
              />
              <span className={PIPELINE_COLORS[step.pipelineId] ?? "text-muted"}>
                {PIPELINE_LABELS[step.pipelineId] ?? step.pipelineId}
              </span>
              <span className="text-muted">→ {step.outputFormat}</span>
              <span className="text-muted ml-auto">{step.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Page ---

const AVAILABLE_PIPELINES = [
  {
    id: "remotion",
    name: "Remotion Video",
    description: "Animations, code demos, data stories. CC writes React compositions.",
  },
  {
    id: "comfyui",
    name: "Flux Image Gen",
    description: "AI images, social visuals, merch. Local Flux model via ComfyUI.",
  },
  {
    id: "dataviz",
    name: "Data Viz",
    description: "Charts, infographics, reports. SVG builders + sharp.",
  },
  {
    id: "playwright",
    name: "Playwright Screenshots",
    description: "Screenshots, OG images, web scraping. Browser automation via MCP.",
  },
  {
    id: "satori",
    name: "Template Fill",
    description: "Social cards, OG images from templates. Fast SVG rendering.",
  },
  {
    id: "figma-remotion",
    name: "Figma to Video",
    description: "Design-validated video. Iterates until render matches Figma 1:1.",
  },
];

export default function ContentPage() {
  const [stats, setStats] = useState<PipelineStat[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [totalRuns, setTotalRuns] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [statsResult, runsResult] = await Promise.all([
        fetchPipelineStats(),
        fetchPipelineRuns(30),
      ]);
      setStats(statsResult.stats);
      setTotalRuns(statsResult.total_runs);
      setRuns(runsResult as PipelineRun[]);
      setLastRefresh(new Date());
    } catch {
      // silent
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (!loaded) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Palette className="w-5 h-5 text-accent" />
          Content Pipeline
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <button
            type="button"
            onClick={fetchAll}
            className="hover:text-foreground transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
          {lastRefresh && (
            <span>Updated {timeAgo(lastRefresh.toISOString())}</span>
          )}
        </div>
      </div>

      {/* Available Pipelines */}
      <div>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
          Available Pipelines
          <span className="text-[10px] font-normal ml-2 text-zinc-500">
            click to see flow
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {AVAILABLE_PIPELINES.map((p) => {
            const stat = stats.find((s) => s.pipeline_id === p.id);
            const color = PIPELINE_COLORS[p.id] ?? "text-muted";
            const isSelected = expandedPipeline === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() =>
                  setExpandedPipeline(isSelected ? null : p.id)
                }
                className={`rounded-lg border p-4 text-left transition-all ${
                  isSelected
                    ? "border-accent/50 bg-surface ring-1 ring-accent/20"
                    : "border-border bg-surface hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-semibold ${color}`}>
                    {p.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Circle className="w-2 h-2 fill-emerald text-emerald" />
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                        isSelected ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted mb-3">{p.description}</p>
                {stat ? (
                  <div className="flex gap-4 text-xs">
                    <span>
                      <span className="font-medium text-foreground">
                        {stat.total_runs}
                      </span>{" "}
                      <span className="text-muted">runs</span>
                    </span>
                    <span>
                      <span className="font-medium text-foreground">
                        {(stat.success_rate * 100).toFixed(0)}%
                      </span>{" "}
                      <span className="text-muted">success</span>
                    </span>
                    <span>
                      <span className="font-medium text-foreground">
                        {formatDuration(stat.avg_duration_ms)}
                      </span>{" "}
                      <span className="text-muted">avg</span>
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted">No runs yet</p>
                )}
              </button>
            );
          })}
        </div>
        {expandedPipeline && PIPELINE_FLOWS[expandedPipeline] && (
          <div className="mt-3 border border-border/50 rounded-lg bg-zinc-950/50">
            <FlowDiagram
              steps={PIPELINE_FLOWS[expandedPipeline]}
              pipelineId={expandedPipeline}
            />
          </div>
        )}
      </div>

      {/* Pipeline Stats (only show if we have data) */}
      {stats.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
            Performance Stats ({totalRuns} total runs)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.map((s) => (
              <PipelineStatCard key={s.pipeline_id} stat={s} />
            ))}
          </div>
        </div>
      )}

      {/* Content Request Form */}
      <RequestForm />

      {/* Recent Runs */}
      <div>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
          Recent Pipeline Runs
        </h3>
        <div className="rounded-lg border border-border bg-surface divide-y divide-border/50 max-h-96 overflow-y-auto">
          {runs.length === 0 ? (
            <div className="p-8 text-center">
              <Palette className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">No pipeline runs yet</p>
              <p className="text-xs text-muted mt-1">
                Use the form above or CLI to create content
              </p>
            </div>
          ) : (
            runs.map((run) => <RunRow key={run.id} run={run} />)
          )}
        </div>
      </div>
    </div>
  );
}
