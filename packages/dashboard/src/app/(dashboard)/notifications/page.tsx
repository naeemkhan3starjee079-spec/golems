"use client";

import {
  AlertTriangle, Bell, BellRing, Briefcase, CheckCircle, ChevronDown,
  ChevronRight, Mail, Moon, Newspaper, Send, GitPullRequest,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchNotificationEvents } from "@/lib/supabase/queries";
import { timeAgo } from "@/lib/format";
import type { NotifEvent, Severity } from "@/lib/types";


// --- Config ---

const NOTIF_CONFIG: Record<string, { label: string; icon: typeof Bell; severity: Severity; color: string }> = {
  email_urgent: { label: "Urgent Email", icon: Mail, severity: "urgent", color: "text-rose" },
  service_error: { label: "Service Error", icon: AlertTriangle, severity: "urgent", color: "text-rose" },
  alert: { label: "Alert", icon: BellRing, severity: "urgent", color: "text-rose" },
  service_recovered: { label: "Service Recovered", icon: CheckCircle, severity: "success", color: "text-emerald" },
  job_match: { label: "Job Match", icon: Briefcase, severity: "success", color: "text-emerald" },
  job_applied: { label: "Application Sent", icon: Send, severity: "success", color: "text-emerald" },
  nightshift_started: { label: "Night Shift Started", icon: Moon, severity: "info", color: "text-indigo-400" },
  nightshift_completed: { label: "Night Shift Done", icon: Moon, severity: "info", color: "text-indigo-400" },
  nightshift_pr: { label: "Night Shift PR", icon: GitPullRequest, severity: "info", color: "text-indigo-400" },
  briefing_sent: { label: "Briefing Sent", icon: Newspaper, severity: "info", color: "text-accent" },
  email_triaged: { label: "Email Triaged", icon: Mail, severity: "info", color: "text-muted" },
};

function getConfig(type: string) {
  return NOTIF_CONFIG[type] ?? { label: type.replace(/_/g, " "), icon: Bell, severity: "info" as const, color: "text-muted" };
}

const SEVERITY_COLORS: Record<Severity, { dot: string; ring: string; bg: string }> = {
  urgent: { dot: "bg-rose", ring: "ring-rose/30", bg: "bg-rose/5" },
  success: { dot: "bg-emerald", ring: "ring-emerald/30", bg: "bg-emerald/5" },
  info: { dot: "bg-accent", ring: "ring-accent/20", bg: "bg-accent/5" },
};

// --- Helpers ---

function getDetail(ev: NotifEvent): string {
  const d = ev.data;
  if (d.subject) return String(d.subject);
  if (d.company && d.role) return `${d.company} — ${d.role}`;
  if (d.company) return String(d.company);
  if (d.reason) return String(d.reason);
  if (d.title) return String(d.title);
  if (d.message) return String(d.message);
  return "";
}

// --- Page ---

export default function NotificationsPage() {
  const [events, setEvents] = useState<NotifEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      const data = await fetchNotificationEvents(100);
      if (id !== fetchIdRef.current) return;
      setEvents(data as NotifEvent[]);
    } catch {
      // silent
    } finally {
      if (id === fetchIdRef.current) setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!loaded) return <PageSkeleton />;

  // Derived stats
  const now = Date.now();
  const last24h = events.filter((e) => now - new Date(e.created_at).getTime() < 24 * 60 * 60 * 1000);
  const urgentCount = events.filter((e) => getConfig(e.type).severity === "urgent").length;
  const types = [...new Set(events.map((e) => e.type))];

  // Filtered events
  const filtered = events.filter((e) => {
    if (severityFilter && getConfig(e.type).severity !== severityFilter) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    return true;
  });

  // Group by date
  const grouped: Record<string, NotifEvent[]> = {};
  for (const ev of filtered) {
    const day = new Date(ev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(ev);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          Notifications
        </h2>
        <button type="button" onClick={fetchAll} className="text-xs text-muted hover:text-foreground transition-colors">
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-2xl font-bold tabular-nums">{events.length}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Total</div>
        </div>
        <div className={`rounded-lg border p-4 ${urgentCount > 0 ? "border-rose/30 bg-rose/5" : "border-border bg-surface"}`}>
          <div className={`text-2xl font-bold tabular-nums ${urgentCount > 0 ? "text-rose" : ""}`}>{urgentCount}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Urgent</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-2xl font-bold tabular-nums">{last24h.length}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Last 24h</div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {/* Severity filters */}
        {(["urgent", "success", "info"] as Severity[]).map((sev) => {
          const count = events.filter((e) => getConfig(e.type).severity === sev).length;
          if (count === 0) return null;
          const active = severityFilter === sev;
          const colors = SEVERITY_COLORS[sev];
          return (
            <button
              key={sev}
              type="button"
              onClick={() => { setSeverityFilter(active ? null : sev); setTypeFilter(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                active
                  ? `${colors.bg} ring-1 ${colors.ring} text-foreground`
                  : "bg-surface text-muted hover:bg-surface-hover"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              {sev} ({count})
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-6 bg-border self-center" />

        {/* Type filters */}
        {types.map((type) => {
          const config = getConfig(type);
          const count = events.filter((e) => e.type === type).length;
          const active = typeFilter === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => { setTypeFilter(active ? null : type); setSeverityFilter(null); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all ${
                active
                  ? "bg-accent/10 ring-1 ring-accent/20 text-foreground"
                  : "bg-surface text-muted hover:bg-surface-hover"
              }`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No notifications{(severityFilter || typeFilter) ? " matching filters" : ""}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, dayEvents]) => (
            <div key={day}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{day}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted">{dayEvents.length}</span>
              </div>

              {/* Timeline items */}
              <div className="relative ml-3 pl-6 border-l border-border/60 space-y-0.5">
                {dayEvents.map((ev) => {
                  const config = getConfig(ev.type);
                  const sevColors = SEVERITY_COLORS[config.severity];
                  const Icon = config.icon;
                  const detail = getDetail(ev);
                  const expanded = expandedId === ev.id;
                  const hasData = ev.data && Object.keys(ev.data).length > 0;

                  return (
                    <div key={ev.id} className="relative">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[31px] top-3 w-2.5 h-2.5 rounded-full ${sevColors.dot} ring-2 ring-background`} />

                      <div
                        className={`rounded-lg p-3 transition-colors ${hasData ? "cursor-pointer hover:bg-surface-hover" : ""}`}
                        onClick={() => hasData && setExpandedId(expanded ? null : ev.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{config.label}</span>
                                <span className="text-[10px] text-muted">{ev.actor}</span>
                              </div>
                              {detail && (
                                <p className="text-[11px] text-muted truncate mt-0.5">{detail}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-muted/60">{timeAgo(ev.created_at)}</span>
                            {hasData && (
                              expanded
                                ? <ChevronDown className="w-3 h-3 text-muted/40" />
                                : <ChevronRight className="w-3 h-3 text-muted/40" />
                            )}
                          </div>
                        </div>

                        {/* Expanded data payload */}
                        {expanded && hasData && (
                          <div className="mt-2.5 ml-6.5 p-2.5 rounded bg-background/60 text-[10px] font-mono space-y-0.5 max-h-32 overflow-y-auto border border-border/40">
                            {Object.entries(ev.data).map(([k, v]) => (
                              <div key={k} className="flex gap-2">
                                <span className="text-accent shrink-0">{k}:</span>
                                <span className="text-muted truncate">{typeof v === "string" ? v : JSON.stringify(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
