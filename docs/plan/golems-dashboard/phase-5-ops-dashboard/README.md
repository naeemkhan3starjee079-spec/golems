# Phase 5: Ops Dashboard

> [Back to main plan](../README.md)

## Goal

Live service health monitoring, token tracking, enrichment progress. See at a glance what's running and what it costs.

## Tools

- **Research:** Gemini — best dashboard UI patterns for service monitoring
- **Code:** Cursor for UI components, Opus for health check wiring
- **MCPs:** supabase (service events), railway (deployment status)

## Steps

1. Service cards: Telegram bot, Railway cloud worker, Ollama, Night Shift, Auto-Index
2. Each card shows: status (green/yellow/red), last heartbeat, uptime %, recent events
3. Health check endpoint calls (daemon `/health/services`)
4. Timeline view: recent events from Supabase `golem_events` table
5. Token usage charts:
   - CC tokens in/out per day (bar chart)
   - Haiku API cost per day (line chart)
   - GLM local usage (enrichment throughput)
   - Per-project breakdown
6. Enrichment stats panel:
   - Zikaron: total chunks, enriched %, last run, chunks/day trend
   - Progress bar with estimated completion
7. Auto-refresh every 30s (or Supabase realtime subscription)
8. Quick actions: restart service, trigger enrichment, view logs

## Depends On

- Phase 2 (API endpoints)
- Phase 3 (frontend shell)

## Status

- [x] Service health cards (Core + Local services with PID-aware status)
- [x] Event timeline (golem_events from Supabase, actor/type/subject)
- [x] Token usage charts (daily cost/calls bar chart, period selector, model breakdown)
- [x] Enrichment stats panel (overall score, est. time, field coverage, project bars)
- [x] Auto-refresh (30s on all pages with RefreshCw spinner)
- [ ] Quick actions (deferred — restart/trigger from dashboard)

## What Was Built

### Daemon API Endpoints (packages/zikaron/src/zikaron/daemon.py)
- `GET /events/recent?limit=N` — golem events from Supabase
- `GET /stats/service-runs?limit=N` — service run history from Supabase
- `GET /stats/tokens?days=N` — refactored with `by_day` and `by_model` breakdowns
- Shared `_supabase_get()` + `_supabase_ssl_ctx()` helpers (certifi for macOS)
- Fixed launchd PID parsing: up/idle/error/not_loaded (not just up/down)
- Fixed Telegram bot health to verify PID, not just loaded status

### Ops Page (packages/dashboard/src/app/ops/page.tsx)
- Core services (remote) and Local services (launchd) split
- 30s auto-refresh with manual refresh button
- Event timeline with actor, type, subject, timeAgo
- Service run history with status, duration, errors
- Two-column responsive layout

### Tokens Page (packages/dashboard/src/app/tokens/page.tsx)
- Period selector (7d/14d/30d)
- Summary cards: total cost, avg/day, input tokens, output tokens
- Daily cost + calls bar chart with hover tooltips
- Model breakdown table sorted by cost
- Manual refresh button

### Enrichment Page (packages/dashboard/src/app/enrichment/page.tsx)
- Overview cards: total chunks, overall %, needs enrichment, est. time
- Color-coded progress bars (emerald/accent/amber by coverage)
- Shows remaining count per field
- Project breakdown with proportional bars and cleaned names
- 30s auto-refresh
