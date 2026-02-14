---
title: "CoachGolem — Life Planning"
description: "Calendar sync, daily planning, ecosystem status aggregation, and gentle nudging."
---

# CoachGolem

> Life planning — daily schedule, calendar integration, ecosystem status, and gentle nudging.

## What It Does

CoachGolem is the **life planner**: it reads state from all other golems, integrates with Google Calendar, and helps plan the day. It does NOT invoke other golems — it reads their status and helps the human prioritize.

## Design Principles

1. **Read-only** — CoachGolem reads other golems' state, never invokes them
2. **Human-centric** — suggests priorities, doesn't auto-execute
3. **Calendar-aware** — knows about meetings, deadlines, blocked time
4. **Gentle** — nudges, doesn't nag. Respects energy levels and context
5. **Graceful degradation** — works without Calendar credentials (returns empty events)

## How It Works

```
Morning:
  1. Read all golem statuses (jobs found, outreach pending, drafts ready)
  2. Read Google Calendar (meetings, deadlines)
  3. Generate daily plan with priority-sorted pending items
  4. Send to Telegram as morning nudge (via briefing)

Evening:
  1. Check compliance: what got done vs. plan
  2. Weekly summary tracks completion rate over 7 days
```

## Key Types

| Type | Purpose |
|------|---------|
| `DailyPlan` | Date, greeting, time blocks, pending items, summary |
| `TimeBlock` | Start/end, type (meeting/focus/break), title, source |
| `EcosystemStatus` | Timestamp, all golem statuses, healthy/unhealthy count |
| `PendingWorkItem` | Item description, priority, originating golem |

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/plan` | Today's schedule + pending tasks |
| `/golems` | All golem ecosystem statuses |

## Wiring

- **Briefing** (`@golems/services`) imports `generateDailyPlan` and `formatPlanForTelegram` from Coach
- **Calendar** reuses Gmail OAuth2 credentials
- **Compliance tracking** stored in `~/.golems-zikaron/coach/compliance.json` (90-day retention)

## Dependencies

- `@golems/shared` — GolemStatus type, telegram-direct, state-store
- `@golems/jobs` — getStatus() for job match counts
- `@golems/recruiter` — getStatus() for draft/follow-up counts
- `@golems/teller` — getStatus() for financial summary
- `googleapis` — Google Calendar API v3

## Source

[`packages/coach/`](https://github.com/EtanHey/golems/tree/master/packages/coach)
