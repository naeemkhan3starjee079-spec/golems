# Scheduling Rules Reference

> These rules represent accumulated preferences from many coaching sessions. brain_search may reveal updates — always check before applying rigidly.

## Core Principles

1. **Zero gaps** — Every minute is accounted for. No empty slots between events.
2. **Sleep is an event** — Block it on the calendar with start and end time.
3. **Time blocks, not tasks** — Schedule blocks of focused time, not individual to-dos.

## Meal Timing

- **No breakfast** — Intermittent fasting. First meal around 13:00.
- **Caffeine delay** — No coffee until 90-120 minutes after waking (Huberman protocol). Reason: cortisol naturally peaks in the first 90 min after waking. Caffeine during this window blunts the natural cortisol response and causes an afternoon crash.
- **Last caffeine** — At least 8 hours before sleep (adenosine half-life).

## Exercise

- **Workout in morning** — Preferred time slot, before deep work.
- **Intensity adapts to WHOOP recovery:**
  - Green (67%+): Full intensity
  - Yellow (34-66%): Moderate, reduce volume
  - Red (<34%): Light movement only (walk, stretch)
- **If no WHOOP data:** Default to moderate intensity, ask user how they feel.

## Work Blocks

- **Deep work first** — Morning block after workout + shower for most cognitively demanding work.
- **Meetings clustered** — Batch meetings into one time block to minimize context switching.
- **Break between deep work blocks** — 10-15 min, not optional.

## Wind-Down

- **1 hour before sleep** — Wind-down routine begins.
- **No screens** during wind-down (or use night mode at minimum).
- **Dim lights** — Huberman protocol for melatonin onset.

## Google Calendar Color System

| Priority | Color Name | Google Calendar |
|----------|-----------|-----------------|
| 10 (critical, non-movable) | Red | Basil |
| 7 (important, prefer not to move) | Blue | Peacock |
| 5 (moderate, flexible timing) | Yellow | Banana |
| 3 (nice-to-have, easily reschedulable) | Purple | Grape |

## Schedule Template (Dynamic)

**Never hardcode times.** Calculate all anchors from WHOOP sleep data:

```
WAKE        = WHOOP sleep.end (actual, not aspirational)
CAFFEINE    = WAKE + 90min
WORKOUT     = WAKE + 2h (adjust intensity for recovery zone)
FIRST_MEAL  = max(WAKE + 2.5h, 13:00) — intermittent fasting constraint
WIND_DOWN   = TARGET_SLEEP - 1h
TARGET_SLEEP = based on WHOOP sleep consistency data (aim for same time ± 30min)
```

### Example: Early Riser (WAKE = 06:30)

```
06:30 - 07:00  Wake up, morning light exposure
07:00 - 07:15  Hydration (water + electrolytes, NO caffeine yet)
08:00 - 08:15  Caffeine (90min after waking)
08:30 - 09:45  Workout (intensity per WHOOP)
09:45 - 10:15  Shower + recovery
10:15 - 13:00  Deep work block 1
13:00 - 13:30  First meal
13:30 - 14:00  Break / walk
14:00 - 16:00  Deep work block 2 / meetings
16:00 - 16:15  Break
16:15 - 18:00  Meetings / admin / lighter work
18:00 - 19:00  Second meal
19:00 - 21:00  Personal time / side projects
21:00 - 22:00  Wind-down routine
22:00 - 06:30  Sleep (8.5hr block)
```

### Example: Late Riser (WAKE = 10:43)

```
10:43 - 11:00  Wake up, morning light exposure
11:00 - 11:15  Hydration (water + electrolytes, NO caffeine yet)
12:15 - 12:30  Caffeine (90min after waking)
12:45 - 14:00  Workout (intensity per WHOOP)
14:00 - 14:30  Shower + recovery
14:30 - 17:00  Deep work block 1
13:15 - 13:45  First meal (IF window opens at 13:00+)
17:00 - 17:15  Break
17:15 - 19:00  Deep work block 2 / meetings
19:00 - 20:00  Second meal
20:00 - 22:00  Personal time / side projects
22:00 - 23:00  Wind-down routine
23:00 - 10:30  Sleep target (aim for consistency)
```

A user who sleeps at 3:30 AM and wakes at 10:43 does NOT get a 06:30 schedule. The schedule serves their actual life.

Always check BrainLayer for the user's actual current schedule pattern — it evolves.
