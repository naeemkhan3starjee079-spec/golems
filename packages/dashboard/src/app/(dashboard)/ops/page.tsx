"use client";

import { Activity, Circle, Clock, RefreshCw, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchRecentEvents, fetchServiceRuns } from "@/lib/supabase/queries";

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OpsPage() {
  const [events, setEvents] = useState<GolemEvent[]>([]);
  const [runs, setRuns] = useState<ServiceRun[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [evts, svcRuns] = await Promise.all([
        fetchRecentEvents(30),
        fetchServiceRuns(15),
      ]);
      setEvents(evts as GolemEvent[]);
      setRuns(svcRuns as ServiceRun[]);
      setLastRefresh(new Date());
    } catch {
      // silent
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (!loaded) return <PageSkeleton />;

  // Derive service health from recent runs
  const serviceMap: Record<string, { status: string; lastRun: string }> = {};
  for (const run of runs) {
    if (!serviceMap[run.service]) {
      serviceMap[run.service] = { status: run.status === "success" ? "up" : "error", lastRun: run.started_at };
    }
  }

  return (
    <div className="space-y-8">
      {/* Header with refresh indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" />
          Service Health
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <button type="button" onClick={fetchAll} className="hover:text-foreground transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {lastRefresh && <span>Updated {timeAgo(lastRefresh.toISOString())}</span>}
        </div>
      </div>

      {/* Services derived from recent runs */}
      {Object.keys(serviceMap).length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Services (from recent runs)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(serviceMap).map(([name, info]) => (
              <div key={name} className="rounded-lg border border-border bg-surface p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{name.replace(/_/g, " ")}</span>
                  <Circle className={`w-3 h-3 fill-current ${info.status === "up" ? "text-emerald" : "text-rose"}`} />
                </div>
                <p className="text-xs text-muted">{timeAgo(info.lastRun)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout: Events + Service Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Timeline */}
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Recent Events
          </h3>
          <div className="rounded-lg border border-border bg-surface divide-y divide-border/50 max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-xs text-muted p-4">No events</p>
            ) : (
              events.map((ev, i) => (
                <div key={i} className="px-3 py-2 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-accent">{ev.actor}</span>
                      <span className="text-xs text-muted">{ev.type.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-[10px] text-muted/60">{timeAgo(ev.created_at)}</span>
                  </div>
                  {typeof ev.data?.subject === "string" && (
                    <p className="text-[11px] text-muted truncate mt-0.5">
                      {ev.data.subject}
                    </p>
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
            Service Runs
          </h3>
          <div className="rounded-lg border border-border bg-surface divide-y divide-border/50 max-h-80 overflow-y-auto">
            {runs.length === 0 ? (
              <p className="text-xs text-muted p-4">No runs</p>
            ) : (
              runs.map((run, i) => (
                <div key={i} className="px-3 py-2 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{run.service}</span>
                    <span className={`text-[10px] ${
                      run.status === "success" ? "text-emerald" : "text-rose"
                    }`}>{run.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted/60 mt-0.5">
                    <span>{timeAgo(run.started_at)}</span>
                    {run.duration_ms != null && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                  </div>
                  {run.error && (
                    <p className="text-[10px] text-rose truncate mt-0.5">{run.error}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
