# Phase 4: Protocol Interface Upgrade

> [Back to main plan](../README.md)

## Goal

Expand the `CoachProtocol.huberman` TypeScript interface and `protocol.json` with all researched protocols — temperature, cannabis, NSDR triggers, wind-down sequence, gradual shift plan, evening light, exercise timing.

## Tools

- **Code audit:** Cursor IDE — audit current protocol.ts + coaching-engine.ts for integration points
- **Code:** Claude Code (Opus) — expand interfaces and defaults
- **Tests:** `bun test` in packages/coach

## Cursor Audit Prompt

Run in Cursor IDE. Drop output to `docs/plan/huberman-knowledge-pipeline/phase-4-protocol-upgrade/cursor-audit/`:

```
AUDIT TASK: Coach Protocol Integration Points

Analyze the Coach golem package and identify all integration points for expanding Huberman protocols.

READ these files:
- packages/coach/src/protocol.ts — current CoachProtocol interface
- packages/coach/src/coaching-engine.ts — computeHubermanReminders() + buildCoachingPrompt()
- packages/coach/src/schedule-engine.ts — how protocols feed into schedule
- packages/coach/src/nudger.ts — when/how nudges are sent
- packages/coach/src/index.ts — entry points
- packages/coach/src/__tests__/ — all test files

Answer these:
1. What protocol fields currently exist in `CoachProtocol.huberman`?
2. Where is `computeHubermanReminders()` called and how are its results used?
3. Does `buildCoachingPrompt()` pass all protocol data to the LLM?
4. How does `nudger.ts` decide when to send reminders?
5. What test coverage exists for Huberman-related code?
6. If I add new fields to CoachProtocol (temperature, cannabis, NSDR triggers, wind-down, shift plan), where would they need to be consumed?

Drop findings into: `docs/plan/huberman-knowledge-pipeline/phase-4-protocol-upgrade/cursor-audit/`
Create:
- `current-protocol-analysis.md` — all current Huberman fields and how they're used
- `integration-points.md` — where new protocol data needs to be wired in
- `test-coverage.md` — existing test coverage for protocol/coaching
- `recommendations.md` — suggested interface expansion
```

## New Protocol Fields (from Phase 3 research)

These will be finalized after Phase 3, but expected additions:

```typescript
huberman: {
  // ... existing fields ...

  // NEW: Temperature
  temperature: {
    hotShowerMinutesBeforeBed: number;    // ~60-90 min
    hotShowerDurationMinutes: number;     // 10-20 min
    coreTempDropMechanism: boolean;       // enable temp-based reminders
  };

  // NEW: Cannabis
  cannabis: {
    minHoursBeforeBed: number;            // 3-4 hours
    remSuppression: boolean;             // track awareness
    cutoffReminder: boolean;             // send reminder at cutoff time
  };

  // NEW: NSDR
  nsdrTriggers: {
    lowEnergyAfternoon: boolean;         // suggest NSDR on yellow/red recovery
    cantFallAsleep: boolean;             // suggest NSDR if still awake past target
    middleOfNightWake: boolean;          // suggest NSDR for night waking
    preferredDuration: number;           // 10, 20, or 30 min
    scriptUrl: string;                   // recommended YouTube/app link
  };

  // NEW: Wind-down sequence
  windDown: {
    screensOffHoursBeforeBed: number;    // 1-2 hours
    dimLightsHoursBeforeBed: number;     // 2-3 hours
    supplementsMinutesBeforeBed: number; // 30-60 min
    showerMinutesBeforeBed: number;      // 60-90 min
    sequence: string[];                  // ordered steps
  };

  // NEW: Gradual shift plan
  sleepShift: {
    shiftMinutesPerStep: number;         // 15 min
    daysPerStep: number;                 // 3-5 days
    currentStepStartDate: string;        // ISO date
    currentTargetBed: string;            // intermediate target
    finalTargetBed: string;              // end goal
    anchoringTools: string[];            // light, temp, meals
  };

  // NEW: Evening light
  eveningLight: {
    dimStartHoursBeforeBed: number;      // 2-3 hours
    overheadLightsOff: boolean;          // use side/low lights only
    blueBlockers: boolean;              // wear after dim start
    candlesOrRedLight: boolean;          // use warm-only lighting
  };

  // NEW: Exercise timing
  exerciseTiming: {
    idealWindowStart: string;            // "within 2h of wake"
    latestBeforeBed: number;             // hours before bed
    morningAnchorsCircadian: boolean;    // morning exercise = circadian anchor
  };
}
```

## Steps

1. Get Cursor audit results on current protocol integration
2. Finalize new fields based on Phase 3 research findings
3. Expand `CoachProtocol.huberman` interface in `protocol.ts`
4. Update `DEFAULT_PROTOCOL` with researched values
5. Update `protocol.json` on disk with new fields
6. Run `bun test` — ensure nothing breaks (backward compat)
7. Branch + PR + merge

## Depends On

- Phase 3 (need research findings to set correct values)

## Status

- [ ] Cursor audit of current integration points
- [ ] Finalize new protocol fields from research
- [ ] Expand TypeScript interface
- [ ] Update DEFAULT_PROTOCOL
- [ ] Update live protocol.json
- [ ] Tests pass
- [ ] Branch + PR + merge
