import { describe, test, expect, mock } from "bun:test";
import { generateCoaching } from "../coaching-engine";
import type { CoachProtocol } from "../protocol";
import type {
  WhoopRecovery,
  WhoopSleep,
} from "@golems/shared/whoop/types";
import { getRecoveryColor } from "@golems/shared/whoop/types";

// Mock runCloudFree so tests don't call real LLM
mock.module("@golems/shared/lib/vercel-llm", () => ({
  runCloudFree: async () => null, // force fallback advice
}));

// --- Fixtures ---

function makeProtocol(overrides?: Partial<CoachProtocol>): CoachProtocol {
  return {
    sleep: {
      phase: "shift",
      currentDay: 7,
      targetBed: "02:30",
      targetWake: "10:30",
      hardCodingStop: "00:30",
      lastSmokeBuffer: 120,
      windDownDuration: 120,
      baselines: {
        avgHRV: null,
        avgRHR: null,
        sleepNeed: 8,
        recoveryGreenThreshold: 67,
        recoveryYellowThreshold: 34,
      },
    },
    body: {
      injuries: [
        {
          area: "left shoulder",
          type: "tear",
          avoidMovements: ["heavy pressing", "overhead work"],
          painThreshold: 3,
        },
      ],
      workoutTiming: "after-wake",
      workoutTypes: ["easy-run", "zone2", "bodyweight", "walk", "stretching"],
    },
    career: {
      phase: "active-search",
      interviewPrepRotation: {
        Sunday: "System Design",
        Monday: "Leetcode",
        Tuesday: "Code Review",
        Wednesday: "Optimization",
        Thursday: "Behavioral-Technical",
      },
      dailyApplicationTarget: 2,
      strategy: "quality-targeted",
    },
    schedule: {
      flowBlocks: 3,
      flowBlockMinutes: 90,
      breakMinutes: 15,
      shabbatAware: true,
    },
    huberman: {
      morningLight: { minMinutes: 5, cloudyMinutes: 20, withinMinutesOfWake: 60 },
      caffeineDelay: { minutesAfterWake: 120 },
      ultradianCycle: { focusMinutes: 90, breakMinutes: 15 },
      nsdr: { durationMinutes: 10, idealTime: "14:00" },
      afternoonLight: { minMinutes: 10, idealTime: "15:00" },
      preSleepNoFood: { hoursBeforeBed: 3 },
      preSleepNoScreens: { hoursBeforeBed: 2 },
      lastCaffeine: { hoursBeforeBed: 10 },
      roomTemp: { celsius: { min: 18, max: 20 } },
      supplements: {
        preSleep: [
          { name: "Magnesium L-Threonate", dose: "145mg", minutesBeforeBed: 60 },
          { name: "Apigenin", dose: "50mg", minutesBeforeBed: 60 },
        ],
      },
    },
    coaching: { tone: "direct-casual", language: "english", neverNag: true },
    ...overrides,
  };
}

function makeRecovery(score: number): WhoopRecovery {
  return {
    cycleId: 1,
    score,
    hrvRmssd: 45,
    restingHeartRate: 58,
    spo2: 97,
    skinTemp: null,
    scoreState: "SCORED",
  };
}

function makeSleep(overrides?: Partial<WhoopSleep>): WhoopSleep {
  return {
    id: "sleep-1",
    start: "2026-02-17T02:30:00Z",
    end: "2026-02-17T10:30:00Z",
    durationMs: 8 * 3_600_000, // 8h
    qualityDurationMs: 7 * 3_600_000,
    remDurationMs: 1.5 * 3_600_000,
    deepDurationMs: 1.5 * 3_600_000,
    lightDurationMs: 4 * 3_600_000,
    awakeDurationMs: 1 * 3_600_000,
    sleepPerformance: 85,
    sleepConsistency: 70,
    sleepEfficiency: 88,
    scoreState: "SCORED",
    ...overrides,
  };
}

// --- getRecoveryColor tests ---

describe("getRecoveryColor", () => {
  test("green for score >= 67", () => {
    expect(getRecoveryColor(67)).toBe("green");
    expect(getRecoveryColor(100)).toBe("green");
    expect(getRecoveryColor(80)).toBe("green");
  });

  test("yellow for score 34-66", () => {
    expect(getRecoveryColor(34)).toBe("yellow");
    expect(getRecoveryColor(50)).toBe("yellow");
    expect(getRecoveryColor(66)).toBe("yellow");
  });

  test("red for score < 34", () => {
    expect(getRecoveryColor(0)).toBe("red");
    expect(getRecoveryColor(33)).toBe("red");
    expect(getRecoveryColor(10)).toBe("red");
  });
});

// --- generateCoaching tests ---

describe("generateCoaching", () => {
  test("red recovery → walk + stretching workout", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(20),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    expect(result.workout.type).toBe("walk + stretching");
    expect(result.workout.duration).toBe("20-30 min");
    expect(result.workout.notes).toContain("Recovery day");
    expect(result.healthSnapshot.recoveryColor).toBe("red");
  });

  test("yellow recovery → walk + light bodyweight", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(50),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Tuesday",
    });

    expect(result.workout.type).toBe("walk + light bodyweight");
    expect(result.workout.duration).toBe("30-40 min");
    expect(result.healthSnapshot.recoveryColor).toBe("yellow");
  });

  test("green recovery on run day → walk + easy run", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(80),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday", // run day
    });

    expect(result.workout.type).toBe("walk + easy run");
    expect(result.healthSnapshot.recoveryColor).toBe("green");
  });

  test("green recovery on strength day → bodyweight strength", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(80),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Tuesday", // strength day
    });

    expect(result.workout.type).toBe("walk + bodyweight strength");
  });

  test("workout notes include injury info", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(80),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    expect(result.workout.notes).toContain("left shoulder");
    expect(result.workout.notes).toContain("heavy pressing");
  });

  test("null recovery defaults to score 50 (yellow)", async () => {
    const result = await generateCoaching({
      recovery: null,
      sleep: null,
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    expect(result.healthSnapshot.recovery).toBe(50);
    expect(result.healthSnapshot.recoveryColor).toBe("yellow");
  });

  test("PENDING_SCORE recovery defaults to 50", async () => {
    const result = await generateCoaching({
      recovery: { ...makeRecovery(85), scoreState: "PENDING_SCORE" },
      sleep: null,
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    expect(result.healthSnapshot.recovery).toBe(50);
  });

  test("null sleep → 0 hours, 0 performance", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(70),
      sleep: null,
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    expect(result.healthSnapshot.sleepHours).toBe(0);
    expect(result.healthSnapshot.sleepPerformance).toBe(0);
  });

  test("sleep hours calculated correctly", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(70),
      sleep: makeSleep({ durationMs: 6.5 * 3_600_000 }),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    expect(result.healthSnapshot.sleepHours).toBe(6.5);
  });
});

// --- Huberman reminders tests ---

describe("huberman reminders", () => {
  test("includes caffeine delay from wake time", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(70),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    // Wake 10:30 + 120min = 12:30
    const coffeeReminder = result.hubermanReminders.find((r) =>
      r.startsWith("Coffee OK after"),
    );
    expect(coffeeReminder).toBe("Coffee OK after 12:30");
  });

  test("includes NSDR reminder", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(70),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    const nsdr = result.hubermanReminders.find((r) => r.includes("NSDR"));
    expect(nsdr).toBe("NSDR: 10min at 14:00");
  });

  test("includes afternoon sunlight", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(70),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    const sunlight = result.hubermanReminders.find((r) =>
      r.includes("Sunlight"),
    );
    expect(sunlight).toBe("Sunlight: 10min at 15:00");
  });

  test("includes last caffeine cutoff", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(70),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    // Bed 02:30 (= 26:30) - 10h = 16:30
    const lastCaff = result.hubermanReminders.find((r) =>
      r.startsWith("Last caffeine"),
    );
    expect(lastCaff).toBe("Last caffeine by 16:30");
  });

  test("includes supplement reminders with timing", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(70),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    // Bed 02:30 (= 26:30) - 60min = 25:30 = 01:30
    const mag = result.hubermanReminders.find((r) =>
      r.includes("Magnesium"),
    );
    expect(mag).toBe("Magnesium L-Threonate (145mg) at 01:30");

    const api = result.hubermanReminders.find((r) =>
      r.includes("Apigenin"),
    );
    expect(api).toBe("Apigenin (50mg) at 01:30");
  });

  test("includes hard coding stop", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(70),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    const stop = result.hubermanReminders.find((r) =>
      r.includes("coding stop"),
    );
    expect(stop).toBe("Hard coding stop: 00:30");
  });

  test("custom protocol values reflected in reminders", async () => {
    const protocol = makeProtocol();
    protocol.huberman.caffeineDelay.minutesAfterWake = 90;
    protocol.sleep.targetWake = "08:00";

    const result = await generateCoaching({
      recovery: makeRecovery(70),
      sleep: makeSleep(),
      protocol,
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    // Wake 08:00 + 90min = 09:30
    const coffeeReminder = result.hubermanReminders.find((r) =>
      r.startsWith("Coffee OK after"),
    );
    expect(coffeeReminder).toBe("Coffee OK after 09:30");
  });
});

// --- Fallback advice tests ---

describe("fallback advice", () => {
  test("red recovery advice mentions recovery day", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(25),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    expect(result.advice).toContain("red");
    expect(result.advice).toContain("25%");
  });

  test("yellow + low sleep advice mentions sleep hours", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(50),
      sleep: makeSleep({ durationMs: 4 * 3_600_000 }),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    expect(result.advice).toContain("yellow");
    expect(result.advice).toContain("4");
  });

  test("green recovery advice encourages push day", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(80),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    expect(result.advice).toContain("green");
    expect(result.advice).toContain("80%");
  });

  test("no Whoop data (null recovery + null sleep) → fallback advice", async () => {
    const result = await generateCoaching({
      recovery: null,
      sleep: null,
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });

    expect(result.advice).toContain("yellow");
    expect(result.advice.length).toBeGreaterThan(20);
  });
});

// --- Boundary threshold tests ---

describe("boundary thresholds", () => {
  test("recovery 33 → red workout (walk + stretching)", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(33),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });
    expect(result.workout.type).toBe("walk + stretching");
    expect(result.healthSnapshot.recoveryColor).toBe("red");
  });

  test("recovery 34 → yellow workout (walk + light bodyweight)", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(34),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });
    expect(result.workout.type).toBe("walk + light bodyweight");
    expect(result.healthSnapshot.recoveryColor).toBe("yellow");
  });

  test("recovery 66 → yellow workout", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(66),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });
    expect(result.workout.type).toBe("walk + light bodyweight");
    expect(result.healthSnapshot.recoveryColor).toBe("yellow");
  });

  test("recovery 67 → green workout", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(67),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });
    expect(result.workout.type).toBe("walk + easy run");
    expect(result.healthSnapshot.recoveryColor).toBe("green");
  });

  test("recovery 100 → green", async () => {
    const result = await generateCoaching({
      recovery: makeRecovery(100),
      sleep: makeSleep(),
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });
    expect(result.healthSnapshot.recoveryColor).toBe("green");
  });

  test("UNSCORABLE recovery defaults to 50 (yellow)", async () => {
    const result = await generateCoaching({
      recovery: { ...makeRecovery(0), scoreState: "UNSCORABLE" },
      sleep: null,
      protocol: makeProtocol(),
      calendar: [],
      pending: [],
      dayOfWeek: "Monday",
    });
    expect(result.healthSnapshot.recovery).toBe(50);
    expect(result.healthSnapshot.recoveryColor).toBe("yellow");
    expect(result.workout.type).toBe("walk + light bodyweight");
  });
});
