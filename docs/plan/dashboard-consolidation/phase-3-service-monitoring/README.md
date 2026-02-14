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
4. **Add Railway health check** — Derive Railway status from cloud service activity (if last cloud run <3h ago = active). Direct CORS ping not possible from Vercel.
5. **Add local service status** — Derived from existing data: enrichment from enrichment_stats, Night Shift from service_runs. Direct launchd querying not possible from Vercel.
6. **Improve event timeline** — Add event type filters, actor filters, expand data payload on click. Show event counts per actor in header.
7. **Add uptime/availability chart** — 24h hourly timeline bars showing when each service was active.

## Depends On
- Nothing (standalone, but benefits from Phase 2 enrichment data)

## Status
- [x] Service schedule display (SERVICE_CONFIG with schedules, env badges)
- [x] Error history panel (collapsible, shows failed runs with errors)
- [x] Consolidate email variants (group-based consolidation, variant badges)
- [x] Railway health check (derived from cloud service activity)
- [x] Local service status (derived from enrichment_stats + service_runs)
- [x] Event timeline improvements (actor/type filters, expandable data, count badges)
- [x] Uptime chart (24h hourly activity bars per service)
