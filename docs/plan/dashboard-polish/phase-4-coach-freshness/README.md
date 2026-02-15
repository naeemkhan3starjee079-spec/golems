# Phase 4: Coach Data Freshness

> [Back to main plan](../README.md)

## Goal

Make the coach page show fresh, accurate health data with clear freshness indicators and surface calendar events.

## Tools

- **Research:** gemini — check Whoop API sync schedule, Google Calendar integration options
- **Code:** opus — edit coach/page.tsx, queries.ts
- **MCPs:** supabase — query whoop_snapshots freshness, check golem_events for coach activity

## Context

### Whoop Data Staleness
- Sync runs 2x daily (7am + 2pm Israel time) via Railway cloud worker cron
- If the last sync failed or user hasn't worn Whoop, data looks stale
- Coach page shows recovery/sleep/strain but no indicator of WHEN the data was captured
- `whoop_snapshots` table has `snapshot_date` and `created_at` columns
- Page fetches `fetchWhoopSnapshots(days=7)` and `fetchLatestWhoopSnapshot()`
- **Fix:** Show `snapshot_date` prominently + "Data from X hours ago" freshness badge. If data > 24h old, show warning.

### Recovery/Sleep/Strain Not Updating
- User says these aren't updating — likely the Whoop sync is running but data hasn't changed
- Need to check: is the cloud worker actually syncing Whoop? Check `service_runs` for whoop sync entries
- May also be a timezone issue — `snapshot_date` could be UTC while display assumes local

### No Calendar Events
- Coach page currently shows `golem_events` and `service_runs` for "Today's Activity"
- No Google Calendar integration — the `fetchTodayActivity()` function only queries golem_events/service_runs
- Calendar client exists at `packages/coach/src/calendar-client.ts` but is NOT wired to the dashboard
- **Options:**
  - Option A: Add server-side Google Calendar fetch (requires OAuth tokens on Vercel — complex)
  - Option B: Sync calendar to Supabase via cloud worker cron, display from DB (cleaner)
  - Option C: Show a "Calendar sync not available" placeholder with link to set up
- **Go with Option C for now** — calendar sync is a bigger feature. For this phase, just add a clear placeholder explaining the situation and link to the coach CLAUDE.md for setup instructions.
- Also: add a "Last synced" timestamp to all data sections

## Steps

1. **Freshness indicators:** Add `snapshot_date` display to each Whoop card. Show "X hours ago" using `timeAgo()`. If > 24h, show amber warning badge.
2. **Check Whoop sync health:** Query `service_runs` for recent whoop sync entries. If no runs in 24h, show "Sync may be down" warning.
3. **Calendar placeholder:** Add a "Calendar Events" section with an informative empty state explaining that calendar sync is available locally but not yet on Vercel.
4. **Timezone handling:** Ensure `snapshot_date` comparison uses Israel timezone (all data is Israel-local).
5. **Activity timeline improvements:** Show more context in today's activity — include event type icons, group by hour.
6. Build + test coach page locally

## Depends On

- None (independent)

## Status

- [x] Add data freshness indicators (snapshot_date + timeAgo)
- [x] Add stale data warning (>24h)
- [x] Check Whoop sync health via service_runs
- [x] Add calendar events placeholder
- [x] Improve activity timeline (already good — uses service_runs grouping)
- [x] Build + local test
- [x] Fix fetchLatestWhoopSnapshot to skip null-data partial syncs
