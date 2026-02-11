# CoachGolem

> Life planning — daily schedule, calendar integration, habit tracking, and gentle nudging.

## Role

CoachGolem is the **life planner**: it reads state from other golems, integrates with Google Calendar, and helps plan the day/week. It does NOT invoke other golems — it reads their status and helps the human prioritize.

## Architecture

```text
packages/coach/
├── src/                         # (empty — Phase 6 builds this out)
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # This file
└── package.json                 # @golems/coach
```

## Dependencies

- `@golems/shared` — State store, event log
- `googleapis` — Google Calendar API (Phase 6)

## Planned Features (Phase 6)

| Component | Purpose |
|-----------|---------|
| Calendar client | Google Calendar API integration |
| Schedule engine | Merge calendar + golem states → daily plan |
| Status aggregator | Read getStatus() from all golems |
| Nudger | Morning Telegram: "Here's your day" |
| Tracker | Compliance tracking + weekly summary |

## Design Principles

1. **Read-only** — CoachGolem reads other golems' state, never invokes them
2. **Human-centric** — suggests priorities, doesn't auto-execute
3. **Calendar-aware** — knows about meetings, deadlines, blocked time
4. **Gentle** — nudges, doesn't nag. Respects energy levels and context.

## How It Works (Planned)

```text
Morning:
  1. Read all golem statuses (jobs found, outreach pending, drafts ready, etc.)
  2. Read Google Calendar (meetings, deadlines)
  3. Generate daily plan: "3 interviews to prep, 2 drafts to approve, deep work 2-5pm"
  4. Send to Telegram as morning nudge

Evening:
  1. Check compliance: what got done vs. plan
  2. Adjust tomorrow's plan based on what slipped
  3. Bedtime reminder (from Bedtime Guardian service)
```
