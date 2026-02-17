# Whoop Integration Points — Coach Package Audit

> Audit of existing Coach code for Whoop biometric integration. Maps where Whoop data flows today and where it should plug in for Phase 4.

---

## 1. Existing Biometric Fields

### protocol.ts

| Field | Location | Current State |
|-------|----------|---------------|
| `avgHRV` | `protocol.ts:25` | **Defined but unused** — `sleep.baselines.avgHRV: number \| null` |
| `avgRHR` | `protocol.ts:26` | **Defined but unused** — `sleep.baselines.avgRHR: number \| null` |
| `recoveryGreenThreshold` | `protocol.ts:28` | **Defined but unused** — default 67 |
| `recoveryYellowThreshold` | `protocol.ts:29` | **Defined but unused** — default 34 |
| `sleepNeed` | `protocol.ts:27` | **Defined but unused** — default 8 |
| `withinMinutesOfWake` | `protocol.ts:58` | **Defined but unused** — `huberman.morningLight.withinMinutesOfWake: 60` |

**Data source:** All protocol fields come from `~/.golems-zikaron/coach/protocol.json` (manual edit or Obsidian export). No automatic refresh from Whoop.

**Critical finding:** `getRecoveryColor()` in `@golems/shared/whoop/types.ts:74-77` uses **hardcoded** thresholds (67, 34), not `protocol.sleep.baselines.recoveryGreenThreshold` / `recoveryYellowThreshold`. Protocol baselines are never passed to the Whoop types.

---

## 2. Where Whoop Data Should Flow

| Whoop Data | Should Go To | Current State | File:Line |
|------------|--------------|---------------|-----------|
| **Recovery score (0-100)** | coaching-engine: gate workout intensity | ✅ **Exists** — `pickWorkout(recoveryColor, ...)` | `coaching-engine.ts:97-138` |
| **Recovery color (red/yellow/green)** | coaching-engine: gate cold exposure suggestion | ❌ **Doesn't exist** — no cold exposure logic anywhere | N/A |
| **Recovery color** | coaching-engine: gate NSDR suggestion | ❌ **Doesn't exist** — NSDR always at fixed time | `coaching-engine.ts:62-63` |
| **HRV** | protocol.ts: avgHRV | Defined in protocol, **never populated from Whoop** | `protocol.ts:25` |
| **HRV** | coaching-engine: healthSnapshot | ✅ **Exists** — `hrvRmssd` from recovery | `coaching-engine.ts:172, 229` |
| **Sleep debt** | coaching-engine: trigger NSDR suggestion | ❌ **Doesn't exist** — no sleep debt calc or conditional NSDR | N/A |
| **Wake time** | coaching-engine: anchor caffeine/sunlight timers | ⚠️ **Manual only** — uses `protocol.sleep.targetWake`, not Whoop sleep end | `coaching-engine.ts:184-185` |
| **Strain** | coaching-engine: modify evening workout suggestion | ❌ **Doesn't exist** — `getTodayStrain()` not imported in coach | `index.ts:9` (only recovery, sleep) |
| **Sleep stages (REM %)** | tracker: correlate with cannabis/supplements | ❌ **Doesn't exist** — tracker has no health fields | `tracker.ts:16-24` |
| **Sleep consistency** | tracker: sleep shift progress | ❌ **Doesn't exist** — `DailyRecord` has no sleep fields | `tracker.ts:16-24` |

---

## 3. Exact Integration Points (File:Line)

### protocol.ts

| Line | What | Status |
|------|------|--------|
| 23-29 | `baselines: { avgHRV, avgRHR, sleepNeed, recoveryGreenThreshold, recoveryYellowThreshold }` | Defined, **unused** |
| 58 | `withinMinutesOfWake` | Defined, **unused** |

### coaching-engine.ts

| Line | What | Status |
|------|------|--------|
| 45-95 | `computeHubermanReminders(protocol, wakeTime)` | Uses `protocol.sleep.targetWake` — **not Whoop wake** |
| 62-63 | NSDR reminder | Fixed `idealTime` — **no recovery/sleep-debt conditional** |
| 97-138 | `pickWorkout(recoveryColor, protocol, dayOfWeek)` | ✅ Recovery-gated workout — **works** |
| 167-169 | `getRecoveryColor(recoveryScore)` | Uses shared types — **hardcoded 67/34**, ignores protocol |
| 182-185 | Huberman reminders | `input.protocol.sleep.targetWake` — **manual target, not actual** |

### schedule-engine.ts

| Line | What | Status |
|------|------|--------|
| 47-92 | `generateDailyPlan(events, statuses)` | **No recovery/health input** — plan is calendar + golem status only |
| 127-188 | `formatHealthPlanForTelegram(healthPlan)` | Receives coaching (incl. healthSnapshot) — **display only** |

**Schedule engine does NOT adapt blocks to recovery state.** It merges calendar + golem pending items. No "shorter focus blocks on red day" logic — that's only in fallback advice text (`generateFallbackAdvice`).

### nudger.ts

| Line | What | Status |
|------|------|--------|
| 15-21 | `sendMorningNudge(plan)` | Takes `DailyPlan` only — **no health data** |
| 26-46 | `sendEveningWrapup(planned, completed, missed)` | No health context |

**Nudger is NOT triggered by data events.** It's invoked by external scheduler (briefing, launchd). No "recovery just scored → send nudge" pattern.

### tracker.ts

| Line | What | Status |
|------|------|--------|
| 16-24 | `DailyRecord` | `{ date, plannedMeetings, attendedMeetings, pendingItems, completedItems }` — **no sleep/HRV/REM** |
| 58-74 | `recordDay(plan, completed)` | Records plan compliance only |

**Tracker has no biometric fields.** No correlation with cannabis, supplements, or sleep stages.

### composer.ts

| Line | What | Status |
|------|------|--------|
| 17-25 | `/plan` | Basic plan — no health | `composer.ts:17-25` |
| 28-49 | `/schedule` | Health-aware via `planTodayWithHealth()` | `composer.ts:28-49` |
| 52-75 | `/golems` | Ecosystem status — no health | `composer.ts:52-75` |

**No `/health` or `/recovery` command.** Health only appears in `/schedule` output.

### index.ts

| Line | What | Status |
|------|------|--------|
| 9 | Whoop imports | `getLatestRecovery`, `getLatestSleep` — **no `getTodayStrain`** |
| 65-91 | `planTodayWithHealth()` | Fetches recovery + sleep, passes to `generateCoaching` | `index.ts:65-91` |
| 35-38 | `morningNudge()` | Uses `planToday()` — **basic plan, no Whoop** | `index.ts:35-38` |

**Briefing** (`packages/services/src/briefing.ts:279-290`) uses `generateDailyPlan` + `formatPlanForTelegram` — **no Whoop**. Morning briefing is health-agnostic.

---

## 4. Integration Patterns

### Data Source Abstraction

**Current:** No abstraction. Whoop data is fetched directly in `index.ts` via `getLatestRecovery()` and `getLatestSleep()`. Protocol is loaded from disk via `loadProtocol()`. Everything is synchronous at plan-generation time.

**Recommendation:** Add a `WhoopDataSource` (or `HealthDataSource`) interface:

```ts
interface HealthDataSource {
  getRecovery(): Promise<WhoopRecovery | null>;
  getSleep(): Promise<WhoopSleep | null>;
  getStrain(): Promise<WhoopCycle | null>;
}
```

Default impl: calls `@golems/shared/whoop/client`. Could add a mock for tests. No need to refactor everything — start by passing strain into coaching when ready.

### OAuth Token Storage

**Current:** `packages/shared/src/whoop/client.ts`
- Env vars: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REFRESH_TOKEN`
- File cache: `/tmp/whoop-tokens.json` (access + refresh)
- Supabase: `golem_state` table, key `whoop_refresh_token` (survives deploys)

**Recommendation:** Keep as-is. Tokens already persist to Supabase. No change needed for Coach.

### Real-Time Data

**Current:** Coaching is generated **on-demand** when user runs `/schedule` or when `planTodayWithHealth()` is called. No cron that pre-generates plans. Briefing runs at 8am and does NOT use health data.

**Recommendation (incremental):**
1. **Phase 1:** Wire `getTodayStrain()` into `planTodayWithHealth()` and pass to `generateCoaching` — strain can influence evening workout suggestion.
2. **Phase 2:** Add actual wake time from `WhoopSleep.end` — use it in `computeHubermanReminders` when available, fallback to `targetWake`.
3. **Phase 3:** Add conditional NSDR (recovery/sleep-debt) — see `integration-map.md` nsdrTriggers.
4. **Phase 4:** Consider briefing using `planTodayWithHealth()` instead of `generateDailyPlan` — would require Whoop creds on Railway.

---

## 5. Test Coverage

| Area | Test File | Coverage |
|------|-----------|----------|
| Schedule engine | `schedule-engine.test.ts` | `generateDailyPlan`, `formatPlanForTelegram` — **no `formatHealthPlanForTelegram`** |
| Tracker | `tracker.test.ts` | `getWeeklySummary`, `formatWeeklySummary` — **no `recordDay` with health** |
| Status aggregator | `status-aggregator.test.ts` | `getPendingWork` only |
| **Coaching engine** | **None** | **No tests for `generateCoaching`, `pickWorkout`, `computeHubermanReminders`** |

**Critical gap:** No tests for recovery-gated workout suggestions. Adding Whoop-conditional logic without tests risks regressions.

**Recommendation:** Add `coaching-engine.test.ts` with:
- `pickWorkout` unit tests: red → walk+stretching, yellow → light bodyweight, green → run or strength
- `computeHubermanReminders` with mock protocol
- `generateCoaching` with mock Whoop data (recovery=25, recovery=50, recovery=75)

---

## 6. Recommended Implementation Approach (Incremental)

### Step 1: Wire protocol thresholds into recovery color
- **File:** `coaching-engine.ts`
- **Change:** Pass `protocol.sleep.baselines` to a new `getRecoveryColor(score, baselines?)` or use protocol thresholds when available. Fallback to 67/34 if null.
- **Risk:** Low. Protocol already has the fields.

### Step 2: Use actual wake time when available
- **File:** `coaching-engine.ts`, `index.ts`
- **Change:** `WhoopSleep.end` → extract wake time. Pass to `computeHubermanReminders`. Fallback to `targetWake` when sleep is null.
- **Risk:** Low. Clear fallback path.

### Step 3: Add strain to coaching input
- **File:** `index.ts` — add `getTodayStrain()` to Promise.all
- **File:** `coaching-engine.ts` — add `strain` to `CoachingInput`, use in `buildCoachingPrompt` and optionally in evening workout note
- **Risk:** Low. Additive.

### Step 4: Conditional NSDR
- **File:** `protocol.ts` — add `nsdrTriggers` (see integration-map.md)
- **File:** `coaching-engine.ts` — pass `recoveryColor` to `computeHubermanReminders`, gate NSDR
- **Risk:** Medium. Changes reminder logic.

### Step 5: Cold exposure (if desired)
- **File:** `protocol.ts` — add `huberman.coldExposure?: { suggestWhenRecovery: ("red"|"yellow")[] }`
- **File:** `coaching-engine.ts` — add conditional reminder when recovery matches
- **Risk:** Low. New feature.

### Step 6: Tracker + sleep correlation
- **File:** `tracker.ts` — extend `DailyRecord` with optional `sleepHours`, `remPercent`, `sleepConsistency`
- **File:** `recordDay` — accept optional Whoop snapshot, persist when available
- **Risk:** Medium. Schema change. Requires caller to pass Whoop data.

### Step 7: Add coaching-engine tests
- **File:** `coaching-engine.test.ts` (new)
- **Coverage:** `pickWorkout`, `computeHubermanReminders`, `generateCoaching` with mocked Whoop
- **Risk:** None. Pure addition.

---

## 7. Summary Table

| Integration Point | Exists | Used | Recommendation |
|------------------|--------|------|----------------|
| Recovery → workout gate | ✅ | ✅ | Keep. Add protocol thresholds. |
| Recovery → cold exposure | ❌ | ❌ | Add if desired. |
| Recovery → NSDR conditional | ❌ | ❌ | Add via nsdrTriggers. |
| HRV in protocol baselines | ✅ | ❌ | Populate from Whoop or remove. |
| Protocol recovery thresholds | ✅ | ❌ | Wire into getRecoveryColor. |
| Wake time from Whoop | ❌ | ❌ | Use sleep.end when available. |
| Strain in coaching | ❌ | ❌ | Add getTodayStrain, pass to coaching. |
| Sleep stages in tracker | ❌ | ❌ | Extend DailyRecord. |
| Nudger + health | ❌ | ❌ | morningNudge could use planTodayWithHealth. |
| Briefing + health | ❌ | ❌ | Optional: use planTodayWithHealth. |
