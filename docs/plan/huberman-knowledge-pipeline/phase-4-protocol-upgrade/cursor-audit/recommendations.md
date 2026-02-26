# Recommendations — Implementation Approach

## 1. Fix morningNudge / Briefing Gap First

**Problem:** `morningNudge()` and Briefing use `planToday()` (basic plan). No Huberman reminders, no Whoop data.

**Options:**
- **A)** Change `morningNudge()` to use `planTodayWithHealth()` and `formatHealthPlanForTelegram` — full protocol + health in morning nudge.
- **B)** Change Briefing to call `planTodayWithHealth()` for the Daily Plan section — same.
- **C)** Keep basic for Briefing (it's already long), but fix morningNudge to be health-aware.

**Recommendation:** A + B. Morning nudge and Briefing should both offer health-aware plans when available. Add fallback: if Whoop fails, still send basic plan (current behavior).

---

## 2. Protocol Interface Extension Strategy

**Principle:** Add new fields as optional (`?`) so existing protocol.json files keep working.

```ts
huberman: {
  // existing
  morningLight: { ... };
  caffeineDelay: { ... };
  // ...
  // new — all optional
  temperature?: { hotShowerMinutesBeforeBed: number };
  cannabis?: { minHoursBeforeBed: number };
  eveningLight?: { dimStartHoursBeforeBed: number };
  nsdrTriggers?: { whenRecovery: RecoveryColor[]; ... };
  windDown?: { sequence: Array<{ step: string; minutesBeforeBed: number }> };
}
sleep: {
  // existing
  // ...
  sleepShift?: { shiftMinutesPerStep: number; currentStep?: number };
}
body: {
  // existing
  exerciseTiming?: { idealWindowStart: string; idealWindowDuration?: number };
}
```

---

## 3. computeHubermanReminders Refactor

**Current:** Hardcodes `10min` for NSDR, `10min` for sunlight. Takes only `(protocol, wakeTime)`.

**Changes:**
1. Use `protocol.huberman.nsdr.durationMinutes` instead of 10.
2. Use `protocol.huberman.afternoonLight.minMinutes` instead of 10.
3. Add optional param `recoveryColor` for `nsdrTriggers` logic.
4. Add new reminders: hot shower, cannabis, dim lights, wind-down steps.
5. Consider returning structured data + formatter, for easier testing and Nudger consumption.

**Signature:**
```ts
function computeHubermanReminders(
  protocol: CoachProtocol,
  wakeTime: string,
  recoveryColor?: RecoveryColor
): string[]
```

---

## 4. Nudger: Time-Specific Reminders

**Current:** Only morning (full plan) and evening (wrap-up). No "dim lights now" at 20:30.

**To support time-specific reminders:**
1. **Scheduler/cron:** Add a job that runs every 15–30 min (or at specific times). Checks protocol for reminders due in next window.
2. **Reminder source:** Export `getScheduledReminders(protocol, now)` → `{ time, message }[]` from coaching-engine or new module.
3. **Nudger:** `sendReminderNudge(message)` — single message, no full plan.
4. **Launchd/cron:** New plist or cron entry for "Coach reminder check" (e.g., 18:00–02:00, every 30 min).

**Scope:** Phase 2. Start with morning/evening; add time-specific when wind-down sequence is stable.

---

## 5. Tracker: Huberman Compliance

**Current:** Tracks meetings, pending items, completed items. No "did you take supplements?" or "did you hit bed time?"

**To add:**
1. Extend `DailyRecord`:
   ```ts
   huberman?: {
     supplementsTaken?: boolean;
     bedTimeHit?: boolean;
     codingStopHit?: boolean;
     // optional, user self-reports or future Whoop integration
   };
   ```
2. **Evening wrap-up** could prompt: "Did you take supplements? Hit bed time?" — reply parses or button.
3. **Weekly summary** could include: "Huberman compliance: X/7 days supplements, Y/7 days bed time."

**Scope:** Phase 2. Requires UX for data entry (Telegram quick-reply or similar).

---

## 6. buildCoachingPrompt: Include Full Protocol

**Current:** Uses sleep (targetBed, targetWake, hardCodingStop), career (interview prep), hardcoded injuries. Missing: morningLight, afternoonLight, nsdr, caffeine, supplements, preSleep rules, room temp, ultradian.

**Recommendation:** Add a "Protocol" section to the prompt with key Huberman rules:
```
PROTOCOL:
- Morning light: ${p.huberman.morningLight.minMinutes}min within ${p.huberman.morningLight.withinMinutesOfWake}min of wake
- Caffeine: OK after ${coffeeTime}, last by ${lastCaffeineTime}
- NSDR: ${p.huberman.nsdr.durationMinutes}min at ${p.huberman.nsdr.idealTime}
- Afternoon light: ${p.huberman.afternoonLight.minMinutes}min at ${p.huberman.afternoonLight.idealTime}
- Pre-sleep: no food ${p.huberman.preSleepNoFood}h before bed, no screens ${p.huberman.preSleepNoScreens}h before
- Room temp: ${p.huberman.roomTemp.celsius.min}-${p.huberman.roomTemp.celsius.max}°C
- Supplements: [list]
```

Also fix injuries: use `protocol.body.injuries` instead of hardcoding "left shoulder tear".

---

## 7. Use Existing Unused Fields

Before adding new fields, consider wiring existing ones:

| Field | Action |
|-------|--------|
| `sleep.lastSmokeBuffer` | Use for cannabis reminder (minutes) — or add `cannabis.minHoursBeforeBed` if hours preferred |
| `sleep.windDownDuration` | Could inform windDown.sequence total duration |
| `sleep.phase` / `currentDay` | Use with `sleepShift.shiftMinutesPerStep` for progress |
| `body.workoutTiming` | Use for exercise window (e.g., "after-wake" → compute from targetWake) |
| `schedule.flowBlocks`, `flowBlockMinutes` | Add focus blocks to DailyPlan |
| `huberman.ultradianCycle` | Add to buildCoachingPrompt, suggest focus/break rhythm |
| `huberman.morningLight` | Add reminder "Morning light: Xmin within Ymin of wake" |
| `coaching.tone`, `neverNag` | Pass to LLM in buildCoachingPrompt |

---

## 8. Implementation Phases

### Phase 1 — Quick wins (1–2 days)
- Fix morningNudge/Briefing to use planTodayWithHealth when available
- Wire `eveningLight.dimStartHoursBeforeBed`, `cannabis.minHoursBeforeBed`, `temperature.hotShowerMinutesBeforeBed` into computeHubermanReminders
- Fix buildCoachingPrompt: use protocol.body.injuries, add more Huberman context
- Add tests for computeHubermanReminders, pickWorkout

### Phase 2 — Wind-down + schedule (3–5 days)
- Add windDown.sequence, integrate with reminders
- Add exerciseTiming.idealWindowStart to schedule blocks
- Add nsdrTriggers (recovery-conditional)
- Time-specific Nudger (if desired)

### Phase 3 — Tracker + sleep shift (3–5 days)
- Huberman compliance in DailyRecord
- sleepShift.shiftMinutesPerStep + computed targets
- Evening wrap-up prompts for compliance
- Weekly summary Huberman stats

---

## 9. File Change Summary

| File | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| protocol.ts | Add new optional fields | windDown, nsdrTriggers | sleepShift |
| coaching-engine.ts | New reminders, fix prompt, nsdrTriggers | windDown in reminders | — |
| schedule-engine.ts | — | exerciseTiming block | — |
| index.ts | morningNudge use planTodayWithHealth | — | — |
| nudger.ts | — | sendReminderNudge (if time-specific) | — |
| tracker.ts | — | — | huberman in DailyRecord |
| services/briefing.ts | Use planTodayWithHealth | — | — |
| __tests__/*.test.ts | coaching-engine, protocol | schedule-engine formatHealthPlan | tracker huberman |
