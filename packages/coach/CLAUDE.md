# CoachGolem

> Life planning — daily schedule, calendar integration, habit tracking, and gentle nudging.

## Role

CoachGolem is the **life planner**: it reads state from other golems, integrates with Google Calendar, and helps plan the day/week. It does NOT invoke other golems — it reads their status and helps the human prioritize.

## Architecture

```text
packages/coach/
├── src/
│   ├── index.ts                 # Main entry — init(), planToday(), morningNudge(), getStatus()
│   ├── calendar-client.ts       # Google Calendar API (reuses Gmail OAuth2)
│   ├── schedule-engine.ts       # Merge calendar + golem states → DailyPlan
│   ├── status-aggregator.ts     # Read getStatus() from all golems
│   ├── nudger.ts                # Morning Telegram nudge + evening wrap-up
│   ├── tracker.ts               # Compliance tracking + weekly summary
│   └── __tests__/               # 15 tests, 36 expect() calls
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # This file
└── package.json                 # @golems/coach
```

## Key Types

| Type | Module | Purpose |
|------|--------|---------|
| `DailyPlan` | schedule-engine | `{ date, greeting, blocks, pendingItems, summary }` |
| `TimeBlock` | schedule-engine | `{ start, end, type, title, source }` |
| `EcosystemStatus` | status-aggregator | `{ timestamp, golems, healthy, unhealthy, summary }` |
| `PendingWorkItem` | status-aggregator | `{ item, priority, golem }` |
| `CalendarEvent` | calendar-client | `{ id, summary, start, end, allDay, status }` |
| `DailyRecord` | tracker | `{ date, plannedMeetings, attendedMeetings, ... }` |

## Dependencies

- `@golems/shared` — GolemStatus type, telegram-direct, state-store
- `@golems/jobs` — getStatus() for job match counts
- `@golems/recruiter` — getStatus() for draft/follow-up counts
- `@golems/teller` — getStatus() for financial summary
- `googleapis` — Google Calendar API v3

## Design Principles

1. **Read-only** — CoachGolem reads other golems' state, never invokes them
2. **Human-centric** — suggests priorities, doesn't auto-execute
3. **Calendar-aware** — knows about meetings, deadlines, blocked time
4. **Gentle** — nudges, doesn't nag. Respects energy levels and context.
5. **Graceful degradation** — works without Calendar creds (returns empty events)

## How It Works

```text
Morning:
  1. Read all golem statuses (jobs found, outreach pending, drafts ready, etc.)
  2. Read Google Calendar (meetings, deadlines)
  3. Generate daily plan with priority-sorted pending items
  4. Send to Telegram as morning nudge (via briefing.ts)

Evening:
  1. Check compliance: what got done vs. plan
  2. Weekly summary tracks completion rate over 7 days
```

## Wiring

- **Briefing** (`packages/services/src/briefing.ts`) imports `getTodayEvents`, `getEcosystemStatus`, `generateDailyPlan`, `formatPlanForTelegram` from coach
- **Calendar** reuses Gmail OAuth2 creds (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)
- **Tracker** stores compliance data in `~/.golems-zikaron/coach/compliance.json` (90-day retention)
