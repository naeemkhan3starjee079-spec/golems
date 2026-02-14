"use client";

import {
  Activity, AlertTriangle, Calendar, ChevronDown, ChevronRight,
  Circle, Clock, Cloud, Database, Filter, GitPullRequest, Moon, RefreshCw, Server, Target, Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchRecentEvents, fetchServiceRuns, fetchEnrichmentStats, fetchGolemState, fetchNightShiftEvents } from "@/lib/supabase/queries";
import { timeAgo } from "@/lib/format";

// --- Types ---

type GolemEvent = {
  actor: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
};

type ServiceRun = {
  service: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  status: string;
  error: string | null;
};

// --- Service Config ---

const SERVICE_CONFIG: Record<string, { label: string; group?: string; schedule: string; env: "cloud" | "local" }> = {
  emailgolem: { label: "Email Golem", group: "email", schedule: "Hourly 6am-7pm + 10pm", env: "cloud" },
  "emailgolem--initial-": { label: "Email (Initial)", group: "email", schedule: "On deploy", env: "cloud" },
  "emailgolem--night-": { label: "Email (Night)", group: "email", schedule: "10pm", env: "cloud" },
  jobgolem: { label: "Job Golem", schedule: "6am, 9am, 1pm Sun-Thu", env: "cloud" },
  briefing: { label: "Morning Briefing", schedule: "8am daily", env: "cloud" },
  nightshift: { label: "Night Shift", schedule: "4am daily", env: "local" },
  enrichment: { label: "Enrichment", schedule: "Night Shift window", env: "local" },
};

function getServiceConfig(name: string) {
  return SERVICE_CONFIG[name] ?? { label: name.replace(/_/g, " "), schedule: "Unknown", env: "cloud" as const };
}

// --- Helpers ---

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// Consolidate email variants into a single "Email Golem" entry
function consolidateServices(runs: ServiceRun[]) {
  const byService: Record<string, { runs: ServiceRun[]; lastRun: ServiceRun | null }> = {};

  for (const run of runs) {
    const config = getServiceConfig(run.service);
    const key = config.group ?? run.service;
    if (!byService[key]) byService[key] = { runs: [], lastRun: null };
    byService[key].runs.push(run);
    if (!byService[key].lastRun || run.started_at > byService[key].lastRun.started_at) {
      byService[key].lastRun = run;
    }
  }

  return Object.entries(byService).map(([key, { runs: svcRuns, lastRun }]) => {
    const config = key === "email"
      ? { label: "Email Golem", schedule: "Hourly 6am-7pm + 10pm", env: "cloud" as const }
      : getServiceConfig(key);
    const lastRunFailed = lastRun?.status !== "success";
    const runsWithDuration = svcRuns.filter((r) => r.duration_ms != null);
    const avgDuration = runsWithDuration.length > 0
      ? runsWithDuration.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / runsWithDuration.length
      : 0;
    return {
      key,
      ...config,
      status: lastRunFailed ? "error" : "up",
      lastRun: lastRun?.started_at ?? "",
      runCount: svcRuns.length,
      avgDuration,
      variants: key === "email" ? [...new Set(svcRuns.map((r) => r.service))] : undefined,
    };
  });
}

// Build 24h activity timeline from runs
function buildUptimeTimeline(runs: ServiceRun[]) {
  const now = Date.now();
  const hours24ago = now - 24 * 60 * 60 * 1000;
  const hourSlots = 24;
  const slotMs = 60 * 60 * 1000;

  // Group by consolidated service
  const byService: Record<string, boolean[]> = {};
  for (const run of runs) {
    const config = getServiceConfig(run.service);
    const key = config.group ?? run.service;
    if (!byService[key]) byService[key] = new Array(hourSlots).fill(false);

    const runTime = new Date(run.started_at).getTime();
    if (runTime >= hours24ago) {
      const slotIdx = Math.floor((runTime - hours24ago) / slotMs);
      if (slotIdx >= 0 && slotIdx < hourSlots) {
        byService[key][slotIdx] = true;
      }
    }
  }

  return byService;
}

// --- Page ---

export default function OpsPage() {
  const [events, setEvents] = useState<GolemEvent[]>([]);
  const [runs, setRuns] = useState<ServiceRun[]>([]);
  const [enrichment, setEnrichment] = useState<{ total: number; enriched: number; pct: number; updatedAt: string | null } | null>(null);
  const [nightShift, setNightShift] = useState<{
    target: string | null;
    lastRun: string | null;
    prs: Array<{ url: string; repo: string; createdAt: string }>;
    rotation: string[];
    events: GolemEvent[];
  } | null>(null);
  const [showNightShift, setShowNightShift] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [actorFilter, setActorFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setRefreshing(true);
    try {
      const [evtsResult, runsResult, enrichResult, stateResult, nsEventsResult] = await Promise.allSettled([
        fetchRecentEvents(50),
        fetchServiceRuns(100, 7),
        fetchEnrichmentStats(),
        fetchGolemState(),
        fetchNightShiftEvents(20),
      ]);
      if (id !== fetchIdRef.current) return;
      if (evtsResult.status === "fulfilled") setEvents(evtsResult.value as GolemEvent[]);
      if (runsResult.status === "fulfilled") setRuns(runsResult.value as ServiceRun[]);
      if (enrichResult.status === "fulfilled") {
        const e = enrichResult.value;
        const enrichedCount = Math.min(e.summaries.count, e.importance.count, e.intent.count);
        setEnrichment({
          total: e.total_chunks,
          enriched: enrichedCount,
          pct: e.total_chunks > 0 ? Math.round(enrichedCount * 100 / e.total_chunks * 10) / 10 : 0,
          updatedAt: e.updated_at ?? null,
        });
      }
      if (stateResult.status === "fulfilled") {
        const stateRows = stateResult.value as Array<{ key: string; value: unknown }>;
        const getVal = (key: string) => stateRows.find((s) => s.key === key)?.value;
        setNightShift({
          target: (getVal("nightShiftTarget") as string) ?? null,
          lastRun: (getVal("lastNightShift") as string) ?? null,
          prs: (getVal("nightShiftPRs") as Array<{ url: string; repo: string; createdAt: string }>) ?? [],
          rotation: (getVal("rotation") as string[]) ?? ["songscript", "zikaron", "claude-golem"],
          events: (nsEventsResult.status === "fulfilled" ? nsEventsResult.value : []) as GolemEvent[],
        });
      }
      setLastRefresh(new Date());
    } catch {
      // silent
    } finally {
      if (id === fetchIdRef.current) {
        setRefreshing(false);
        setLoaded(true);
      }
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (!loaded) return <PageSkeleton />;

  // Derived data
  const services = consolidateServices(runs);
  const errorRuns = runs.filter((r) => r.status !== "success");
  const uptimeData = buildUptimeTimeline(runs);

  // Event filters
  const actors = [...new Set(events.map((e) => e.actor))];
  const types = [...new Set(events.map((e) => e.type))];
  const filteredEvents = events.filter((e) => {
    if (actorFilter && e.actor !== actorFilter) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    return true;
  });

  // Railway status derived from cloud service activity
  const cloudRuns = runs.filter((r) => getServiceConfig(r.service).env === "cloud");
  const lastCloudRun = cloudRuns.length > 0 ? cloudRuns[0] : null;
  const railwayUp = lastCloudRun && (Date.now() - new Date(lastCloudRun.started_at).getTime()) < 3 * 60 * 60 * 1000;

  // Actor event counts for header badges
  const actorCounts: Record<string, number> = {};
  for (const ev of events) {
    actorCounts[ev.actor] = (actorCounts[ev.actor] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" />
          Ops Center
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <button type="button" onClick={fetchAll} className="hover:text-foreground transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {lastRefresh && <span>Updated {timeAgo(lastRefresh.toISOString())}</span>}
        </div>
      </div>

      {/* Service Cards with schedules */}
      {services.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" />
            Services
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map((svc) => (
              <div key={svc.key} className="rounded-lg border border-border bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle className={`w-2.5 h-2.5 fill-current ${svc.status === "up" ? "text-emerald" : "text-rose"}`} />
                    <span className="text-sm font-medium">{svc.label}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${svc.env === "cloud" ? "bg-blue-500/10 text-blue-400" : "bg-violet-500/10 text-violet-400"}`}>
                    {svc.env === "cloud" ? "Railway" : "Local"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted">
                  <Calendar className="w-3 h-3" />
                  <span>{svc.schedule}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span>{svc.lastRun ? `Last: ${timeAgo(svc.lastRun)}` : "No runs"}</span>
                  <span>{svc.runCount} runs · avg {formatDuration(svc.avgDuration)}</span>
                </div>
                {svc.variants && svc.variants.length > 1 && (
                  <div className="flex gap-1 flex-wrap">
                    {svc.variants.map((v) => (
                      <span key={v} className="text-[9px] px-1 py-0.5 rounded bg-surface-hover text-muted">{v}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Railway Cloud Worker + Enrichment row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Railway health */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className={`w-4 h-4 ${railwayUp ? "text-emerald" : "text-rose"}`} />
              <span className="text-sm font-medium">Railway Cloud Worker</span>
            </div>
            <Circle className={`w-2.5 h-2.5 fill-current ${railwayUp ? "text-emerald" : "text-rose"}`} />
          </div>
          <div className="mt-2 space-y-1 text-[10px] text-muted">
            <div className="flex justify-between">
              <span>Status</span>
              <span className={railwayUp ? "text-emerald" : "text-rose"}>{railwayUp ? "Active" : "Inactive"}</span>
            </div>
            {lastCloudRun && (
              <div className="flex justify-between">
                <span>Last cloud run</span>
                <span>{timeAgo(lastCloudRun.started_at)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Cloud services</span>
              <span>{cloudRuns.length} runs (7d)</span>
            </div>
          </div>
        </div>

        {/* Enrichment */}
        {enrichment && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Zikaron Enrichment</span>
              </div>
              <span className={`text-sm font-bold ${enrichment.pct >= 50 ? "text-emerald" : enrichment.pct >= 10 ? "text-amber" : "text-rose"}`}>
                {enrichment.pct}%
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${enrichment.pct >= 50 ? "bg-emerald" : enrichment.pct >= 10 ? "bg-amber" : "bg-rose"}`}
                style={{ width: `${Math.min(enrichment.pct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-muted">
              <span>{enrichment.enriched.toLocaleString()} / {enrichment.total.toLocaleString()} chunks</span>
              {enrichment.updatedAt && <span>Synced {timeAgo(enrichment.updatedAt)}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Night Shift */}
      {nightShift && (
        <div>
          <button
            type="button"
            onClick={() => setShowNightShift(!showNightShift)}
            className="text-xs font-medium text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            Night Shift
            {nightShift.target && <span className="normal-case text-indigo-400 font-normal ml-1">({nightShift.target})</span>}
            {showNightShift ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {showNightShift && (
            <div className="space-y-3">
              {/* Status cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1">
                    <Target className="w-3 h-3" />
                    Current Target
                  </div>
                  <span className="text-sm font-medium">{nightShift.target ?? "Not set"}</span>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1">
                    <Clock className="w-3 h-3" />
                    Last Run
                  </div>
                  <span className="text-sm font-medium">{nightShift.lastRun ? timeAgo(nightShift.lastRun) : "Never"}</span>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1">
                    <GitPullRequest className="w-3 h-3" />
                    Pending PRs
                  </div>
                  <span className="text-sm font-medium">{nightShift.prs.length}</span>
                </div>
              </div>

              {/* Weekly rotation */}
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[10px] text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Weekly Rotation
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => {
                    const isToday = idx === (new Date().getDay() + 6) % 7;
                    const repo = nightShift.rotation[idx % nightShift.rotation.length] ?? "—";
                    return (
                      <div
                        key={day}
                        className={`text-center rounded-md p-1.5 border ${
                          isToday
                            ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                            : "bg-surface border-border text-muted"
                        }`}
                      >
                        <div className="text-[9px] font-bold uppercase tracking-wider">{day}</div>
                        <div className={`text-[10px] mt-0.5 ${isToday ? "text-foreground" : ""}`}>{repo}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending PRs */}
              {nightShift.prs.length > 0 && (
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <GitPullRequest className="w-3 h-3" />
                    Night Shift PRs
                  </div>
                  <div className="space-y-1.5">
                    {nightShift.prs.map((pr, i) => (
                      <a
                        key={i}
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-surface-hover hover:bg-border/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <GitPullRequest className="w-3 h-3 text-emerald" />
                          <span className="text-xs">{pr.repo}</span>
                        </div>
                        {pr.createdAt && <span className="text-[10px] text-muted">{timeAgo(pr.createdAt)}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {nightShift.events.length > 0 && (
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Moon className="w-3 h-3" />
                    Recent Activity ({nightShift.events.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {nightShift.events.map((ev, i) => (
                      <div key={i} className="flex items-center justify-between px-2 py-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted">{ev.type.replace(/_/g, " ")}</span>
                          {typeof ev.data?.repo === "string" && (
                            <span className="text-[10px] text-muted/60">{ev.data.repo}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted/60">{timeAgo(ev.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error History */}
      {errorRuns.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowErrors(!showErrors)}
            className="text-xs font-medium text-rose uppercase tracking-wider mb-3 flex items-center gap-1.5 hover:text-rose/80 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Failed Runs ({errorRuns.length})
            {showErrors ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {showErrors && (
            <div className="rounded-lg border border-rose/30 bg-surface divide-y divide-border/50 max-h-48 overflow-y-auto">
              {errorRuns.map((run, i) => (
                <div key={i} className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{getServiceConfig(run.service).label}</span>
                    <span className="text-[10px] text-rose">{run.status}</span>
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">{timeAgo(run.started_at)}</div>
                  {run.error && <p className="text-[10px] text-rose/80 mt-0.5">{run.error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 24h Activity Timeline */}
      {Object.keys(uptimeData).length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            24h Activity
          </h3>
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            {Object.entries(uptimeData).map(([svc, slots]) => {
              const config = svc === "email"
                ? { label: "Email Golem" }
                : getServiceConfig(svc);
              return (
                <div key={svc} className="space-y-1">
                  <span className="text-[10px] text-muted">{config.label}</span>
                  <div className="flex gap-px h-3">
                    {slots.map((active, i) => {
                      const hourLabel = new Date(Date.now() - (23 - i) * 60 * 60 * 1000).getHours();
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm ${active ? "bg-emerald/70" : "bg-border/50"}`}
                          title={`${hourLabel}:00 — ${active ? "active" : "idle"}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between text-[9px] text-muted/40 pt-1">
              <span>{new Date(Date.now() - 23 * 60 * 60 * 1000).getHours()}:00</span>
              <span>Now</span>
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout: Events + Service Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Timeline with filters */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Events
              {/* Actor count badges */}
              {Object.entries(actorCounts).slice(0, 3).map(([actor, count]) => (
                <span key={actor} className="text-[9px] px-1 py-0.5 rounded bg-surface-hover ml-1">
                  {actor}: {count}
                </span>
              ))}
            </h3>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-muted" />
              <select
                value={actorFilter ?? ""}
                onChange={(e) => setActorFilter(e.target.value || null)}
                className="text-[10px] bg-surface border border-border rounded px-1 py-0.5 text-foreground"
              >
                <option value="">All actors</option>
                {actors.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={typeFilter ?? ""}
                onChange={(e) => setTypeFilter(e.target.value || null)}
                className="text-[10px] bg-surface border border-border rounded px-1 py-0.5 text-foreground"
              >
                <option value="">All types</option>
                {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface divide-y divide-border/50 max-h-96 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="text-xs text-muted p-4">No events{(actorFilter || typeFilter) ? " matching filters" : ""}</p>
            ) : (
              filteredEvents.map((ev, i) => (
                <div
                  key={i}
                  className="px-3 py-2 hover:bg-surface-hover transition-colors cursor-pointer"
                  onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-accent">{ev.actor}</span>
                      <span className="text-xs text-muted">{ev.type.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-[10px] text-muted/60">{timeAgo(ev.created_at)}</span>
                  </div>
                  {typeof ev.data?.subject === "string" && (
                    <p className="text-[11px] text-muted truncate mt-0.5">{ev.data.subject}</p>
                  )}
                  {expandedEvent === i && ev.data && Object.keys(ev.data).length > 0 && (
                    <div className="mt-2 p-2 rounded bg-background/50 text-[10px] font-mono space-y-0.5 max-h-32 overflow-y-auto">
                      {Object.entries(ev.data).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-accent shrink-0">{k}:</span>
                          <span className="text-muted truncate">{typeof v === "string" ? v : JSON.stringify(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Service Run History */}
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Recent Runs
          </h3>
          <div className="rounded-lg border border-border bg-surface divide-y divide-border/50 max-h-96 overflow-y-auto">
            {runs.length === 0 ? (
              <p className="text-xs text-muted p-4">No runs</p>
            ) : (
              runs.slice(0, 30).map((run, i) => {
                const config = getServiceConfig(run.service);
                return (
                  <div key={i} className="px-3 py-2 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{config.label}</span>
                      <span className={`text-[10px] ${run.status === "success" ? "text-emerald" : "text-rose"}`}>
                        {run.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted/60 mt-0.5">
                      <span>{timeAgo(run.started_at)}</span>
                      {run.duration_ms != null && <span>{formatDuration(run.duration_ms)}</span>}
                    </div>
                    {run.error && <p className="text-[10px] text-rose truncate mt-0.5">{run.error}</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
