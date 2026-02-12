# Phase: Axiom Full Observability

> [Back to main plan](../README.md)

## Goal

Full observability across all golems — every LLM call, email poll, job scrape, and error gets tracked. Feeds the etanheyman.com/admin dashboard and enables cost analysis, failure debugging, and usage trends.

## What We Already Have

| Component | Current State |
|-----------|--------------|
| `cost-tracker.ts` | Dual-write JSONL + Supabase `llm_usage` table |
| `cc-usage.ts` | CC subscription usage tracking (local script) |
| `llm_usage` table | 911 entries (email-golem, job-golem, email-scorer) |
| `config.ts` | Axiom scaffolding (`observability.enabled`, `axiomDataset`, `axiomToken`) |
| Vercel AI SDK | Already in `vercel-llm.ts` (Phase 4) |

## What We Want

1. **Every LLM call tracked** — Haiku API, GLM local, Gemini/Groq cloud, CC subscription
2. **Service health events** — email poll success/failure, job scrape results, NightShift runs
3. **Error tracking** — stack traces, failed API calls, timeouts
4. **Cost dashboard** — real-time cost by source/model/day on etanheyman.com/admin
5. **CC usage integration** — track local Claude Code session costs via the cc-usage script

## Architecture

```
                    ┌─────────────┐
                    │   Axiom.co  │ ← Free tier: 500MB/day
                    │  (cloud)    │
                    └──────▲──────┘
                           │ OTLP HTTP / axiom-js
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────┴──────┐  ┌─────┴──────┐  ┌──────┴──────┐
   │ Local Mac   │  │ Railway    │  │ CC Usage    │
   │ (Telegram,  │  │ (Email,    │  │ (sessions,  │
   │  NightShift)│  │  Jobs)     │  │  tokens)    │
   └─────────────┘  └────────────┘  └─────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Supabase   │ ← Existing llm_usage table
                    │ (backup)    │ ← Keep dual-write for dashboard
                    └─────────────┘
```

## Axiom Integration Options

### Option A: Axiom AI SDK (recommended for LLM calls)
- `axiom/ai` package wraps Vercel AI SDK models with `wrapAISDKModel()`
- Auto-traces every LLM call: model, tokens, latency, cost
- Works with our existing Vercel AI SDK integration
- **Best for:** LLM call tracking

### Option B: axiom-js (for general events)
- `@axiom/js` — lightweight TypeScript client for sending any structured events
- `axiom.ingest(dataset, events)` — batch send
- **Best for:** Service health, error tracking, custom events

### Option C: OpenTelemetry OTLP (heavyweight, skip for now)
- Full OTel SDK with OTLP exporter
- Overkill for our use case — we're not doing distributed tracing
- **Skip unless:** we need trace waterfall views

## Steps

### Setup
1. Create Axiom account at axiom.co (free tier)
2. Create dataset: `golems`
3. Create API token with Ingest permission
4. Store token in 1Password: `AXIOM_TOKEN`
5. Update `~/.golems/config.yaml`: `observability.enabled: true, axiomDataset: golems`

### LLM Call Tracking (@axiomhq/js — direct events)
6. Install `@axiomhq/js` package
7. Create `packages/shared/src/lib/axiom.ts` — singleton client + event types + fire-and-forget helpers
8. Add Axiom event logging to `cloud-llm.ts` (Haiku calls)
9. Add Axiom event logging to `glm-llm.ts` (local GLM calls)
10. Add Axiom event logging to `vercel-llm.ts` (Gemini/Groq calls)

### Service Health Events
12. Create `logServiceEvent()` helper in `axiom.ts`:
    - `{ service, event, status, duration_ms, metadata }`
13. Add to email poller: `logServiceEvent("email-golem", "poll", "success", duration, { count })`
14. Add to job scraper: `logServiceEvent("job-golem", "scrape", "success", duration, { jobs })`
15. Add to NightShift: `logServiceEvent("nightshift", "run", "success", duration, { repo })`
16. Add to Morning Briefing: `logServiceEvent("briefing", "generate", "success", duration)`

### Error Tracking
17. Create global error handler that sends to Axiom
18. Wire into existing try/catch blocks (non-blocking, fire-and-forget)

### CC Usage Integration
19. Modify `cc-usage.ts` to also send session data to Axiom
20. Track: model, tokens, duration, project, cost estimate

### Dashboard
21. Axiom provides built-in dashboards — create:
    - Daily cost by source
    - Error rate by service
    - LLM call latency distribution
    - Token usage trends
22. Optionally: embed Axiom dashboard in etanheyman.com/admin via iframe or API

### Config + Doctor
23. Update `golems doctor` to check Axiom connectivity
24. Update `golems wizard` to set up Axiom token

## Privacy

- **Local LLM calls (GLM):** Log metadata only (model, tokens, latency). NOT prompt content.
- **Cloud LLM calls:** Log metadata + sanitized prompt (subject line, not body).
- **Service events:** Log event type + metrics. NOT email content or personal data.
- **Axiom free tier:** Data retained for 30 days.

## Depends On

- Phase 4 (Vercel AI SDK — done)
- Cost tracker (already exists — done)

## Status

- [x] Create Axiom account + dataset + token (user creating — dataset: "golems", event logs, 30d)
- [x] Install axiom package (`@axiomhq/js@1.4.0`)
- [x] Create axiom.ts singleton (event types: LLMCall, Service, Error, CCUsage)
- [ ] ~~Wrap Vercel AI SDK models~~ (skipped — using direct event logging instead of wrapAISDKModel)
- [x] Add to cloud-llm.ts (Haiku) — logLLMCall + logError
- [x] Add to glm-llm.ts (local GLM) — logLLMCall + logError + timing
- [x] Add to vercel-llm.ts (Gemini/Groq) — logLLMCall + logError + timing
- [x] Service health events — cloud-worker safeRun() sends logServiceEvent + logError
- [x] Error tracking — wired into all LLM backends + cloud-worker
- [x] CC usage integration (`bun scripts/cc-usage.ts --send-axiom`)
- [ ] Dashboard setup (Axiom built-in dashboards)
- [x] Doctor check (Axiom config verification)
- [ ] Wizard setup (Axiom token entry)
- [ ] Set AXIOM_TOKEN env var (waiting for user to create token)
