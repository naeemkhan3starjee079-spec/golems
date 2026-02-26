# Protocol Data Flow — Full Chain from JSON to Telegram

## Source

```
~/.golems-zikaron/coach/protocol.json
```

Loaded by `loadProtocol()` in `src/protocol.ts`. Falls back to `DEFAULT_PROTOCOL` if file missing or parse error. First run writes default to disk.

---

## Data Flow Diagram

```
protocol.json
     │
     ▼
loadProtocol()  [protocol.ts]
     │
     ├─────────────────────────────────────────────────────────────────┐
     │                                                                 │
     ▼                                                                 ▼
planTodayWithHealth()                                            morningNudge()
[index.ts]                                                       [index.ts]
     │                                                                 │
     │  protocol passed to generateCoaching()                           │  uses planToday() — NO protocol
     │                                                                 │  NO health data
     ▼                                                                 ▼
generateCoaching()                                              sendMorningNudge(plan)
[coaching-engine.ts]                                            [nudger.ts]
     │                                                                 │
     ├── computeHubermanReminders(protocol, targetWake)                 │
     │        → string[]                                                │
     ├── pickWorkout(recoveryColor, protocol, dayOfWeek)                │
     │        → { type, duration, notes }                              │
     ├── buildCoachingPrompt(input, health, workout)                    │
     │        → LLM prompt (uses protocol.sleep, protocol.career,       │
     │           hardcoded injuries)                                   │
     └── generateFallbackAdvice(input, healthSnapshot)                  │
              → uses protocol.sleep.hardCodingStop,                     │
                protocol.career.interviewPrepRotation                   │
     │                                                                 │
     ▼                                                                 ▼
CoachingOutput { advice, workout, hubermanReminders, healthSnapshot }   formatPlanForTelegram(plan)
     │                                                                 │  → basic plan only
     ▼                                                                 ▼
formatHealthPlanForTelegram(healthPlan)                         Telegram (basic plan)
[schedule-engine.ts]                                                    │
     │                                                                 │
     ▼                                                                 │
Telegram (/schedule command)                                           │
```

---

## Entry Points Summary

| Entry Point | Uses Protocol? | Uses Health? | Output |
|-------------|----------------|--------------|--------|
| `/plan` (composer) | No | No | Basic DailyPlan via formatPlanForTelegram |
| `/schedule` (composer) | Yes (via planTodayWithHealth) | Yes | HealthAwarePlan via formatHealthPlanForTelegram |
| `morningNudge()` (index) | **No** | **No** | Basic DailyPlan — protocol never used |
| Briefing (services) | **No** | **No** | Basic DailyPlan via generateDailyPlan |

---

## Critical Finding: morningNudge vs Briefing

- **morningNudge()** calls `planToday()` → `sendMorningNudge(plan)` → basic plan only. No Huberman reminders, no Whoop data.
- **Briefing** also uses `generateDailyPlan()` directly — no protocol, no health.
- **Only `/schedule`** Telegram command gets full protocol + health flow.

---

## Protocol Sections → Consumers

| Section | Consumer | How Used |
|---------|----------|----------|
| `sleep.targetBed` | computeHubermanReminders, buildCoachingPrompt | Last caffeine calc, supplements calc, coding stop |
| `sleep.targetWake` | computeHubermanReminders | Wake time for coffee delay |
| `sleep.hardCodingStop` | computeHubermanReminders, buildCoachingPrompt, generateFallbackAdvice | Reminder + LLM context |
| `sleep.lastSmokeBuffer` | **Unused** | — |
| `sleep.windDownDuration` | **Unused** | — |
| `sleep.baselines` | **Unused** | — |
| `body.injuries` | pickWorkout, buildCoachingPrompt (hardcoded!) | Workout notes, LLM context |
| `body.workoutTiming` | **Unused** | — |
| `body.workoutTypes` | **Unused** | — |
| `career.*` | buildCoachingPrompt, generateFallbackAdvice | Interview prep, LLM context |
| `schedule.*` | **Unused** | — |
| `huberman.caffeineDelay` | computeHubermanReminders | Coffee OK time |
| `huberman.nsdr` | computeHubermanReminders | NSDR reminder (duration hardcoded 10min) |
| `huberman.afternoonLight` | computeHubermanReminders | Sunlight reminder (minMinutes hardcoded 10) |
| `huberman.preSleepNoFood` | **Unused** | — |
| `huberman.preSleepNoScreens` | **Unused** | — |
| `huberman.lastCaffeine` | computeHubermanReminders | Last caffeine by time |
| `huberman.roomTemp` | **Unused** | — |
| `huberman.supplements.preSleep` | computeHubermanReminders | Supplement times |
| `huberman.ultradianCycle` | **Unused** | — |
| `huberman.morningLight` | **Unused** | — |
| `coaching.*` | **Unused** | — |

---

## schedule-engine Protocol Usage

**generateDailyPlan()** does NOT receive or use protocol. It only gets:
- `CalendarEvent[]`
- `EcosystemStatus`

**formatHealthPlanForTelegram()** receives `HealthAwarePlan` which includes `coaching.hubermanReminders` — those reminders are computed in coaching-engine from protocol. So protocol reaches the schedule output only indirectly via CoachingOutput.
