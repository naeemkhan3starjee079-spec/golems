# Phase 0: Fix Broken Services

> [Back to main plan](../README.md)

## Goal

Make dashboard service statuses show real data instead of "never." Services run fine — they just don't write timestamps to Supabase.

## Tools

- **Research:** None needed — already diagnosed
- **Code:** Opus direct (4 one-liners)

## Context

Launchd services are running:
- `email-golem` — last ran at 13:49 today, processing emails
- `job-golem` — PID 8139, actively scraping 60+ jobs
- `briefing` — ran today, sent morning digest
- `nightshift` — ran last night

But none of them write a `last_run` timestamp to the `golem_state` Supabase table. The dashboard reads `golem_state` for service status → shows "never."

## Steps

1. Add `golem_state` upsert helper to `src/lib/state-store.ts` (or wherever state writes happen):
   ```typescript
   async function updateServiceStatus(service: string): Promise<void> {
     await supabase.from('golem_state')
       .upsert({ key: `${service}_last_run`, value: new Date().toISOString(), updated_at: new Date().toISOString() })
   }
   ```

2. Add call at END of each service's main function:
   - `src/email-golem/index.ts` → `updateServiceStatus('email_golem')`
   - `src/job-golem/index.ts` → `updateServiceStatus('job_golem')`
   - `src/briefing.ts` → `updateServiceStatus('briefing')`
   - `src/night-shift.ts` → `updateServiceStatus('nightshift')`

3. Verify dashboard reads these keys (check `etanheyman.com/app/admin/golem/actions/data.ts` → `getOverviewStats()`)

4. If dashboard uses different key names, align them

5. Railway redeploy: `cd ~/Gits/golems/packages/autonomous && railway up --detach`

## Depends On

- None

## Status

- [ ] Add updateServiceStatus helper
- [ ] Wire into all 4 service entry points
- [ ] Verify dashboard reads correct keys
- [ ] Test locally (run email-golem, check Supabase)
- [ ] Railway redeploy
