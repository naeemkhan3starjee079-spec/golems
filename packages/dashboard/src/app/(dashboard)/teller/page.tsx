"use client";

import {
  Calendar, CreditCard, DollarSign, Repeat, Wallet,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { fetchSubscriptions, fetchPayments } from "@/lib/supabase/queries";
import { timeAgo } from "@/lib/format";
import type { Subscription, Payment } from "@/lib/types";

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
        fetchPayments(20),
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
  // Group by currency to avoid mixing different currencies
  const monthlyCosts: Record<string, number> = {};
  for (const s of activeSubs) {
    if (!s.amount) continue;
    const cur = s.currency ?? "USD";
    const monthly = s.frequency === "yearly" ? s.amount / 12 : s.amount;
    monthlyCosts[cur] = (monthlyCosts[cur] || 0) + monthly;
  }
  const primaryCurrency = Object.keys(monthlyCosts)[0] ?? "USD";
  const monthlyTotal = monthlyCosts[primaryCurrency] ?? 0;

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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-2xl font-bold tabular-nums">{activeSubs.length}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Active Subs</div>
        </div>
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
          <div className="text-2xl font-bold tabular-nums text-accent">
            {primaryCurrency === "USD" ? "$" : ""}{monthlyTotal.toFixed(0)}
            {primaryCurrency !== "USD" && <span className="text-sm ml-1">{primaryCurrency}</span>}
          </div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Monthly Cost</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-2xl font-bold tabular-nums">{payments.length}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Payments</div>
        </div>
      </div>

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
            {subs.map((sub) => (
              <div key={sub.id} className="rounded-lg border border-border/60 bg-surface/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Repeat className={`w-4 h-4 ${sub.status === "active" ? "text-emerald" : "text-muted/40"}`} />
                    <div>
                      <div className="text-sm font-medium">{sub.service_name}</div>
                      <div className="text-[10px] text-muted flex items-center gap-2 mt-0.5">
                        <span>{sub.frequency ?? "monthly"}</span>
                        {sub.last_payment && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            Last: {timeAgo(sub.last_payment)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {sub.amount != null && (
                      <span className="text-sm font-bold tabular-nums flex items-center gap-0.5">
                        <DollarSign className="w-3.5 h-3.5 text-muted" />
                        {sub.amount}
                        <span className="text-[10px] text-muted font-normal">
                          {sub.currency ?? "USD"}
                        </span>
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
            ))}
          </div>
        )}
      </div>

      {/* Recent Payments */}
      {payments.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Recent Payments</h3>
          <div className="space-y-1">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-surface/30 px-3 py-2 text-[11px]">
                <div className="flex items-center gap-2 text-muted">
                  <DollarSign className="w-3 h-3" />
                  <span className="font-medium text-foreground tabular-nums">
                    {payment.amount} {payment.currency ?? "USD"}
                  </span>
                </div>
                {payment.paid_at && (
                  <span className="text-muted/60">{timeAgo(payment.paid_at)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
