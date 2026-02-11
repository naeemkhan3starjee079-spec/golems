# Phase 6: CoachGolem

> [Back to main plan](../README.md)

## Goal
Build the CoachGolem plugin — a life planner that reads golem state + Google Calendar to help the user schedule their days.

## Tools
- **Research:** gemini — Google Calendar API patterns, scheduling algorithms
- **Code:** cursor (work mode) — schedule engine; Opus — plugin wiring
- **MCPs:** Google Calendar API (user provides API key)

## Steps

1. **[Gemini research]** Google Calendar API patterns — OAuth2 vs API key, event reading, conflict detection
2. **[Cursor work]** Set up Google Calendar API client
   - OAuth2 or API key auth
   - Read events, check conflicts, find free blocks
   - Store credentials in 1Password (not .env)
3. **[Cursor work]** Build schedule engine (`packages/coach/src/schedule-engine.ts`)
   - Reads Phase 1/2 schedule from Obsidian daily-schedule-draft.md
   - Knows current day in sleep shift plan (wake/bed times)
   - Generates daily time blocks: workout, interview prep, job hunt, flow blocks, wind-down
4. **[Cursor work]** Build status aggregator (`packages/coach/src/status-aggregator.ts`)
   - Imports getStatus() from each golem package
   - RecruiterGolem: unseen jobs, upcoming interviews, practice streak
   - JobGolem: pipeline stats, last scrape, hot matches
   - ContentGolem: pending drafts, last post
   - TellerGolem: monthly spend overview
5. **[Cursor work]** Build nudger (`packages/coach/src/nudger.ts`)
   - Morning: today's plan with priorities
   - Uses shared notify to send via Telegram
   - NOT an alarm — Whoop handles wake-up
6. **[Cursor work]** Build tracker (`packages/coach/src/tracker.ts`)
   - Tracks: wake time compliance, workout done, coding stop adherence
   - Weekly summary: what got done vs planned
   - Suggests Phase 2 transition when Phase 1 sleep targets consistently hit
7. **[Opus]** Create CC plugin structure
   - commands/: plan.md, today.md, check.md
   - skills/: daily-routine/SKILL.md (auto-invoked for scheduling context)
   - CLAUDE.md: coach persona
8. **[Opus]** Wire into morning briefing (briefing.ts reads coach schedule)
9. Priority weighting: Sleep > Job pipeline (apply + practice + content) > Ship golems

## Key Design Rules
- Coach READS state, does NOT invoke other golems
- Coach helps YOU decide when to do what — you invoke golems through Claude
- NOT another alarm — Whoop handles wake/sleep alarms
- Obsidian daily-schedule-draft.md is the source of truth for schedule template

## Reference Files
- `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/personal/daily-schedule-draft.md`
- `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/personal/Sleep earlier.md`
- `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/personal/Sleep earlier 2.md`

## Depends On
- Phase 5 (golem plugins must exist with getStatus() interfaces)
- Google Calendar API key (user provides)

## Status
- [ ] Google Calendar API client
- [ ] Schedule engine
- [ ] Status aggregator
- [ ] Nudger (morning Telegram)
- [ ] Tracker (compliance + weekly summary)
- [ ] CC plugin structure
- [ ] Wire into briefing
- [ ] Test with real schedule data
