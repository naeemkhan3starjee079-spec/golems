# Phase 3: Service Monitoring Upgrade

> [Back to main plan](../README.md)

## Goal
Make the ops page a comprehensive service monitoring center — detailed service status, schedules, error history, and log tailing.

## Tools
- **Research:** gemini — best dashboard patterns for service monitoring
- **Code:** cursor/opus — dashboard components
- **MCPs:** supabase (service_runs, golem_events, service_heartbeats)

## Steps

1. **Add service schedule display** — Show each service's cron schedule alongside status (e.g., "emailgolem: hourly 6am-7pm, last ran 5m ago").
2. **Add error history panel** — Show recent failed runs with error messages, expandable for full details.
3. **Consolidate email service names** — `emailgolem`, `emailgolem--initial-`, `emailgolem--night-` should display as one service "Email Golem" with sub-labels for schedule variants.
4. **Add Railway health check** — Ping Railway `/health` endpoint and show cloud worker status (uptime, backend, last deploy).
5. **Add local service status** — Query launchd service status and display (Telegram bot, Ollama, enrichment, Night Shift). Requires a small API endpoint or periodic sync to Supabase.
6. **Improve event timeline** — Add event type filters, actor filters, expand data payload on click. Show event counts per actor in header.
7. **Add uptime/availability chart** — Simple timeline showing when each service was active in the last 24h/7d.

## Depends On
- Nothing (standalone, but benefits from Phase 2 enrichment data)

## Status
- [ ] Service schedule display
- [ ] Error history panel
- [ ] Consolidate email variants
- [ ] Railway health check
- [ ] Local service status
- [ ] Event timeline improvements
- [ ] Uptime chart
