# Phase 5: Coaching Engine Upgrade

> [Back to main plan](../README.md)

## Goal

Upgrade `computeHubermanReminders()` and `buildCoachingPrompt()` to use all new protocol fields — time-aware reminders, weed cutoff, temperature timing, wind-down sequence, NSDR triggers, and gradual shift tracking.

## Tools

- **Code:** Claude Code (Opus) — implement engine upgrades
- **Tests:** `bun test` in packages/coach
- **Verification:** Manual test with `/schedule` Telegram command

## Changes to `coaching-engine.ts`

### `computeHubermanReminders()` — expand from 6 reminders to ~12-15

Current reminders:
1. Coffee OK after HH:MM
2. NSDR at HH:MM
3. Sunlight at HH:MM
4. Last caffeine by HH:MM
5. Supplement reminders
6. Hard coding stop

Add:
7. **Weed cutoff** — "Last smoke by HH:MM" (bed - cannabis.minHoursBeforeBed)
8. **Hot shower** — "Hot shower at HH:MM" (bed - temperature.hotShowerMinutesBeforeBed)
9. **Dim lights** — "Dim lights at HH:MM" (bed - eveningLight.dimStartHoursBeforeBed)
10. **Screens off** — "Screens off at HH:MM" (bed - windDown.screensOffHoursBeforeBed)
11. **Morning light** — "Morning sunlight: X min within Y min of waking"
12. **Exercise window** — "Workout window: HH:MM - HH:MM"
13. **Sleep shift progress** — "Shift day N: target bed HH:MM (X min earlier)"

### `buildCoachingPrompt()` — enrich LLM context

Add to the prompt:
- Wind-down sequence steps
- Current shift day and progress
- Cannabis usage context (if cutoff was missed, flag REM impact)
- Temperature protocol status
- NSDR recommendation (based on recovery color)

### `pickWorkout()` — add exercise timing context

- Include ideal exercise window in workout notes
- Flag if current time is past the latest-before-bed cutoff

### New: `computeWindDownSequence()`

Generate an ordered list of wind-down actions with timestamps:
```
20:30 - Dim lights, switch to side lamps
21:00 - Last smoke cutoff
21:30 - Screens off
22:00 - Hot shower (15 min)
22:15 - Supplements (Mag Threonate + Apigenin)
22:30 - Read / journal / NSDR
23:00 - Lights out
```

(Times computed dynamically from targetBed and protocol offsets)

### Update CLAUDE.md

Add "Huberman Protocols" knowledge section to `packages/coach/CLAUDE.md` so future sessions have embedded protocol knowledge.

## Steps

1. Implement expanded `computeHubermanReminders()`
2. Implement `computeWindDownSequence()`
3. Update `buildCoachingPrompt()` with new protocol context
4. Update `pickWorkout()` with exercise timing
5. Add/update tests for all new logic
6. Update `packages/coach/CLAUDE.md` with Huberman protocol section
7. Test manually: load protocol, generate reminders, verify times are correct
8. Run `bun test` — all green
9. Branch + PR + merge
10. Notify on Telegram: "Huberman pipeline complete"

## Depends On

- Phase 4 (need expanded protocol interface)

## Status

- [ ] Expand computeHubermanReminders()
- [ ] Implement computeWindDownSequence()
- [ ] Update buildCoachingPrompt()
- [ ] Update pickWorkout()
- [ ] Add tests
- [ ] Update CLAUDE.md
- [ ] Manual verification
- [ ] Tests pass
- [ ] Branch + PR + merge
