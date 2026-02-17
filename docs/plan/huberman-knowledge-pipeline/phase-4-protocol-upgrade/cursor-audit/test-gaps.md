# Test Gaps — Protocol Paths Coverage

## Current Test Files

| File | What's Tested |
|------|---------------|
| `tracker.test.ts` | recordDay, getWeeklySummary, formatWeeklySummary — compliance data, no protocol |
| `status-aggregator.test.ts` | getPendingWork — golem status extraction, priorities |
| `schedule-engine.test.ts` | generateDailyPlan, formatPlanForTelegram — events → blocks, pending items, summaries |

---

## What's Covered

- **Schedule engine:** Event → block conversion, all-day filter, sort by time, pending items from statuses, summary logic, formatPlanForTelegram
- **Tracker:** Empty state, weekly summary format, recordDay (implicit via getWeeklySummary)
- **Status aggregator:** Job matches, overdue follow-ups, unhealthy golems, priority sort, empty healthy golems

---

## What Has ZERO Test Coverage

### protocol.ts
- `loadProtocol()` — file exists, parse error, first-run write
- `saveProtocol()` — directory creation, write
- `getProtocolPath()` — return value
- `DEFAULT_PROTOCOL` shape / validation

### coaching-engine.ts
- `computeHubermanReminders()` — output format, time calculations (coffee, last caffeine, supplements)
- `pickWorkout()` — red/yellow/green branches, injury notes, day-of-week logic
- `buildCoachingPrompt()` — prompt structure, protocol fields included
- `generateCoaching()` — integration, fallback on LLM failure
- `generateFallbackAdvice()` — red/yellow/green branches

### schedule-engine.ts (partial)
- `formatHealthPlanForTelegram()` — **not tested** (only formatPlanForTelegram is)
- Health snapshot formatting, hubermanReminders section

### nudger.ts
- `sendMorningNudge()` — not tested (would need Telegram mock)
- `sendEveningWrapup()` — not tested

### index.ts
- `planToday()` — integration
- `planTodayWithHealth()` — integration with protocol, Whoop, coaching
- `morningNudge()` — integration
- `getStatus()` — output shape

### composer.ts
- Command handlers — would need Grammy mock

---

## Protocol Paths with ZERO Coverage

| Path | Risk |
|------|------|
| protocol.json → loadProtocol → generateCoaching | High — core flow untested |
| computeHubermanReminders time math | Medium — off-by-one, timezone bugs |
| pickWorkout recovery + day logic | Medium — wrong workout for edge cases |
| buildCoachingPrompt protocol injection | Medium — LLM gets wrong/missing context |
| formatHealthPlanForTelegram | Low — formatting only |
| morningNudge uses basic plan (no protocol) | High — design bug, no test would catch |

---

## Suggested New Tests

### 1. protocol.test.ts (new)
```ts
describe("loadProtocol", () => {
  test("returns DEFAULT_PROTOCOL when file missing");
  test("returns parsed protocol when file exists");
  test("falls back to DEFAULT on parse error");
  test("writes default on first run");
});
describe("saveProtocol", () => {
  test("creates directory if missing");
  test("writes valid JSON");
});
```

### 2. coaching-engine.test.ts (new)
```ts
describe("computeHubermanReminders", () => {
  test("includes coffee time from caffeineDelay + wake");
  test("includes last caffeine from lastCaffeine + targetBed");
  test("includes each supplement with correct time");
  test("includes NSDR at idealTime");
  test("includes hard coding stop");
  test("handles overnight rollover for late bed times");
});

describe("pickWorkout", () => {
  test("red → walk + stretching");
  test("yellow → walk + light bodyweight");
  test("green Sunday → walk + easy run");
  test("green Tuesday → walk + bodyweight strength");
  test("includes injury notes in all outputs");
});

describe("generateFallbackAdvice", () => {
  test("red recovery → take it easy message");
  test("yellow + low sleep → light day, coding stop");
  test("yellow + ok sleep → normal day, interview prep");
  test("green → push day message");
});
```

### 3. schedule-engine.test.ts (extend)
```ts
describe("formatHealthPlanForTelegram", () => {
  test("includes health snapshot with recovery color emoji");
  test("includes coaching advice");
  test("includes workout with notes");
  test("includes huberman reminders section when present");
  test("omits reminders section when empty");
});
```

### 4. Integration test (optional)
```ts
describe("planTodayWithHealth", () => {
  test("returns HealthAwarePlan with plan and coaching");
  test("coaching.hubermanReminders has expected count");
  test("coaching.workout matches recovery color");
});
```

---

## Mock Strategy

- **protocol:** Use temp dir + write test protocol.json, or mock `loadProtocol` to return fixture
- **Whoop:** Mock `getLatestRecovery` / `getLatestSleep` to return controlled data
- **Calendar:** Already mockable via `getTodayEvents` returning fixture
- **LLM:** `runCloudFree` throws or returns — test fallback path
- **Telegram:** Mock `sendNotification` or skip nudger tests (integration only)

---

## Priority Order for New Tests

1. **computeHubermanReminders** — highest value, pure function, easy to test
2. **pickWorkout** — pure function, critical for daily output
3. **loadProtocol / saveProtocol** — prevents protocol regressions
4. **formatHealthPlanForTelegram** — quick win, formatting
5. **generateFallbackAdvice** — important when LLM fails
6. **buildCoachingPrompt** — snapshot test for prompt structure
