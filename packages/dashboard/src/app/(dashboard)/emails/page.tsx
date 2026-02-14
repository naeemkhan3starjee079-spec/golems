"use client";

import {
  AlertTriangle, ChevronDown, ChevronRight, Inbox, Mail,
  Search, Shield, ShoppingCart, Star, Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchEmails, fetchEmailStats, fetchEmailSenders } from "@/lib/supabase/queries";
import { timeAgo } from "@/lib/format";

// --- Types ---

type Email = {
  id: string;
  subject: string | null;
  from_address: string | null;
  snippet: string | null;
  score: number | null;
  category: string | null;
  received_at: string;
  human_score: number | null;
  human_category: string | null;
};

type EmailSender = {
  email_address: string;
  display_name: string | null;
  domain: string | null;
  category: string | null;
  total_emails: number;
  avg_score: number | null;
  user_action: string | null;
  last_email_at: string | null;
};

type EmailStats = {
  total: number;
  by_category: Record<string, number>;
  last_24h: number;
  urgent: number;
};

// --- Config ---

const CATEGORY_CONFIG: Record<string, { icon: typeof Mail; color: string }> = {
  personal: { icon: Users, color: "text-accent" },
  business: { icon: Mail, color: "text-emerald" },
  shopping: { icon: ShoppingCart, color: "text-amber" },
  newsletter: { icon: Inbox, color: "text-muted" },
  security: { icon: Shield, color: "text-rose" },
  spam: { icon: AlertTriangle, color: "text-rose/60" },
};

function getCategoryConfig(cat: string | null) {
  return CATEGORY_CONFIG[cat ?? ""] ?? { icon: Mail, color: "text-muted" };
}

// --- Page ---

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"emails" | "senders">("emails");
  const fetchIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      const [emailData, statsData, senderData] = await Promise.all([
        fetchEmails(100),
        fetchEmailStats(),
        fetchEmailSenders(50),
      ]);
      if (id !== fetchIdRef.current) return;
      setEmails(emailData as Email[]);
      setStats(statsData);
      setSenders(senderData as EmailSender[]);
    } catch {
      // silent
    } finally {
      if (id === fetchIdRef.current) setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!loaded) return <PageSkeleton />;

  const effectiveScore = (e: Email) => e.human_score ?? e.score ?? 0;
  const effectiveCategory = (e: Email) => e.human_category ?? e.category ?? "unknown";

  const filtered = emails.filter((e) => {
    if (categoryFilter && effectiveCategory(e) !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (e.subject?.toLowerCase().includes(q) || e.from_address?.toLowerCase().includes(q)) ?? false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="w-5 h-5 text-accent" />
          Emails
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
            <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Total</div>
          </div>
          <div className={`rounded-lg border p-4 ${stats.urgent > 0 ? "border-rose/30 bg-rose/5" : "border-border bg-surface"}`}>
            <div className={`text-2xl font-bold tabular-nums ${stats.urgent > 0 ? "text-rose" : ""}`}>{stats.urgent}</div>
            <div className="text-[10px] text-muted uppercase tracking-wider mt-1">High Priority</div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-2xl font-bold tabular-nums">{stats.last_24h}</div>
            <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Last 24h</div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-2xl font-bold tabular-nums">{senders.length}</div>
            <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Senders</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["emails", "senders"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t === "emails" ? "Emails" : "Senders"}
          </button>
        ))}
      </div>

      {tab === "emails" && (
        <>
          {/* Search + Category Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject or sender..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(stats?.by_category ?? {}).map(([cat, count]) => {
                const active = categoryFilter === cat;
                const config = getCategoryConfig(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(active ? null : cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? "bg-accent/10 ring-1 ring-accent/20 text-foreground"
                        : "bg-surface text-muted hover:bg-surface-hover"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email List */}
          <div className="space-y-1.5">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted">
                <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No emails matching filters</p>
              </div>
            ) : (
              filtered.map((email) => {
                const score = effectiveScore(email);
                const category = effectiveCategory(email);
                const config = getCategoryConfig(category);
                const Icon = config.icon;
                const expanded = expandedId === email.id;

                return (
                  <div
                    key={email.id}
                    className="rounded-lg border border-border/60 bg-surface/50 hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : email.id)}
                  >
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{email.subject ?? "(no subject)"}</div>
                            <div className="text-[11px] text-muted truncate mt-0.5">
                              {email.from_address}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            score >= 8 ? "bg-rose/10 text-rose" :
                            score >= 5 ? "bg-amber/10 text-amber" :
                            "bg-muted/10 text-muted"
                          }`}>
                            <Star className="w-2.5 h-2.5 inline mr-0.5" />
                            {score}
                          </span>
                          <span className="text-[10px] text-muted/60">{timeAgo(email.received_at)}</span>
                          {expanded ? <ChevronDown className="w-3 h-3 text-muted/40" /> : <ChevronRight className="w-3 h-3 text-muted/40" />}
                        </div>
                      </div>
                    </div>

                    {expanded && email.snippet && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="h-px bg-border/40 mb-2" />
                        <p className="text-[11px] text-muted leading-relaxed">{email.snippet}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted/60">
                          <span>{category}</span>
                          {email.human_score != null && (
                            <span className="text-accent">corrected: {email.human_score}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {tab === "senders" && (
        <div className="space-y-1.5">
          {senders.map((sender) => (
            <div key={sender.email_address} className="flex items-center justify-between rounded-lg border border-border/40 bg-surface/30 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {sender.display_name ?? sender.email_address}
                </div>
                <div className="text-[10px] text-muted truncate">
                  {sender.domain} · {sender.category ?? "normal"}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[11px]">
                <span className="text-muted tabular-nums">{sender.total_emails} emails</span>
                {sender.avg_score != null && (
                  <span className={`tabular-nums ${
                    Number(sender.avg_score) >= 7 ? "text-rose" :
                    Number(sender.avg_score) >= 4 ? "text-amber" :
                    "text-muted"
                  }`}>
                    avg {Number(sender.avg_score).toFixed(1)}
                  </span>
                )}
                {sender.user_action && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    sender.user_action === "block" ? "bg-rose/10 text-rose" :
                    sender.user_action === "allow" ? "bg-emerald/10 text-emerald" :
                    "bg-muted/10 text-muted"
                  }`}>
                    {sender.user_action}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
