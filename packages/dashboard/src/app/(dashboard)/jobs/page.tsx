"use client";

import {
  Briefcase, ChevronDown, ChevronRight, ExternalLink, Filter,
  Hash, MapPin, Search, Star, TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchJobs, fetchJobStats, fetchScrapeActivity } from "@/lib/supabase/queries";
import { timeAgo } from "@/lib/format";

// --- Types ---

type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  status: string | null;
  match_score: number | null;
  tags: string[] | null;
  match_reasons: string[] | null;
  scraped_at: string;
  applied_at: string | null;
  created_at: string;
};

type ScrapeRun = {
  id: string;
  source: string;
  run_at: string;
  total_found: number;
  new_saved: number;
  duplicates_skipped: number;
  errors: number;
  duration_ms: number | null;
};

type JobStats = {
  total: number;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
  avg_score: number | null;
};

// --- Config ---

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "bg-accent/10", text: "text-accent" },
  viewed: { bg: "bg-muted/10", text: "text-muted" },
  saved: { bg: "bg-amber/10", text: "text-amber" },
  applied: { bg: "bg-emerald/10", text: "text-emerald" },
  rejected: { bg: "bg-rose/10", text: "text-rose" },
  archived: { bg: "bg-muted/10", text: "text-muted/60" },
};

function getStatusStyle(status: string | null) {
  return STATUS_COLORS[status ?? "new"] ?? STATUS_COLORS.new;
}

// --- Page ---

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [scrapes, setScrapes] = useState<ScrapeRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showScrapes, setShowScrapes] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      const [jobData, statsData, scrapeData] = await Promise.all([
        fetchJobs(200),
        fetchJobStats(),
        fetchScrapeActivity(20),
      ]);
      if (id !== fetchIdRef.current) return;
      setJobs(jobData as Job[]);
      setStats(statsData);
      setScrapes(scrapeData as ScrapeRun[]);
    } catch {
      // silent
    } finally {
      if (id === fetchIdRef.current) setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!loaded) return <PageSkeleton />;

  // Filtered jobs
  const filtered = jobs.filter((j) => {
    if (statusFilter && (j.status ?? "new") !== statusFilter) return false;
    if (sourceFilter && j.source !== sourceFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q);
    }
    return true;
  });

  const sources = [...new Set(jobs.map((j) => j.source))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-accent" />
          Jobs
        </h2>
        <button type="button" onClick={fetchAll} className="text-xs text-muted hover:text-foreground transition-colors">
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-2xl font-bold tabular-nums">{stats.total}</div>
            <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Total Jobs</div>
          </div>
          <div className="rounded-lg border border-emerald/30 bg-emerald/5 p-4">
            <div className="text-2xl font-bold tabular-nums text-emerald">{stats.by_status.applied ?? 0}</div>
            <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Applied</div>
          </div>
          <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
            <div className="text-2xl font-bold tabular-nums text-amber">{stats.by_status.saved ?? 0}</div>
            <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Saved</div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-2xl font-bold tabular-nums">
              {stats.avg_score != null ? stats.avg_score.toFixed(1) : "—"}
            </div>
            <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Avg Score</div>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs by title or company..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Status filters */}
          {Object.entries(stats?.by_status ?? {}).map(([status, count]) => {
            const active = statusFilter === status;
            const style = getStatusStyle(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => { setStatusFilter(active ? null : status); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active
                    ? `${style.bg} ring-1 ring-accent/20 ${style.text}`
                    : "bg-surface text-muted hover:bg-surface-hover"
                }`}
              >
                {status} ({count})
              </button>
            );
          })}

          {sources.length > 1 && <div className="w-px h-6 bg-border self-center" />}

          {/* Source filters */}
          {sources.map((source) => {
            const count = stats?.by_source[source] ?? 0;
            const active = sourceFilter === source;
            return (
              <button
                key={source}
                type="button"
                onClick={() => { setSourceFilter(active ? null : source); setStatusFilter(null); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all ${
                  active
                    ? "bg-accent/10 ring-1 ring-accent/20 text-foreground"
                    : "bg-surface text-muted hover:bg-surface-hover"
                }`}
              >
                {source} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Job List */}
      <div className="space-y-2">
        <div className="text-[10px] text-muted uppercase tracking-widest mb-2">
          {filtered.length} job{filtered.length !== 1 ? "s" : ""}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No jobs matching filters</p>
          </div>
        ) : (
          filtered.map((job) => {
            const expanded = expandedId === job.id;
            const style = getStatusStyle(job.status);

            return (
              <div
                key={job.id}
                className="rounded-lg border border-border/60 bg-surface/50 hover:bg-surface-hover transition-colors"
              >
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : job.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{job.title}</span>
                        {job.match_score != null && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            job.match_score >= 7 ? "bg-emerald/10 text-emerald" :
                            job.match_score >= 4 ? "bg-amber/10 text-amber" :
                            "bg-muted/10 text-muted"
                          }`}>
                            <Star className="w-2.5 h-2.5 inline mr-0.5" />
                            {job.match_score}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted">
                        <span className="font-medium text-foreground/80">{job.company}</span>
                        {job.location && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                        )}
                        <span>{job.source}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {job.status ?? "new"}
                      </span>
                      <span className="text-[10px] text-muted/60">{timeAgo(job.created_at)}</span>
                      {expanded ? <ChevronDown className="w-3 h-3 text-muted/40" /> : <ChevronRight className="w-3 h-3 text-muted/40" />}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="px-3 pb-3 pt-0 space-y-2">
                    <div className="h-px bg-border/40" />

                    {(job.tags?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {job.tags?.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-accent/5 text-accent/80 flex items-center gap-0.5">
                            <Hash className="w-2.5 h-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {(job.match_reasons?.length ?? 0) > 0 && (
                      <div className="text-[10px] text-muted space-y-0.5">
                        {job.match_reasons?.map((reason, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <TrendingUp className="w-3 h-3 text-emerald shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-muted">
                      <span>Scraped {timeAgo(job.scraped_at)}</span>
                      {job.applied_at && <span className="text-emerald">Applied {timeAgo(job.applied_at)}</span>}
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent/80 flex items-center gap-0.5 ml-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View listing <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Scrape Activity */}
      <div>
        <button
          type="button"
          onClick={() => setShowScrapes(!showScrapes)}
          className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors mb-3"
        >
          {showScrapes ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Filter className="w-4 h-4" />
          Scrape Activity
        </button>

        {showScrapes && (
          <div className="space-y-1.5">
            {scrapes.map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-surface/30 px-3 py-2 text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground/80 w-24 truncate">{run.source}</span>
                  <span className="text-emerald">+{run.new_saved}</span>
                  <span className="text-muted">{run.total_found} found</span>
                  {run.errors > 0 && <span className="text-rose">{run.errors} err</span>}
                </div>
                <div className="flex items-center gap-3 text-muted">
                  {run.duration_ms != null && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                  <span>{timeAgo(run.run_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
