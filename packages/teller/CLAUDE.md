# TellerGolem

> Financial tracking — subscription management, payment categorization, tax preparation, and spending alerts.

## Role

TellerGolem manages **all financial intelligence**: tracking subscriptions, categorizing payments, generating spending reports, alerting on anomalies, and preparing data for tax filing.

## Architecture

```text
packages/teller/
├── src/
│   ├── index.ts                 # getStatus() + main orchestration
│   ├── categorizer.ts           # Payment categorization (LLM-powered)
│   ├── alerts.ts                # Spending anomaly alerts
│   ├── report.ts                # Monthly/yearly spending reports
│   ├── db.ts                    # Supabase queries (subscriptions, payments)
│   └── types.ts                 # TellerGolem-specific types
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # This file
└── package.json                 # @golems/teller
```

## Dependencies

- `@golems/shared` — Supabase factory, event log, LLM, email infra

## Key Patterns

### Subscription Tracking
- Detects subscriptions from email receipts (Netflix, Spotify, iCloud, etc.)
- Tracks: service name, amount, currency, frequency (monthly/yearly), status
- Yearly subscriptions converted to monthly for unified reporting

### Payment Categorization
- Uses LLM (Haiku) to categorize payments from bank statements
- Categories: housing, transport, food, subscriptions, healthcare, etc.
- Supports US tax deduction identification (Schedule C)

### Spending Reports
- Monthly summary: total spend, by category, subscription total
- Yearly summary: tax-relevant deductions, subscription cost trends
- Anomaly alerts: unusual charges, failed payments, price increases

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `subscriptions` | Active service subscriptions |
| `payments` | Payment events linked to subscriptions |
| `emails` (filtered) | Subscription-category emails routed from EmailGolem |

## Email Routing

Emails categorized as `subscription` are routed to TellerGolem by the email router.
