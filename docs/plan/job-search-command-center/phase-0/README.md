# Phase 0: Fix Broken Services

> [Back to main plan](../README.md)

## Goal

Make dashboard service statuses show real data instead of "never." Services run fine — they just don't write timestamps to Supabase.

## Root Cause

Dashboard reads `golem_state` table from Supabase. Local services use `STATE_BACKEND=file` (default), so `setState()` writes to `~/.golems-zikaron/state.json` — invisible to the dashboard.

| Key | Service | Before | After |
|-----|---------|--------|-------|
| `lastEmailCheck` | Email Golem | Wrote to file only | + Supabase |
| `lastJobRun` | Job Golem | **Never wrote** | + Supabase |
| `lastNightShift` | Night Shift | Wrote to file only | + Supabase |
| `lastBriefing` | Briefing | **Never wrote** | + Supabase |

## Solution

Added `reportServiceRun(key)` to `state-store.ts` — always writes to Supabase regardless of `STATE_BACKEND`. Uses the `SUPABASE_SERVICE_KEY` from `.env` (available locally).

Wired into all 4 services at end of their main function.

## Research Findings (from prereq Gemini reports)

Future improvements beyond this phase:
- **pm2 + 1Password**: Better process management (Phase 7)
- **`service_runs` table**: Dedicated run tracking with duration/status/errors (Phase 7)
- **Pre-flight health checks**: Wrapper scripts checking dependencies before run (Phase 7)
- **pino structured logging**: JSON logs for debugging (Phase 7)
- **Supabase Realtime**: Push-based dashboard updates (Phase 3)

## Status

- [x] Add `reportServiceRun()` helper to `state-store.ts`
- [x] Wire into Email Golem (`lastEmailCheck`)
- [x] Wire into Job Golem (`lastJobRun`) — was completely missing
- [x] Wire into Briefing (`lastBriefing`) — was completely missing
- [x] Wire into Night Shift (`lastNightShift`) — was using file-only setState
- [x] Verify dashboard reads correct keys (aligned with `data.ts`)
- [x] Tests pass (852 pass, 0 new failures)
- [ ] Push + Railway redeploy
