/**
 * Owner Protocol Engine
 *
 * Loads the personal coaching protocol -- sleep rules, body constraints,
 * career phase, Huberman rules. Stored at ~/.golems-zikaron/coach/protocol.json.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "/tmp";
const PROTOCOL_DIR = join(HOME, ".golems-zikaron/coach");
const PROTOCOL_FILE = join(PROTOCOL_DIR, "protocol.json");

export interface CoachProtocol {
  sleep: {
    phase: "shift" | "maintaining" | "target";
    currentDay: number;
    targetBed: string;
    targetWake: string;
    hardCodingStop: string;
    lastSmokeBuffer: number;
    windDownDuration: number;
    baselines: {
      avgHRV: number | null;
      avgRHR: number | null;
      sleepNeed: number;
      recoveryGreenThreshold: number;
      recoveryYellowThreshold: number;
    };
  };
  body: {
    injuries: Array<{
      area: string;
      type: string;
      avoidMovements: string[];
      painThreshold: number;
    }>;
    workoutTiming: string;
    workoutTypes: string[];
  };
  career: {
    phase: string;
    interviewPrepRotation: Record<string, string>;
    dailyApplicationTarget: number;
    strategy: string;
  };
  schedule: {
    flowBlocks: number;
    flowBlockMinutes: number;
    breakMinutes: number;
    shabbatAware: boolean;
  };
  huberman: {
    morningLight: {
      minMinutes: number;
      cloudyMinutes: number;
      withinMinutesOfWake: number;
    };
    caffeineDelay: { minutesAfterWake: number };
    ultradianCycle: { focusMinutes: number; breakMinutes: number };
    nsdr: { durationMinutes: number; idealTime: string };
    afternoonLight: { minMinutes: number; idealTime: string };
    preSleepNoFood: { hoursBeforeBed: number };
    preSleepNoScreens: { hoursBeforeBed: number };
    lastCaffeine: { hoursBeforeBed: number };
    roomTemp: { celsius: { min: number; max: number } };
    supplements: {
      preSleep: Array<{
        name: string;
        dose: string;
        minutesBeforeBed: number;
      }>;
    };
  };
  coaching: {
    tone: string;
    language: string;
    neverNag: boolean;
  };
}

/** Default protocol -- populated from user's Obsidian notes */
const DEFAULT_PROTOCOL: CoachProtocol = {
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
    morningLight: {
      minMinutes: 5,
      cloudyMinutes: 20,
      withinMinutesOfWake: 60,
    },
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
        {
          name: "Magnesium L-Threonate",
          dose: "145mg",
          minutesBeforeBed: 60,
        },
        { name: "Apigenin", dose: "50mg", minutesBeforeBed: 60 },
      ],
    },
  },
  coaching: {
    tone: "direct-casual",
    language: "english",
    neverNag: true,
  },
};

/** Load protocol from disk, creating default if missing */
export function loadProtocol(): CoachProtocol {
  if (existsSync(PROTOCOL_FILE)) {
    try {
      return JSON.parse(readFileSync(PROTOCOL_FILE, "utf-8"));
    } catch {
      return DEFAULT_PROTOCOL;
    }
  }

  // First run -- write default
  saveProtocol(DEFAULT_PROTOCOL);
  return DEFAULT_PROTOCOL;
}

/** Save protocol to disk */
export function saveProtocol(protocol: CoachProtocol): void {
  if (!existsSync(PROTOCOL_DIR)) {
    mkdirSync(PROTOCOL_DIR, { recursive: true });
  }
  writeFileSync(PROTOCOL_FILE, JSON.stringify(protocol, null, 2));
}

/** Get the protocol file path (for tests) */
export function getProtocolPath(): string {
  return PROTOCOL_FILE;
}
