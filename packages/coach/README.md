# @golems/coach

CoachGolem — daily schedule planning with Whoop biometrics, Huberman protocols, Google Calendar, and LLM coaching.

## What It Does

- Pulls live biometric data from Whoop (recovery, sleep, strain)
- Applies evidence-based Huberman Lab protocols (caffeine timing, light exposure, supplements)
- Reads status from all other golems for priority sorting
- Integrates with Google Calendar for time-aware planning
- Generates personalized daily plans with LLM coaching (Gemini Flash-Lite)
- Sends morning nudges and evening wrap-ups via Telegram

## Quick Start

```bash
cd packages/coach
bun scripts/cal.ts today      # View today's calendar
bun scripts/cal.ts now        # Current time + next event
```

## How It Works

```
/schedule (health-aware):
  1. Fetch Whoop biometrics (recovery, sleep, strain)
  2. Load protocol rules (Huberman + personal context)
  3. Read all golem statuses + Google Calendar
  4. LLM generates personalized coaching (or rule-based fallback)
  5. Format: health → advice → workout → schedule → reminders

/plan (basic):
  1. Read golem statuses + Google Calendar
  2. Generate priority-sorted daily plan
  3. Format for Telegram
```

## Whoop Integration

Recovery color drives workout selection:

| Color | Recovery | Workout |
|-------|----------|---------|
| Red | < 34% | Walk + stretching only |
| Yellow | 34-66% | Light bodyweight |
| Green | 67%+ | Full run or strength |

## Design Principles

1. **Health-first** — biometric data drives recommendations
2. **Evidence-based** — Huberman protocols for caffeine, light, supplements, sleep
3. **Read-only** — reads other golems' state, never invokes them
4. **Graceful degradation** — works without Whoop, Calendar, or LLM (rule-based fallback)

## Architecture

```
packages/coach/
├── src/
│   ├── index.ts               # planToday(), planTodayWithHealth(), getStatus()
│   ├── coaching-engine.ts     # LLM coaching + rule-based fallback
│   ├── protocol.ts            # Huberman protocols + personal context
│   ├── calendar-client.ts     # Google Calendar API
│   ├── schedule-engine.ts     # Merge calendar + golem states → DailyPlan
│   ├── status-aggregator.ts   # Read getStatus() from all golems
│   ├── nudger.ts              # Morning nudge + evening wrap-up
│   └── tracker.ts             # Compliance tracking + weekly summary
└── CLAUDE.md
```

## Dependencies

- `@golems/shared` — Supabase, Telegram, state store, Whoop client, LLM
- `@golems/jobs` — `getStatus()` for job match counts
- `@golems/recruiter` — `getStatus()` for outreach counts
- `@golems/teller` — `getStatus()` for financial summary
- `googleapis` — Google Calendar API v3
