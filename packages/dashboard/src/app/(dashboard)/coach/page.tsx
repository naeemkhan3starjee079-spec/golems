"use client";

import {
  Activity, Battery, BedDouble, Clock, Flame,
  Heart, HeartPulse, Moon, RefreshCw, Sun, Target, TrendingUp, Wind,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchWhoopSnapshots, fetchLatestWhoopSnapshot, fetchTodayActivity } from "@/lib/supabase/queries";
import type { WhoopSnapshot } from "@/lib/types";
import { getRecoveryColor } from "@/lib/types/coach";

// --- Helpers ---

function msToHours(ms: number | null): string {
  if (!ms) return "--";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function msToMinutes(ms: number | null): number {
  if (!ms) return 0;
  return Math.round(ms / 60000);
}

function pct(val: number | null): string {
  if (val == null) return "--";
  return `${Math.round(val)}%`;
}

const RECOVERY_COLORS = {
  green: { bg: "bg-emerald/10", border: "border-emerald/30", text: "text-emerald", ring: "ring-emerald/40" },
  yellow: { bg: "bg-amber/10", border: "border-amber/30", text: "text-amber", ring: "ring-amber/40" },
  red: { bg: "bg-red/10", border: "border-red/30", text: "text-red-400", ring: "ring-red/40" },
  unknown: { bg: "bg-surface", border: "border-border", text: "text-muted", ring: "ring-border" },
};

// --- Recovery Ring ---

function RecoveryRing({ score, state }: { score: number | null; state: string | null }) {
  const color = getRecoveryColor(score);
  const c = RECOVERY_COLORS[color];
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - ((score ?? 0) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-border/30" />
          <circle
            cx="60" cy="60" r="54" fill="none" strokeWidth="6"
            strokeLinecap="round"
            stroke={color === "green" ? "#34d399" : color === "yellow" ? "#fbbf24" : color === "red" ? "#f87171" : "#6b7280"}
            strokeDasharray={circumference}
            strokeDashoffset={state === "SCORED" ? offset : circumference}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold tabular-nums ${c.text}`}>
            {state === "SCORED" ? score : "--"}
          </span>
          <span className="text-[10px] text-muted uppercase tracking-wider">Recovery</span>
        </div>
      </div>
    </div>
  );
}

// --- Sleep Architecture Bar ---

function SleepBar({ snapshot }: { snapshot: WhoopSnapshot }) {
  const total = (snapshot.rem_ms ?? 0) + (snapshot.deep_ms ?? 0) + (snapshot.light_ms ?? 0) + (snapshot.awake_ms ?? 0);
  if (total === 0) return null;

  const segments = [
    { label: "REM", ms: snapshot.rem_ms ?? 0, color: "bg-violet-400" },
    { label: "Deep", ms: snapshot.deep_ms ?? 0, color: "bg-blue-400" },
    { label: "Light", ms: snapshot.light_ms ?? 0, color: "bg-sky-300" },
    { label: "Awake", ms: snapshot.awake_ms ?? 0, color: "bg-amber-400/60" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-border/20">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all duration-500`}
            style={{ width: `${(s.ms / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${s.color}`} />
            <span>{s.label} {msToMinutes(s.ms)}m</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 7-Day Trend Sparkline ---

function TrendBar({ snapshots, field, max, colorFn }: {
  snapshots: WhoopSnapshot[];
  field: keyof WhoopSnapshot;
  max: number;
  colorFn?: (val: number) => string;
}) {
  const sorted = [...snapshots].reverse(); // oldest first
  return (
    <div className="flex items-end gap-1 h-10">
      {sorted.map((s, i) => {
        const val = (s[field] as number) ?? 0;
        const height = Math.max(4, (val / max) * 100);
        const color = colorFn ? colorFn(val) : "bg-accent/60";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className={`w-full rounded-sm ${color} transition-all duration-300`}
              style={{ height: `${height}%` }}
              title={`${s.snapshot_date}: ${val}`}
            />
            <span className="text-[8px] text-muted/50">
              {new Date(s.snapshot_date + "T12:00:00").toLocaleDateString("en", { weekday: "narrow" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function recoveryBarColor(val: number): string {
  if (val >= 67) return "bg-emerald";
  if (val >= 34) return "bg-amber";
  return "bg-red-400";
}

// --- Page ---

type ActivityEvent = { type: string; actor: string; data: Record<string, unknown>; created_at: string };
type ServiceRun = { service: string; started_at: string; ended_at: string | null; duration_ms: number | null; status: string };

export default function CoachPage() {
  const [latest, setLatest] = useState<WhoopSnapshot | null>(null);
  const [history, setHistory] = useState<WhoopSnapshot[]>([]);
  const [todayEvents, setTodayEvents] = useState<ActivityEvent[]>([]);
  const [todayRuns, setTodayRuns] = useState<ServiceRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      const [snap, hist, activity] = await Promise.all([
        fetchLatestWhoopSnapshot(),
        fetchWhoopSnapshots(7),
        fetchTodayActivity(),
      ]);
      if (id !== fetchIdRef.current) return;
      setLatest(snap);
      setHistory(hist);
      setTodayEvents(activity.events as ActivityEvent[]);
      setTodayRuns(activity.runs as ServiceRun[]);
    } catch {
      // silent
    } finally {
      if (id === fetchIdRef.current) setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!loaded) return <PageSkeleton />;

  // Empty state
  if (!latest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-accent" />
            Coach
          </h2>
        </div>
        <div className="text-center py-20 text-muted">
          <HeartPulse className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">No Whoop data yet</p>
          <p className="text-xs mt-1 text-muted/60">
            Run the Whoop sync to populate health metrics
          </p>
          <code className="text-[10px] bg-surface border border-border rounded px-2 py-1 mt-3 inline-block">
            bun -e &quot;import {'{'}syncWhoopToSupabase{'}'} from &apos;@golems/shared/whoop/sync&apos;; await syncWhoopToSupabase()&quot;
          </code>
        </div>
      </div>
    );
  }

  const recoveryColor = getRecoveryColor(latest.recovery_score);
  const rc = RECOVERY_COLORS[recoveryColor];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="w-5 h-5 text-accent" />
          Coach
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted">{latest.snapshot_date}</span>
          <button type="button" onClick={fetchAll} className="text-xs text-muted hover:text-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Section: Recovery Ring + Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recovery Ring */}
        <div className={`rounded-xl border ${rc.border} ${rc.bg} p-6 flex flex-col items-center justify-center`}>
          <RecoveryRing score={latest.recovery_score} state={latest.recovery_state} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-4 text-center">
            <div>
              <div className="text-sm font-bold tabular-nums">{latest.hrv_rmssd ? Math.round(latest.hrv_rmssd) : "--"}</div>
              <div className="text-[9px] text-muted uppercase">HRV ms</div>
            </div>
            <div>
              <div className="text-sm font-bold tabular-nums">{latest.resting_heart_rate ?? "--"}</div>
              <div className="text-[9px] text-muted uppercase">RHR bpm</div>
            </div>
            <div>
              <div className="text-sm font-bold tabular-nums">{latest.spo2 ? `${latest.spo2}%` : "--"}</div>
              <div className="text-[9px] text-muted uppercase">SpO2</div>
            </div>
            <div>
              <div className="text-sm font-bold tabular-nums">{latest.skin_temp ? `${latest.skin_temp.toFixed(1)}°` : "--"}</div>
              <div className="text-[9px] text-muted uppercase">Skin Temp</div>
            </div>
          </div>
        </div>

        {/* Sleep Card */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Sleep</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">{msToHours(latest.sleep_duration_ms)}</span>
            <span className="text-[10px] text-muted">in bed</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-background/50 p-2">
              <div className="text-sm font-bold tabular-nums">{pct(latest.sleep_performance)}</div>
              <div className="text-[8px] text-muted uppercase">Performance</div>
            </div>
            <div className="rounded-lg bg-background/50 p-2">
              <div className="text-sm font-bold tabular-nums">{pct(latest.sleep_efficiency)}</div>
              <div className="text-[8px] text-muted uppercase">Efficiency</div>
            </div>
            <div className="rounded-lg bg-background/50 p-2">
              <div className="text-sm font-bold tabular-nums">{pct(latest.sleep_consistency)}</div>
              <div className="text-[8px] text-muted uppercase">Consistency</div>
            </div>
          </div>

          <SleepBar snapshot={latest} />
        </div>

        {/* Strain Card */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Strain</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">{latest.strain?.toFixed(1) ?? "--"}</span>
            <span className="text-[10px] text-muted">/ 21</span>
          </div>

          {/* Strain gauge */}
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-border/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 via-orange-400 to-red-400 transition-all duration-500"
                style={{ width: `${Math.min(((latest.strain ?? 0) / 21) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] text-muted/50">
              <span>Light</span>
              <span>Moderate</span>
              <span>Hard</span>
              <span>All Out</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-background/50 p-2">
              <div className="text-sm font-bold tabular-nums flex items-center justify-center gap-1">
                <HeartPulse className="w-3 h-3 text-muted" />
                {latest.avg_heart_rate ?? "--"}
              </div>
              <div className="text-[8px] text-muted uppercase">Avg HR</div>
            </div>
            <div className="rounded-lg bg-background/50 p-2">
              <div className="text-sm font-bold tabular-nums flex items-center justify-center gap-1">
                <Activity className="w-3 h-3 text-muted" />
                {latest.max_heart_rate ?? "--"}
              </div>
              <div className="text-[8px] text-muted uppercase">Max HR</div>
            </div>
          </div>

          <div className="text-center text-xs text-muted">
            <span className="tabular-nums">{latest.kilojoule ? Math.round(latest.kilojoule) : "--"}</span> kJ burned
          </div>
        </div>
      </div>

      {/* 7-Day Trends */}
      {history.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Recovery Trend</span>
              <TrendingUp className="w-3 h-3 text-muted/40" />
            </div>
            <TrendBar snapshots={history} field="recovery_score" max={100} colorFn={recoveryBarColor} />
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Sleep Hours</span>
              <Moon className="w-3 h-3 text-muted/40" />
            </div>
            <TrendBar
              snapshots={history}
              field="sleep_duration_ms"
              max={10 * 3600000}
              colorFn={() => "bg-violet-400/60"}
            />
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Daily Strain</span>
              <Flame className="w-3 h-3 text-muted/40" />
            </div>
            <TrendBar
              snapshots={history}
              field="strain"
              max={21}
              colorFn={(v) => v > 14 ? "bg-red-400/60" : v > 8 ? "bg-orange-400/60" : "bg-blue-400/60"}
            />
          </div>
        </div>
      )}

      {/* Recovery Recommendation */}
      {latest && (() => {
        const score = latest.recovery_score ?? 50;
        const isGreen = score >= 67;
        const isYellow = score >= 34 && score < 67;
        const strainTarget = isGreen ? "14-18 (High)" : isYellow ? "8-14 (Moderate)" : "4-8 (Light)";
        const recommendation = isGreen
          ? "Recovery is strong \u2014 push for a hard workout and tackle complex problems."
          : isYellow
            ? "Moderate recovery \u2014 steady-state cardio, focused deep work."
            : "Low recovery \u2014 prioritize rest, NSDR, light movement only.";
        const c = RECOVERY_COLORS[getRecoveryColor(score)];

        return (
          <div className={`rounded-xl border ${c.border} ${c.bg} p-4 flex items-center justify-between gap-4`}>
            <div className="flex items-center gap-3 min-w-0">
              <Target className={`w-5 h-5 ${c.text} shrink-0`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{isGreen ? "Go Hard" : isYellow ? "Stay Steady" : "Recover"}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} ring-1 ${c.ring}`}>
                    Strain {strainTarget}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">{recommendation}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Protocol Reminders */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Huberman Protocol</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { icon: Sun, label: "Morning Sunlight", time: "Within 30min of waking", color: "text-amber-400" },
            { icon: Wind, label: "Caffeine Delay", time: "2h after waking", color: "text-emerald" },
            { icon: Battery, label: "NSDR / Yoga Nidra", time: "~2:00 PM", color: "text-violet-400" },
            { icon: BedDouble, label: "Supplements", time: "Before bed", color: "text-blue-400" },
            { icon: Moon, label: "Screen Cutoff", time: "12:30 AM", color: "text-orange-400" },
            { icon: Activity, label: "Ultradian Cycles", time: "90min work / 15min rest", color: "text-cyan-400" },
          ].map(({ icon: Icon, label, time, color }) => (
            <div key={label} className="flex items-start gap-2 rounded-lg bg-background/40 p-2.5">
              <Icon className={`w-4 h-4 mt-0.5 ${color} shrink-0`} />
              <div>
                <div className="text-xs font-medium">{label}</div>
                <div className="text-[10px] text-muted">{time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Activity Feed */}
      {(todayEvents.length > 0 || todayRuns.length > 0) && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Today&apos;s Activity</span>
            </div>
            <span className="text-[10px] text-muted tabular-nums">
              {todayEvents.length} events &middot; {todayRuns.length} runs
            </span>
          </div>

          {/* Service runs summary */}
          {todayRuns.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(() => {
                const byService: Record<string, { count: number; ok: number }> = {};
                for (const r of todayRuns) {
                  const svc = r.service.replace(/--.*/, "");
                  if (!byService[svc]) byService[svc] = { count: 0, ok: 0 };
                  byService[svc].count++;
                  if (r.status === "success") byService[svc].ok++;
                }
                return Object.entries(byService).map(([svc, { count, ok }]) => (
                  <div key={svc} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/60 text-[10px]">
                    <div className={`w-1.5 h-1.5 rounded-full ${ok === count ? "bg-emerald" : "bg-amber"}`} />
                    <span className="font-medium">{svc}</span>
                    <span className="text-muted">{ok}/{count}</span>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Events by type summary */}
          {todayEvents.length > 0 && (
            <div className="space-y-1">
              {(() => {
                const byType: Record<string, number> = {};
                for (const e of todayEvents) {
                  byType[e.type] = (byType[e.type] || 0) + 1;
                }
                return Object.entries(byType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between py-1">
                      <span className="text-xs text-muted">{type.replace(/_/g, " ")}</span>
                      <span className="text-xs tabular-nums font-medium">{count}</span>
                    </div>
                  ));
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
