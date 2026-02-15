"use client";

import {
  AlertCircle, Calendar, CreditCard, DollarSign, Repeat, TrendingUp, Wallet,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchSubscriptions, fetchPayments } from "@/lib/supabase/queries";
import { timeAgo } from "@/lib/format";
import type { Subscription, Payment } from "@/lib/types";

// --- Helpers ---

function formatCurrency(amount: number, currency: string) {
  const sym = currency === "USD" ? "$" : currency === "ILS" ? "\u20AA" : currency === "EUR" ? "\u20AC" : "";
  return sym ? `${sym}${amount.toFixed(2)}` : `${amount.toFixed(2)} ${currency}`;
}

function getMonthlyAmount(sub: Subscription): number | null {
  if (sub.amount == null) return null;
  if (sub.frequency === "yearly") return sub.amount / 12;
  if (sub.frequency === "weekly") return sub.amount * 4.33;
  return sub.amount; // monthly or default
}

function getNextPaymentDate(sub: Subscription): Date | null {
  if (!sub.last_payment) return null;
  const last = new Date(sub.last_payment);
  if (sub.frequency === "yearly") {
    return new Date(last.getFullYear() + 1, last.getMonth(), last.getDate());
  }
  if (sub.frequency === "weekly") {
    const next = new Date(last);
    next.setDate(next.getDate() + 7);
    return next;
  }
  // Monthly: clamp to last day of next month to avoid overflow (Jan 31 → Feb 28, not Mar 3)
  const nextMonth = last.getMonth() + 1;
  const nextYear = last.getFullYear() + (nextMonth > 11 ? 1 : 0);
  const daysInNextMonth = new Date(nextYear, (nextMonth % 12) + 1, 0).getDate();
  const day = Math.min(last.getDate(), daysInNextMonth);
  return new Date(nextYear, nextMonth % 12, day);
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getFrequencyLabel(freq: string | null) {
  if (!freq) return "";
  return freq === "yearly" ? "/yr" : freq === "weekly" ? "/wk" : "/mo";
}

// Smart categorization by service name pattern matching
const CATEGORY_RULES: { pattern: RegExp; label: string; color: string }[] = [
  // Entertainment
  { pattern: /spotify|netflix|youtube|disney|hulu|apple\s*music|hbo|paramount|peacock|crunchyroll|deezer|tidal/i, label: "Entertainment", color: "text-emerald" },
  // Infrastructure / Cloud
  { pattern: /railway|vercel|aws|azure|gcp|google\s*cloud|heroku|render|fly\.io|supabase|planetscale|neon|cloudflare|digitalocean|linode/i, label: "Infrastructure", color: "text-cyan-400" },
  // Dev Tools
  { pattern: /github|gitlab|bitbucket|jetbrains|cursor|copilot|linear|jira|bugbot|sentry|datadog|axiom|sourcegraph|codeclimate|deepsource|coderabbit/i, label: "Dev Tools", color: "text-violet-400" },
  // AI / ML
  { pattern: /anthropic|openai|claude|replicate|hugging\s*face|cohere|mistral|together\.ai|fireworks|groq/i, label: "AI / ML", color: "text-amber" },
  // Communication
  { pattern: /slack|zoom|discord|teams/i, label: "Communication", color: "text-blue-400" },
  // Productivity
  { pattern: /1password|lastpass|bitwarden|grammarly|todoist|asana|monday|trello|airtable|zapier|make\.com|notion|obsidian|roam|craft/i, label: "Productivity", color: "text-rose-400" },
  // Design
  { pattern: /figma|canva|adobe|sketch|framer|webflow/i, label: "Design", color: "text-pink-400" },
];

function getCategory(name: string): { label: string; color: string } {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(name)) {
      return { label: rule.label, color: rule.color };
    }
  }
  return { label: "Other", color: "text-muted" };
}

// --- Page ---

export default function TellerPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      const [subData, payData] = await Promise.all([
        fetchSubscriptions(),
        fetchPayments(50),
      ]);
      if (id !== fetchIdRef.current) return;
      setSubs(subData as Subscription[]);
      setPayments(payData as Payment[]);
    } catch {
      // silent
    } finally {
      if (id === fetchIdRef.current) setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!loaded) return <PageSkeleton />;

  const activeSubs = subs.filter((s) => s.status === "active");
  const incompleteSubs = activeSubs.filter((s) => s.amount == null || s.frequency == null);

  // Monthly/yearly totals per currency
  const monthlyCosts: Record<string, number> = {};
  for (const s of activeSubs) {
    const monthly = getMonthlyAmount(s);
    if (monthly == null) continue;
    const cur = s.currency ?? "USD";
    monthlyCosts[cur] = (monthlyCosts[cur] || 0) + monthly;
  }
  const primaryCurrency = Object.keys(monthlyCosts)[0] ?? "USD";
  const monthlyTotal = monthlyCosts[primaryCurrency] ?? 0;
  const yearlyTotal = monthlyTotal * 12;
  const trackedPct = activeSubs.length > 0
    ? Math.round(((activeSubs.length - incompleteSubs.length) / activeSubs.length) * 100)
    : 0;

  // Upcoming payments sorted
  const upcoming = activeSubs
    .map((s) => ({ sub: s, next: getNextPaymentDate(s) }))
    .filter((u): u is { sub: Subscription; next: Date } => u.next !== null)
    .sort((a, b) => a.next.getTime() - b.next.getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent" />
          Teller
        </h2>
        <button type="button" onClick={fetchAll} className="text-xs text-muted hover:text-foreground transition-colors">
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-2xl font-bold tabular-nums">{activeSubs.length}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Active Subs</div>
        </div>
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
          <div className="text-2xl font-bold tabular-nums text-accent">
            {formatCurrency(monthlyTotal, primaryCurrency)}
          </div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Monthly</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-muted" />
            <span className="text-2xl font-bold tabular-nums">
              {formatCurrency(yearlyTotal, primaryCurrency)}
            </span>
          </div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Yearly Projection</div>
        </div>
        <div className={`rounded-lg border p-4 ${trackedPct < 100 ? "border-amber-500/30 bg-amber-500/5" : "border-emerald/30 bg-emerald/5"}`}>
          <div className={`text-2xl font-bold tabular-nums ${trackedPct < 100 ? "text-amber-400" : "text-emerald"}`}>
            {trackedPct}%
          </div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Data Complete</div>
        </div>
      </div>

      {/* Incomplete data warning */}
      {incompleteSubs.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-muted">
            <span className="font-medium text-amber-400">{incompleteSubs.length} subscription{incompleteSubs.length > 1 ? "s" : ""}</span>
            {" "}missing amount or frequency:{" "}
            {incompleteSubs.map((s) => s.service_name).join(", ")}.
            {" "}Totals may be incomplete.
          </div>
        </div>
      )}

      {/* Upcoming Payments */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Upcoming Payments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {upcoming.map(({ sub, next }) => {
              const days = daysUntil(next);
              const isPast = days < 0;
              const isSoon = days >= 0 && days <= 3;
              return (
                <div key={sub.id} className={`rounded-lg border px-3 py-2.5 flex items-center justify-between ${
                  isPast ? "border-rose/30 bg-rose/5" : isSoon ? "border-amber-500/30 bg-amber-500/5" : "border-border/60 bg-surface/50"
                }`}>
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-3.5 h-3.5 ${isPast ? "text-rose" : isSoon ? "text-amber-400" : "text-muted"}`} />
                    <span className="text-xs font-medium">{sub.service_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.amount != null && (
                      <span className="text-xs tabular-nums font-medium">
                        {formatCurrency(sub.amount, sub.currency ?? "USD")}
                      </span>
                    )}
                    <span className={`text-[10px] tabular-nums ${isPast ? "text-rose font-medium" : isSoon ? "text-amber-400" : "text-muted"}`}>
                      {isPast ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subscriptions */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Subscriptions</h3>
        {subs.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No subscriptions tracked</p>
          </div>
        ) : (
          <div className="space-y-2">
            {subs.map((sub) => {
              const monthly = getMonthlyAmount(sub);
              const category = getCategory(sub.service_name);
              return (
                <div key={sub.id} className="rounded-lg border border-border/60 bg-surface/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Repeat className={`w-4 h-4 ${sub.status === "active" ? "text-emerald" : "text-muted/40"}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{sub.service_name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-surface ${category.color}`}>
                            {category.label}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted flex items-center gap-2 mt-0.5">
                          {sub.frequency ? (
                            <span className="capitalize">{sub.frequency}</span>
                          ) : (
                            <span className="text-amber-400">Frequency unknown</span>
                          )}
                          {sub.last_payment && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              Last: {timeAgo(sub.last_payment)}
                            </span>
                          )}
                          {sub.first_seen && (
                            <span>Tracked since {new Date(sub.first_seen).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {sub.amount != null ? (
                        <div className="text-right">
                          <span className="text-sm font-bold tabular-nums flex items-center gap-0.5">
                            <DollarSign className="w-3.5 h-3.5 text-muted" />
                            {formatCurrency(sub.amount, sub.currency ?? "USD")}
                            <span className="text-[10px] text-muted font-normal">
                              {getFrequencyLabel(sub.frequency)}
                            </span>
                          </span>
                          {monthly != null && sub.frequency !== "monthly" && (
                            <div className="text-[9px] text-muted tabular-nums">
                              ~{formatCurrency(monthly, sub.currency ?? "USD")}/mo
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          No amount
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        sub.status === "active"
                          ? "bg-emerald/10 text-emerald"
                          : "bg-muted/10 text-muted"
                      }`}>
                        {sub.status ?? "unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Payments */}
      {payments.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Payment History</h3>
          <div className="space-y-1">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-surface/30 px-3 py-2 text-[11px]">
                <div className="flex items-center gap-2 text-muted">
                  <DollarSign className="w-3 h-3" />
                  <span className="font-medium text-foreground tabular-nums">
                    {payment.amount != null ? formatCurrency(payment.amount, payment.currency ?? "USD") : "N/A"}
                  </span>
                </div>
                {payment.paid_at && (
                  <span className="text-muted/60 tabular-nums">
                    {new Date(payment.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" \u00B7 "}
                    {timeAgo(payment.paid_at)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
