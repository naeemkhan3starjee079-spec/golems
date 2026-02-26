# Integration Map — Where New Protocol Fields Should Be Wired

## New Fields Overview

| Field | Purpose |
|-------|---------|
| `temperature.hotShowerMinutesBeforeBed` | Reminder + wind-down sequence |
| `cannabis.minHoursBeforeBed` | Reminder ("last smoke by HH:MM") |
| `nsdrTriggers` | Conditional NSDR suggestion based on recovery color |
| `windDown.sequence` | Ordered evening steps with timestamps |
| `sleepShift.shiftMinutesPerStep` | Progress tracking + adjusted targets |
| `eveningLight.dimStartHoursBeforeBed` | Reminder |
| `exerciseTiming.idealWindowStart` | Workout window in schedule |

---

## 1. temperature.hotShowerMinutesBeforeBed

**Purpose:** Remind user to take hot shower X minutes before bed (temperature drop protocol).

**Where to wire:**

| Location | Action |
|----------|--------|
| `protocol.ts` | Add `huberman.temperature?: { hotShowerMinutesBeforeBed: number }` |
| `computeHubermanReminders()` | If present: compute time = targetBed - minutes, push `Hot shower by HH:MM` |
| `windDown.sequence` (see below) | Include as step if present |
| `buildCoachingPrompt()` | Add to CONTEXT so LLM can mention it |
| **Nudger** | If time-specific nudges exist: send "Hot shower time" at computed time |

**Dependencies:** Needs `targetBed` from sleep. Same pattern as supplements.

---

## 2. cannabis.minHoursBeforeBed

**Purpose:** "Last smoke by HH:MM" reminder.

**Where to wire:**

| Location | Action |
|----------|--------|
| `protocol.ts` | Add `huberman.cannabis?: { minHoursBeforeBed: number }` |
| `computeHubermanReminders()` | If present: compute time = targetBed - (minHours * 60), push `Last smoke by HH:MM` |
| `buildCoachingPrompt()` | Add to CONTEXT |
| **Note:** `sleep.lastSmokeBuffer` (minutes) exists but is **unused**. Consider consolidating: either rename/repurpose or add cannabis as separate (hours vs minutes). |

---

## 3. nsdrTriggers

**Purpose:** Conditional NSDR — e.g., only suggest when recovery is yellow/red, or different times per color.

**Proposed shape:**
```ts
nsdrTriggers?: {
  whenRecovery?: ("red" | "yellow" | "green")[];
  durationMinutes?: number;
  idealTime?: string;
  fallbackTime?: string;  // if primary window missed
}
```

**Where to wire:**

| Location | Action |
|----------|--------|
| `protocol.ts` | Add `huberman.nsdrTriggers?: { ... }` (or extend existing `nsdr`) |
| `computeHubermanReminders()` | Accept `recoveryColor` param; only add NSDR reminder if `whenRecovery` includes current color |
| `generateCoaching()` | Pass `recoveryColor` into computeHubermanReminders |
| `pickWorkout()` | Already has recovery logic; NSDR could mirror (e.g., red=yellow= suggest, green=optional) |
| `buildCoachingPrompt()` | Add conditional NSDR guidance to LLM |

**Current state:** `nsdr.idealTime` is always used. No recovery-based logic.

---

## 4. windDown.sequence

**Purpose:** Ordered evening steps with timestamps (e.g., "20:30 — dim lights, 21:00 — supplements, 21:30 — no screens").

**Proposed shape:**
```ts
windDown?: {
  sequence: Array<{
    step: string;
    minutesBeforeBed: number;
    optional?: boolean;
  }>;
}
```

**Where to wire:**

| Location | Action |
|----------|--------|
| `protocol.ts` | Add `huberman.windDown?: { sequence: [...] }` |
| `computeHubermanReminders()` | For each step: compute time from targetBed, add to reminders. Or return structured `windDownSteps` |
| **Alternative:** New function `computeWindDownSteps(protocol)` → `{ time, step }[]` |
| `formatHealthPlanForTelegram()` | Add "Wind-down:" section with times if present |
| **Nudger** | Time-specific nudges: "Dim lights now", "Supplements time", etc. |
| `buildCoachingPrompt()` | Include wind-down sequence in CONTEXT |

**Integration with hotShowerMinutesBeforeBed:** Hot shower can be one step in the sequence.

---

## 5. sleepShift.shiftMinutesPerStep

**Purpose:** Progress tracking for phase shift (e.g., move bed 15min earlier per step). Adjusted targets.

**Where to wire:**

| Location | Action |
|----------|--------|
| `protocol.ts` | Add `sleep.sleepShift?: { shiftMinutesPerStep: number; currentStep?: number }` (or extend existing `phase`/`currentDay`) |
| `schedule-engine` or new module | Compute effective targetBed = base - (currentStep * shiftMinutesPerStep) |
| `computeHubermanReminders()` | Use computed targetBed for all time-based reminders |
| **Tracker** | New compliance: "Did you hit target bed time?" — compare actual vs computed target |
| `buildCoachingPrompt()` | "Sleep shift: day X, target tonight HH:MM" |

**Current state:** `sleep.phase` and `sleep.currentDay` exist but are **unused**. This field would give them meaning.

---

## 6. eveningLight.dimStartHoursBeforeBed

**Purpose:** "Dim lights by HH:MM" reminder.

**Where to wire:**

| Location | Action |
|----------|--------|
| `protocol.ts` | Add `huberman.eveningLight?: { dimStartHoursBeforeBed: number }` |
| `computeHubermanReminders()` | Compute time = targetBed - (hours * 60), push `Dim lights by HH:MM` |
| `windDown.sequence` | Could be first step in sequence |
| **Nudger** | Time-specific: "Dim lights now" at computed time |
| `buildCoachingPrompt()` | Add to CONTEXT |

---

## 7. exerciseTiming.idealWindowStart

**Purpose:** Workout window in schedule (e.g., "ideal workout 10:30–12:00").

**Where to wire:**

| Location | Action |
|----------|--------|
| `protocol.ts` | Add `body.exerciseTiming?: { idealWindowStart: string; idealWindowDuration?: number }` |
| `schedule-engine.generateDailyPlan()` | Add a `focus` or `habit` block for workout in the ideal window (if no meeting conflicts) |
| `formatHealthPlanForTelegram()` | Show "Workout window: 10:30–11:30" in schedule |
| `pickWorkout()` | Already picks type; timing could slot into this window |
| `buildCoachingPrompt()` | "Workout window: HH:MM–HH:MM" in CONTEXT |

**Note:** `body.workoutTiming` exists ("after-wake") but is **unused**. Could extend it or add `exerciseTiming` as more precise.

---

## Summary: Wiring Priority

| Priority | Field | Effort | Impact |
|----------|-------|--------|--------|
| 1 | `eveningLight.dimStartHoursBeforeBed` | Low | High — simple reminder |
| 2 | `cannabis.minHoursBeforeBed` | Low | High — uses existing lastSmokeBuffer pattern |
| 3 | `temperature.hotShowerMinutesBeforeBed` | Low | Medium |
| 4 | `windDown.sequence` | Medium | High — unifies evening reminders |
| 5 | `nsdrTriggers` | Medium | Medium — conditional logic |
| 6 | `exerciseTiming.idealWindowStart` | Medium | High — schedule integration |
| 7 | `sleepShift.shiftMinutesPerStep` | High | Medium — requires tracker + computed targets |
