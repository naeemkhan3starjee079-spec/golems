---
sidebar_position: 4
---

# TellerGolem (Planned)

TellerGolem is the finance domain expert. It manages subscriptions, tracks payments, and generates spending reports. Currently in early stages — routed emails are being collected, but the standalone golem is not yet built.

## Vision

TellerGolem will be a domain expert focused on financial tracking and insights:

```
EmailGolem                    Standalone TellerGolem
(Stripe, Paddle emails)       (reporting, alerts)
    ↓                              ↓
   route                      monthly reports
    ├──→ /expenses            payment failures
    ├──→ /subscriptions       tax summaries
    └──→ /forecast            budget alerts
```

## Current Status

### Phase 1 ✓ Complete

EmailGolem routes subscription emails to TellerGolem:

```typescript
// email-golem/router.ts
if (isSubscriptionEmail(email)) {
  return {
    routing_golem: 'tellergolem',
    email_id: email.id,
    category: determineCategory(email)  // 'stripe', 'paddle', 'saas', etc
  };
}
```

**Routing rules:**
- Sender domain contains: `stripe.com`, `paddle.com`, `chargebee.com`, `paddle.shop`
- Subject keywords: `invoice`, `receipt`, `subscription`, `billing`, `charge`
- Body patterns: recurring billing confirmation

**Stored in database:**
```sql
CREATE TABLE emails (
  -- ... other fields
  routing_golem TEXT,  -- 'tellergolem' for finance emails
  category TEXT        -- 'stripe', 'paddle', 'saas_subscription', etc
);
```

### Phase 2 🏗️ Not Started

Planned features (in priority order):

1. **Subscription Ledger**
   - Track active subscriptions by service
   - Cost per month, annual cost, renewal dates
   - Planned: merge with existing expense tracker

2. **Payment Failure Alerts**
   - Monitor for failed/declined charge notifications
   - Trigger immediate Telegram alert
   - Suggest recovery actions (update card, contact support)

3. **Monthly Expense Report**
   - Aggregate all subscriptions and one-time payments
   - Category breakdown (tools, services, cloud, etc)
   - Trends: month-over-month growth, per-category cost

4. **Tax Summaries**
   - Categorize expenses as deductible/non-deductible
   - Annual expense report for accountant
   - Integration with accounting software (planned)

5. **Budget Forecasting**
   - Alert if monthly spend exceeds threshold
   - Identify unused subscriptions (no usage in 30d)
   - Recommend cancellations

## Planned Files

```
src/teller-golem/
├── index.ts                 -- Main orchestrator
├── subscription-ledger.ts   -- Subscription tracking
├── payment-failures.ts      -- Alert on declined charges
├── expense-report.ts        -- Monthly/annual reports
├── tax-categorization.ts    -- Deductible expense tagging
└── forecast.ts              -- Budget alerts & trends
```

## Planned Database Schema

```sql
-- Subscriptions
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  service_name TEXT,
  cost_per_period DECIMAL,
  period TEXT,  -- 'monthly', 'annual', 'lifetime'
  renewal_date DATE,
  status TEXT,  -- 'active', 'paused', 'cancelled'
  category TEXT,  -- 'tool', 'saas', 'cloud', 'media', 'other'
  added_at TIMESTAMP,
  last_renewed_at TIMESTAMP,
  next_renewal_at TIMESTAMP
);

-- Payment events (from emails)
CREATE TABLE payment_events (
  id TEXT PRIMARY KEY,
  email_id TEXT,
  service_name TEXT,
  amount DECIMAL,
  currency TEXT,
  status TEXT,  -- 'charged', 'failed', 'refunded'
  event_type TEXT,  -- 'charge', 'refund', 'dispute'
  event_date TIMESTAMP,
  processed_at TIMESTAMP
);

-- Expense categories (user-defined)
CREATE TABLE expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT,
  is_deductible BOOLEAN,
  services TEXT[]  -- ['stripe', 'paddle', 'aws', etc]
);

-- Monthly reports (cached)
CREATE TABLE monthly_reports (
  id TEXT PRIMARY KEY,
  month TEXT,  -- 'YYYY-MM'
  total_spent DECIMAL,
  by_category JSONB,
  generated_at TIMESTAMP
);
```

## Telegram Commands (Planned)

```
/expenses               -- Show this month's spending
/subscriptions         -- List all active subscriptions
/expense-report YYYY-MM -- View specific month
/budget-alert <amount> -- Set spending threshold
/unused               -- Identify unused subscriptions
/forecast            -- Next 3 months projection
```

Example output:

```
💰 Monthly Expenses (Feb 2026)

Stripe & Payments: $350
  ↳ Paddle.com: $79.99 (Domica)
  ↳ Anthropic: $270 (API usage)

SaaS Tools: $220
  ↳ Vercel: $20
  ↳ Supabase: $150
  ↳ Linear: $50

Cloud: $180
  ↳ Railway: $180

Total: $750/month
YoY: +5% vs last Feb
```

## Integration Points

- **EmailGolem** — Routes subscription emails to TellerGolem
- **Telegram Bot** — `/expenses`, `/subscriptions` commands
- **Event Logger** — Logs payment events for audit trail
- **Zikaron** — Semantic search for past payment discussions

## Architecture Notes

### Why Separate Golem?

TellerGolem is a **domain expert** focused on financial knowledge, not just a routing destination. It will:

- Know which services are "essential" vs "nice-to-have"
- Identify cost-saving opportunities
- Provide tax advice based on expense category
- Forecast budget impacts of new subscriptions

This is different from EmailGolem just forwarding subscription emails — TellerGolem *reasons* about finances.

### Planned LLM Integration

Use Haiku for:
- Categorizing new expenses (auto-tag deductible)
- Detecting suspicious charge patterns
- Generating budget recommendations
- Writing monthly executive summary

Example:
```typescript
// tax-categorization.ts
const category = await haikuClassify({
  service: email.service_name,
  description: email.description,
  amount: email.amount,
  categories: ['tools', 'cloud', 'advertising', 'professional-services', 'other']
});
```

## Roadmap

| Phase | Timeline | Scope |
|-------|----------|-------|
| Phase 1 ✓ | Q1 2026 | Email routing, database schema |
| Phase 2 | Q2 2026 | Subscription ledger, monthly reports |
| Phase 3 | Q3 2026 | Tax categorization, budget forecasting |
| Phase 4 | Q4 2026 | Accounting software integration, API |

## Getting Started (When Implemented)

```bash
cd packages/autonomous

# View routed emails
bun src/teller-golem/index.ts --list-emails

# Generate monthly report
bun src/teller-golem/expense-report.ts --month 2026-02

# Categorize expenses
bun src/teller-golem/tax-categorization.ts --auto-tag
```

## Contributing

TellerGolem is designed to be extended by:

1. **Adding new email patterns** — Detect more subscription services
2. **Integrating accounting tools** — Sync to QuickBooks, Wave, etc
3. **Building forecasts** — ML-based budget prediction
4. **Reporting** — Generate tax documents, investor reports

See `/docs/contributing.md` for guidance on extending Golems.

## FAQ

**Q: How is TellerGolem different from a spreadsheet?**
A: It proactively monitors for issues (failed charges, unused services), categorizes automatically, and integrates with the broader Golems ecosystem. Plus, you get insights via Telegram chat.

**Q: Can TellerGolem integrate with my bank?**
A: Planned for Phase 4. Will support Plaid API for direct bank feeds.

**Q: What about multi-currency?**
A: Subscriptions use their native currency. Monthly reports normalize to USD (or configurable base currency) using real-time rates.

**Q: Will it share data with tax software?**
A: Yes, Phase 3+ will export to TurboTax, Wave, or similar.

---

**Status:** Early planning. Email routing live in Phase 1. Awaiting Phase 2 implementation.

See `docs.local/planning/` for detailed architecture notes.
