# Phase 5: Ops Dashboard

> [Back to main plan](../README.md)

## Goal

Live service health monitoring. See at a glance: what's running, what's down, recent events, uptime history.

## Tools

- **Research:** Gemini — best dashboard UI patterns for service monitoring
- **Code:** Cursor for UI components, Opus for health check wiring
- **MCPs:** supabase (service events), railway (deployment status)

## Steps

1. Service cards: Telegram bot, Railway cloud worker, Ollama, Night Shift, Auto-Index
2. Each card shows: status (green/yellow/red), last heartbeat, uptime %, recent events
3. Health check endpoint calls (daemon `/health/services`)
4. Timeline view: recent events from Supabase `dashboard_events` table
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

- [ ] Service health cards
- [ ] Event timeline
- [ ] Token usage charts
- [ ] Enrichment stats panel
- [ ] Auto-refresh
- [ ] Quick actions
