# CoachGolem

> Personal AI life coach — Whoop biometrics, Huberman protocols, LLM coaching, calendar integration, daily planning.

## Role

CoachGolem is the **health-aware life planner**: it pulls live biometric data from Whoop, applies evidence-based protocols (Huberman Lab), reads state from other golems, integrates with Google Calendar, and generates personalized daily plans with LLM coaching. It does NOT invoke other golems — it reads their status and helps the human prioritize.

## Architecture

```text
packages/coach/
├── src/
│   ├── index.ts                 # Main entry — planToday(), planTodayWithHealth(), getStatus()
│   ├── composer.ts              # Grammy Composer: /plan, /schedule, /golems
│   ├── coaching-engine.ts       # LLM coaching (Gemini Flash-Lite) + rule-based fallback
│   ├── protocol.ts              # Huberman protocols + personal context (shoulder, sleep phase)
│   ├── calendar-client.ts       # Google Calendar API (reuses Gmail OAuth2)
│   ├── schedule-engine.ts       # Merge calendar + golem states → DailyPlan + health formatting
│   ├── status-aggregator.ts     # Read getStatus() from all golems
│   ├── nudger.ts                # Morning Telegram nudge + evening wrap-up
│   ├── tracker.ts               # Compliance tracking + weekly summary
│   └── __tests__/               # Tests
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # This file
└── package.json                 # @golems/coach
```

## Key Modules

### `coaching-engine.ts` — LLM Coaching
- `generateCoaching(input)` → personalized advice, workout, Huberman reminders, health snapshot
- Uses `runCloudFree()` (Gemini Flash-Lite, free) with rule-based fallback
- `computeHubermanReminders()` — caffeine delay, NSDR, sunlight, supplements, coding stop
- `pickWorkout()` — adjusts by recovery color: red=walk+stretching, yellow=light, green=full

### `protocol.ts` — Evidence-Based Rules
- `CoachProtocol` interface: sleep, body, career, schedule, huberman, coaching sections
- `DEFAULT_PROTOCOL` from user's Obsidian notes (shoulder injury, sleep phase shift, etc.)
- Stored at `~/.golems-zikaron/coach/protocol.json`
- `loadProtocol()`, `saveProtocol()`

### Whoop Integration (via `@golems/shared/whoop/client`)
- `getLatestRecovery()` — recovery score, HRV, resting HR, SpO2
- `getLatestSleep()` — duration, stages (REM/deep/light), performance, efficiency
- `getTodayStrain()` — strain, kilojoule, heart rates
- Recovery color: green (67%+), yellow (34-66%), red (<34%)

## Key Types

| Type | Module | Purpose |
|------|--------|---------|
| `CoachingOutput` | coaching-engine | `{ advice, workout, hubermanReminders, healthSnapshot }` |
| `CoachProtocol` | protocol | Sleep, body, career, schedule, huberman, coaching rules |
| `HealthAwarePlan` | index | `{ plan: DailyPlan, coaching: CoachingOutput }` |
| `DailyPlan` | schedule-engine | `{ date, greeting, blocks, pendingItems, summary }` |
| `TimeBlock` | schedule-engine | `{ start, end, type, title, source }` |
| `EcosystemStatus` | status-aggregator | `{ timestamp, golems, healthy, unhealthy, summary }` |
| `WhoopRecovery` | @golems/shared/whoop | Recovery score, HRV, SpO2, skin temp |
| `WhoopSleep` | @golems/shared/whoop | Sleep stages, performance, efficiency |

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/schedule` | Health-aware daily plan (Whoop + Huberman + LLM coaching) |
| `/plan` | Basic daily plan (calendar + golem statuses, no health data) |
| `/golems` | Ecosystem status overview |

## Dependencies

- `@golems/shared` — GolemStatus, telegram-direct, state-store, Whoop client, Vercel LLM
- `@golems/jobs` — getStatus() for job match counts
- `@golems/recruiter` — getStatus() for draft/follow-up counts
- `@golems/teller` — getStatus() for financial summary
- `googleapis` — Google Calendar API v3

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WHOOP_CLIENT_ID` | Whoop OAuth2 client ID |
| `WHOOP_CLIENT_SECRET` | Whoop OAuth2 client secret |
| `WHOOP_REFRESH_TOKEN` | Whoop refresh token (from auth-server) |
| `GMAIL_CLIENT_ID` | Calendar OAuth2 (shared with email) |
| `GMAIL_CLIENT_SECRET` | Calendar OAuth2 |
| `GMAIL_REFRESH_TOKEN` | Calendar OAuth2 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini for LLM coaching (optional — falls back to rules) |

## Design Principles

1. **Health-first** — biometric data drives workout and energy recommendations
2. **Evidence-based** — Huberman Lab protocols for caffeine, light, supplements, sleep
3. **Read-only** — reads other golems' state, never invokes them
4. **Human-centric** — suggests priorities, doesn't auto-execute
5. **Calendar-aware** — knows about meetings, deadlines, blocked time
6. **Graceful degradation** — works without Whoop (skips health), without Calendar (empty events), without LLM (rule-based fallback)

## How It Works

```text
/schedule (health-aware):
  1. Fetch Whoop biometrics (recovery, sleep, strain)
  2. Load protocol rules (Huberman + personal context)
  3. Read all golem statuses + Google Calendar
  4. LLM generates personalized coaching (or rule-based fallback)
  5. Format: health snapshot → coaching advice → workout → schedule → reminders

/plan (basic):
  1. Read all golem statuses + Google Calendar
  2. Generate daily plan with priority-sorted pending items
  3. Format for Telegram
```

## Wiring

- **Briefing** (`packages/services/src/briefing.ts`) imports from coach for morning plans
- **Calendar** reuses Gmail OAuth2 creds
- **Whoop tokens** cached at `/tmp/whoop-tokens.json` (auth-server writes, client refreshes)
- **Protocol** stored at `~/.golems-zikaron/coach/protocol.json`
- **Tracker** stores compliance data in `~/.golems-zikaron/coach/compliance.json` (90-day retention)

## Post-MVP Ideas

- Whoop MCP server (expose health data to all Claude sessions)
- Weather API integration (outdoor workout decisions)
- Midday nudge + evening wrap-up with health context
- `/coach why` command (explain today's recommendations)
- 7-day trend analysis with Whoop historical data
- Supabase cron for Whoop data → dashboard integration
