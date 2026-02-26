# CoachGolem Upgrade — MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Get CoachGolem working tonight so user can generate a health-aware daily plan for tomorrow using Whoop data + Huberman protocols + personal context.

**Architecture:** Whoop OAuth2 client in `@golems/shared`, protocol engine + coaching LLM in `@golems/coach`, upgraded `/plan` Telegram command.

**Tech Stack:** Bun, TypeScript, Whoop REST API v2, Vercel AI SDK (Gemini Flash-Lite), Grammy (Telegram), 1Password CLI.

---

## Task 1: Whoop Types

**Files:**
- Create: `packages/shared/src/whoop/types.ts`

**Step 1: Create the types file**

```typescript
// packages/shared/src/whoop/types.ts

/** Whoop OAuth2 token pair */
export interface WhoopTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp (ms)
}

/** Whoop Recovery (from /cycle/{id}/recovery) */
export interface WhoopRecovery {
  cycleId: number;
  score: number;         // 0-100
  hrvRmssd: number;      // ms
  restingHeartRate: number;
  spo2: number | null;   // %
  skinTemp: number | null; // celsius
  scoreState: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
}

/** Whoop Sleep (from /activity/sleep) */
export interface WhoopSleep {
  id: string;
  start: string;       // ISO
  end: string;         // ISO
  durationMs: number;
  qualityDurationMs: number;   // non-awake time
  remDurationMs: number;
  deepDurationMs: number;
  lightDurationMs: number;
  awakeDurationMs: number;
  sleepPerformance: number;     // 0-100%
  sleepConsistency: number;     // 0-100%
  sleepEfficiency: number;      // 0-100%
  scoreState: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
}

/** Whoop Cycle (physiological day, sleep-to-sleep) */
export interface WhoopCycle {
  id: number;
  userId: number;
  start: string;
  end: string | null;
  strain: number;
  kilojoule: number;
  averageHeartRate: number;
  maxHeartRate: number;
  scoreState: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
}

/** Whoop Workout */
export interface WhoopWorkout {
  id: string;
  sportName: string;
  start: string;
  end: string;
  strain: number;
  averageHeartRate: number;
  maxHeartRate: number;
  kilojoule: number;
  distanceMeters: number | null;
  scoreState: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
}

/** Paginated API response */
export interface WhoopPaginatedResponse<T> {
  records: T[];
  next_token: string | null;
}

/** Recovery color based on score */
export type RecoveryColor = "green" | "yellow" | "red";

export function getRecoveryColor(score: number): RecoveryColor {
  if (score >= 67) return "green";
  if (score >= 34) return "yellow";
  return "red";
}
```

**Step 2: Commit**

```bash
git add packages/shared/src/whoop/types.ts
git commit -m "feat(shared): add Whoop API types"
```

---

## Task 2: Whoop OAuth2 Auth Flow

**Files:**
- Create: `packages/shared/src/whoop/auth-server.ts`

**Step 1: Create one-time OAuth2 callback server**

```typescript
// packages/shared/src/whoop/auth-server.ts
/**
 * One-time OAuth2 authorization server for Whoop.
 *
 * Run this once: `bun packages/shared/src/whoop/auth-server.ts`
 * Opens browser → user authorizes → captures refresh token → stores in 1Password.
 */

import { execSync } from "child_process";

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const REDIRECT_URI = "http://localhost:3847/whoop/callback";
const SCOPES = "read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement offline";

// Read credentials from 1Password
function getCredentials() {
  const clientId = execSync("op read 'op://development/WHOOP Developer API/Client ID'", { encoding: "utf-8" }).trim();
  const clientSecret = execSync("op read 'op://development/WHOOP Developer API/credential'", { encoding: "utf-8" }).trim();
  return { clientId, clientSecret };
}

async function main() {
  const { clientId, clientSecret } = getCredentials();

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    state: crypto.randomUUID(),
  });

  const authUrl = `${WHOOP_AUTH_URL}?${params}`;
  console.log("\n🔐 Opening browser for Whoop authorization...\n");
  console.log(`If browser doesn't open, visit:\n${authUrl}\n`);
  execSync(`open "${authUrl}"`);

  // Start callback server
  const server = Bun.serve({
    port: 3847,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname !== "/whoop/callback") {
        return new Response("Not found", { status: 404 });
      }

      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing authorization code", { status: 400 });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        console.error("❌ Token exchange failed:", err);
        return new Response(`Token exchange failed: ${err}`, { status: 500 });
      }

      const tokens = await tokenResponse.json() as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      console.log("✅ Got access token!");
      console.log(`   Access token expires in: ${tokens.expires_in}s`);
      console.log(`   Refresh token: ${tokens.refresh_token.slice(0, 10)}...`);

      // Store refresh token in 1Password
      try {
        execSync(
          `op item edit "WHOOP Developer API" --vault development 'Refresh Token[password]=${tokens.refresh_token}'`,
          { encoding: "utf-8" }
        );
        console.log("✅ Refresh token saved to 1Password");
      } catch (e) {
        console.error("⚠️  Could not save to 1Password, printing token:");
        console.log(`   WHOOP_REFRESH_TOKEN=${tokens.refresh_token}`);
      }

      // Shut down server after short delay
      setTimeout(() => {
        server.stop();
        process.exit(0);
      }, 1000);

      return new Response(
        "<html><body><h1>✅ Whoop authorized!</h1><p>You can close this tab.</p></body></html>",
        { headers: { "Content-Type": "text/html" } }
      );
    },
  });

  console.log(`🌐 Waiting for callback on http://localhost:3847/whoop/callback\n`);
}

if (import.meta.main) {
  main().catch(console.error);
}
```

**Step 2: Run the auth flow**

```bash
bun packages/shared/src/whoop/auth-server.ts
```

Expected: Browser opens Whoop login, user authorizes, refresh token stored in 1Password.

**Step 3: Verify token is stored**

```bash
op read 'op://development/WHOOP Developer API/Refresh Token'
```

Expected: Shows the refresh token value.

**Step 4: Commit**

```bash
git add packages/shared/src/whoop/auth-server.ts
git commit -m "feat(shared): Whoop OAuth2 auth flow"
```

---

## Task 3: Whoop Client

**Files:**
- Create: `packages/shared/src/whoop/client.ts`

**Step 1: Create the client**

```typescript
// packages/shared/src/whoop/client.ts
/**
 * Whoop API Client
 *
 * Handles OAuth2 token refresh and API calls.
 * Credentials from 1Password or env vars.
 */

import { execSync } from "child_process";
import type {
  WhoopTokens,
  WhoopRecovery,
  WhoopSleep,
  WhoopCycle,
  WhoopWorkout,
  WhoopPaginatedResponse,
} from "./types";

const BASE_URL = "https://api.prod.whoop.com/developer/v1";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const TOKEN_BUFFER_MS = 5 * 60 * 1000; // Refresh 5min before expiry

let cachedTokens: WhoopTokens | null = null;

/** Read credentials — env vars first, 1Password fallback */
function getCredentials(): { clientId: string; clientSecret: string; refreshToken: string } {
  const clientId = process.env.WHOOP_CLIENT_ID
    || execSync("op read 'op://development/WHOOP Developer API/Client ID'", { encoding: "utf-8" }).trim();
  const clientSecret = process.env.WHOOP_CLIENT_SECRET
    || execSync("op read 'op://development/WHOOP Developer API/credential'", { encoding: "utf-8" }).trim();
  const refreshToken = process.env.WHOOP_REFRESH_TOKEN
    || execSync("op read 'op://development/WHOOP Developer API/Refresh Token'", { encoding: "utf-8" }).trim();
  return { clientId, clientSecret, refreshToken };
}

/** Get a valid access token, refreshing if needed */
async function getAccessToken(): Promise<string> {
  if (cachedTokens && cachedTokens.expires_at > Date.now() + TOKEN_BUFFER_MS) {
    return cachedTokens.access_token;
  }

  const { clientId, clientSecret, refreshToken } = getCredentials();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: cachedTokens?.refresh_token ?? refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: "offline read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whoop token refresh failed (${response.status}): ${err}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  cachedTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedTokens.access_token;
}

/** Make an authenticated GET request to Whoop API */
async function whoopGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whoop API error (${response.status} ${path}): ${err}`);
  }

  return response.json() as Promise<T>;
}

/** Get latest recovery (current cycle) */
export async function getLatestRecovery(): Promise<WhoopRecovery | null> {
  const cycles = await whoopGet<WhoopPaginatedResponse<any>>("/cycle", { limit: "1" });
  if (cycles.records.length === 0) return null;

  const cycle = cycles.records[0];
  try {
    const recovery = await whoopGet<any>(`/cycle/${cycle.id}/recovery`);

    if (recovery.score_state !== "SCORED") {
      return {
        cycleId: cycle.id,
        score: 0,
        hrvRmssd: 0,
        restingHeartRate: 0,
        spo2: null,
        skinTemp: null,
        scoreState: recovery.score_state,
      };
    }

    return {
      cycleId: cycle.id,
      score: recovery.score.recovery_score,
      hrvRmssd: recovery.score.hrv_rmssd_milli,
      restingHeartRate: recovery.score.resting_heart_rate,
      spo2: recovery.score.spo2_percentage ?? null,
      skinTemp: recovery.score.skin_temp_celsius ?? null,
      scoreState: "SCORED",
    };
  } catch {
    return null; // No recovery for this cycle yet
  }
}

/** Get latest sleep */
export async function getLatestSleep(): Promise<WhoopSleep | null> {
  const sleeps = await whoopGet<WhoopPaginatedResponse<any>>("/activity/sleep", { limit: "1" });
  if (sleeps.records.length === 0) return null;

  const s = sleeps.records[0];
  if (s.score_state !== "SCORED") {
    return {
      id: s.id,
      start: s.start,
      end: s.end,
      durationMs: 0,
      qualityDurationMs: 0,
      remDurationMs: 0,
      deepDurationMs: 0,
      lightDurationMs: 0,
      awakeDurationMs: 0,
      sleepPerformance: 0,
      sleepConsistency: 0,
      sleepEfficiency: 0,
      scoreState: s.score_state,
    };
  }

  return {
    id: s.id,
    start: s.start,
    end: s.end,
    durationMs: s.score.stage_summary.total_in_bed_time_milli ?? 0,
    qualityDurationMs: s.score.stage_summary.total_no_data_time_milli
      ? (s.score.stage_summary.total_in_bed_time_milli - s.score.stage_summary.total_awake_time_milli)
      : 0,
    remDurationMs: s.score.stage_summary.total_rem_sleep_time_milli ?? 0,
    deepDurationMs: s.score.stage_summary.total_slow_wave_sleep_time_milli ?? 0,
    lightDurationMs: s.score.stage_summary.total_light_sleep_time_milli ?? 0,
    awakeDurationMs: s.score.stage_summary.total_awake_time_milli ?? 0,
    sleepPerformance: s.score.sleep_performance_percentage ?? 0,
    sleepConsistency: s.score.sleep_consistency_percentage ?? 0,
    sleepEfficiency: s.score.sleep_efficiency_percentage ?? 0,
    scoreState: "SCORED",
  };
}

/** Get current cycle strain */
export async function getTodayStrain(): Promise<WhoopCycle | null> {
  const cycles = await whoopGet<WhoopPaginatedResponse<any>>("/cycle", { limit: "1" });
  if (cycles.records.length === 0) return null;

  const c = cycles.records[0];
  return {
    id: c.id,
    userId: c.user_id,
    start: c.start,
    end: c.end,
    strain: c.score?.strain ?? 0,
    kilojoule: c.score?.kilojoule ?? 0,
    averageHeartRate: c.score?.average_heart_rate ?? 0,
    maxHeartRate: c.score?.max_heart_rate ?? 0,
    scoreState: c.score_state,
  };
}

/** Get recent workouts */
export async function getRecentWorkouts(limit = 5): Promise<WhoopWorkout[]> {
  const workouts = await whoopGet<WhoopPaginatedResponse<any>>("/activity/workout", { limit: String(limit) });

  return workouts.records
    .filter((w: any) => w.score_state === "SCORED")
    .map((w: any) => ({
      id: w.id,
      sportName: w.sport_name ?? "Activity",
      start: w.start,
      end: w.end,
      strain: w.score?.strain ?? 0,
      averageHeartRate: w.score?.average_heart_rate ?? 0,
      maxHeartRate: w.score?.max_heart_rate ?? 0,
      kilojoule: w.score?.kilojoule ?? 0,
      distanceMeters: w.score?.distance_meter ?? null,
      scoreState: "SCORED" as const,
    }));
}

/** Reset cached tokens (for testing) */
export function _resetTokens(): void {
  cachedTokens = null;
}
```

**Step 2: Verify it works (manual test)**

```bash
bun -e "import { getLatestRecovery, getLatestSleep } from './packages/shared/src/whoop/client'; const r = await getLatestRecovery(); const s = await getLatestSleep(); console.log('Recovery:', r); console.log('Sleep:', s);"
```

Expected: Recovery and sleep data printed from Whoop API.

**Step 3: Commit**

```bash
git add packages/shared/src/whoop/client.ts
git commit -m "feat(shared): Whoop API client with OAuth2 token refresh"
```

---

## Task 4: Protocol Engine + Default Protocol

**Files:**
- Create: `packages/coach/src/protocol.ts`

**Step 1: Create protocol engine + default JSON**

```typescript
// packages/coach/src/protocol.ts
/**
 * Owner Protocol Engine
 *
 * Loads the personal coaching protocol — sleep rules, body constraints,
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
    morningLight: { minMinutes: number; cloudyMinutes: number; withinMinutesOfWake: number };
    caffeineDelay: { minutesAfterWake: number };
    ultradianCycle: { focusMinutes: number; breakMinutes: number };
    nsdr: { durationMinutes: number; idealTime: string };
    afternoonLight: { minMinutes: number; idealTime: string };
    preSleepNoFood: { hoursBeforeBed: number };
    preSleepNoScreens: { hoursBeforeBed: number };
    lastCaffeine: { hoursBeforeBed: number };
    roomTemp: { celsius: { min: number; max: number } };
    supplements: {
      preSleep: Array<{ name: string; dose: string; minutesBeforeBed: number }>;
    };
  };
  coaching: {
    tone: string;
    language: string;
    neverNag: boolean;
  };
}

/** Default protocol — populated from user's Obsidian notes */
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

  // First run — write default
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
```

**Step 2: Commit**

```bash
git add packages/coach/src/protocol.ts
git commit -m "feat(coach): protocol engine with Huberman rules + owner context"
```

---

## Task 5: Coaching Engine (LLM)

**Files:**
- Create: `packages/coach/src/coaching-engine.ts`

**Step 1: Create the coaching engine**

```typescript
// packages/coach/src/coaching-engine.ts
/**
 * LLM Coaching Engine
 *
 * Synthesizes Whoop data + protocol + calendar into personalized coaching advice.
 * Uses Gemini Flash-Lite (free) via @golems/shared.
 */

import { runCloudFree } from "@golems/shared/lib/vercel-llm";
import type { WhoopRecovery, WhoopSleep, RecoveryColor } from "@golems/shared/whoop/types";
import { getRecoveryColor } from "@golems/shared/whoop/types";
import type { CoachProtocol } from "./protocol";
import type { CalendarEvent } from "./calendar-client";
import type { PendingWorkItem } from "./status-aggregator";

export interface CoachingInput {
  recovery: WhoopRecovery | null;
  sleep: WhoopSleep | null;
  protocol: CoachProtocol;
  calendar: CalendarEvent[];
  pending: PendingWorkItem[];
  dayOfWeek: string;
}

export interface CoachingOutput {
  advice: string;
  workout: { type: string; duration: string; notes: string };
  hubermanReminders: string[];
  healthSnapshot: {
    recovery: number;
    recoveryColor: RecoveryColor;
    sleepHours: number;
    sleepPerformance: number;
    hrvRmssd: number;
  };
}

function msToHours(ms: number): number {
  return Math.round((ms / 3_600_000) * 10) / 10;
}

function computeHubermanReminders(protocol: CoachProtocol, wakeTime: string): string[] {
  const reminders: string[] = [];
  const [wakeH, wakeM] = wakeTime.split(":").map(Number);
  const wakeMinutes = wakeH * 60 + wakeM;

  // Caffeine delay
  const coffeeMinutes = wakeMinutes + protocol.huberman.caffeineDelay.minutesAfterWake;
  const coffeeH = Math.floor(coffeeMinutes / 60) % 24;
  const coffeeM = coffeeMinutes % 60;
  reminders.push(`Coffee OK after ${String(coffeeH).padStart(2, "0")}:${String(coffeeM).padStart(2, "0")}`);

  // NSDR
  reminders.push(`NSDR: 10min at ${protocol.huberman.nsdr.idealTime}`);

  // Afternoon light
  reminders.push(`Sunlight: 10min at ${protocol.huberman.afternoonLight.idealTime}`);

  // Last caffeine
  const [bedH, bedM] = protocol.sleep.targetBed.split(":").map(Number);
  const bedMinutes = (bedH < 12 ? bedH + 24 : bedH) * 60 + bedM;
  const lastCafMinutes = bedMinutes - protocol.huberman.lastCaffeine.hoursBeforeBed * 60;
  const lcH = Math.floor(lastCafMinutes / 60) % 24;
  const lcM = lastCafMinutes % 60;
  reminders.push(`Last caffeine by ${String(lcH).padStart(2, "0")}:${String(lcM).padStart(2, "0")}`);

  // Supplements
  for (const supp of protocol.huberman.supplements.preSleep) {
    const suppMinutes = bedMinutes - supp.minutesBeforeBed;
    const sH = Math.floor(suppMinutes / 60) % 24;
    const sM = suppMinutes % 60;
    reminders.push(`${supp.name} (${supp.dose}) at ${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`);
  }

  // Coding stop
  reminders.push(`Hard coding stop: ${protocol.sleep.hardCodingStop}`);

  return reminders;
}

function pickWorkout(
  recoveryColor: RecoveryColor,
  protocol: CoachProtocol,
  dayOfWeek: string,
): { type: string; duration: string; notes: string } {
  const injuries = protocol.body.injuries.map((i) => `${i.area}: avoid ${i.avoidMovements.join(", ")}`).join(". ");

  if (recoveryColor === "red") {
    return {
      type: "walk + stretching",
      duration: "20-30 min",
      notes: `Recovery day. Light walk only. ${injuries}`,
    };
  }

  if (recoveryColor === "yellow") {
    return {
      type: "walk + light bodyweight",
      duration: "30-40 min",
      notes: `Moderate day. Easy movement. ${injuries}`,
    };
  }

  // Green — alternate run/strength based on day
  const isRunDay = ["Sunday", "Monday", "Wednesday", "Friday"].includes(dayOfWeek);
  if (isRunDay) {
    return {
      type: "walk + easy run",
      duration: "40-45 min",
      notes: `Green day! 10min walk + 20-25min easy jog. ${injuries}`,
    };
  }

  return {
    type: "walk + bodyweight strength",
    duration: "35-40 min",
    notes: `Green day! 10min walk + squats, lunges, glute bridges, dead bugs. ${injuries}`,
  };
}

/** Generate rule-based fallback (no LLM needed) */
function generateFallbackAdvice(input: CoachingInput, healthSnapshot: CoachingOutput["healthSnapshot"]): string {
  const color = healthSnapshot.recoveryColor;
  const sleepH = healthSnapshot.sleepHours;

  if (color === "red") {
    return `Recovery ${healthSnapshot.recovery}% (red). Take it easy today — walk only, shorter focus blocks. Get to bed on time tonight.`;
  }
  if (color === "yellow") {
    if (sleepH < 6) {
      return `Recovery ${healthSnapshot.recovery}% (yellow), only ${sleepH}h sleep. Light day — moderate workout, keep coding stop strict at ${input.protocol.sleep.hardCodingStop}.`;
    }
    return `Recovery ${healthSnapshot.recovery}% (yellow). Normal day — moderate effort. Interview prep: ${input.protocol.career.interviewPrepRotation[input.dayOfWeek] || "flex day"}.`;
  }
  return `Recovery ${healthSnapshot.recovery}% (green)! Push day. Go for a run, deep work marathon, knock out applications. You've got the energy.`;
}

/** Generate coaching advice using LLM */
export async function generateCoaching(input: CoachingInput): Promise<CoachingOutput> {
  const recovery = input.recovery;
  const sleep = input.sleep;
  const recoveryScore = recovery?.scoreState === "SCORED" ? recovery.score : 50;
  const recoveryColor = getRecoveryColor(recoveryScore);
  const sleepHours = sleep ? msToHours(sleep.durationMs) : 0;
  const sleepPerf = sleep?.sleepPerformance ?? 0;
  const hrv = recovery?.hrvRmssd ?? 0;

  const healthSnapshot: CoachingOutput["healthSnapshot"] = {
    recovery: recoveryScore,
    recoveryColor,
    sleepHours,
    sleepPerformance: sleepPerf,
    hrvRmssd: hrv,
  };

  const workout = pickWorkout(recoveryColor, input.protocol, input.dayOfWeek);
  const hubermanReminders = computeHubermanReminders(input.protocol, input.protocol.sleep.targetWake);

  // Try LLM for natural coaching advice
  let advice: string;
  try {
    const prompt = buildCoachingPrompt(input, healthSnapshot, workout);
    const llmResult = await runCloudFree(prompt, "coach");
    advice = llmResult || generateFallbackAdvice(input, healthSnapshot);
  } catch {
    advice = generateFallbackAdvice(input, healthSnapshot);
  }

  return { advice, workout, hubermanReminders, healthSnapshot };
}

function buildCoachingPrompt(
  input: CoachingInput,
  health: CoachingOutput["healthSnapshot"],
  workout: CoachingOutput["workout"],
): string {
  const p = input.protocol;
  const meetings = input.calendar
    .filter((e) => !e.allDay)
    .map((e) => `${e.summary} (${e.start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })})`)
    .join(", ") || "none";
  const pendingStr = input.pending.slice(0, 5).map((w) => `[${w.priority}] ${w.item}`).join("; ") || "none";

  const interviewFocus = p.career.interviewPrepRotation[input.dayOfWeek] || "flex day";
  const isShabbat = input.dayOfWeek === "Friday" || input.dayOfWeek === "Saturday";

  return `You are a personal coach for a software developer. Be direct, casual, no fluff. Under 120 words.

HEALTH:
- Recovery: ${health.recovery}% (${health.recoveryColor}) | HRV: ${health.hrvRmssd.toFixed(0)}ms
- Sleep: ${health.sleepHours}h (${health.sleepPerformance}% quality)

CONTEXT:
- Day: ${input.dayOfWeek}${isShabbat ? " (Shabbat)" : ""}
- Injuries: left shoulder tear (no heavy pressing/overhead)
- Career: active job search, interview prep focus today: ${interviewFocus}
- Sleep target: bed ${p.sleep.targetBed}, wake ${p.sleep.targetWake}
- Coding stop: ${p.sleep.hardCodingStop}
- Meetings: ${meetings}
- Pending golem tasks: ${pendingStr}

WORKOUT PLAN: ${workout.type} (${workout.duration})

Generate a brief, personalized daily coaching message. Include:
1. How to use today's energy based on recovery color
2. One specific tip about sleep/recovery/focus
3. If anything needs adjusting based on the data

Keep it motivating but real. No generic advice.`;
}
```

**Step 2: Commit**

```bash
git add packages/coach/src/coaching-engine.ts
git commit -m "feat(coach): LLM coaching engine with Whoop + Huberman integration"
```

---

## Task 6: Upgrade Schedule Engine + Plan Command

**Files:**
- Modify: `packages/coach/src/schedule-engine.ts`
- Modify: `packages/coach/src/index.ts`
- Modify: `packages/coach/src/composer.ts`

**Step 1: Add health-aware plan generation to index.ts**

Add new `planTodayWithHealth()` function that gathers Whoop data and generates coaching:

```typescript
// Add to packages/coach/src/index.ts — new imports and function

import { getLatestRecovery, getLatestSleep } from "@golems/shared/whoop/client";
import { loadProtocol } from "./protocol";
import { generateCoaching, type CoachingOutput } from "./coaching-engine";
import { getPendingWork } from "./status-aggregator";

export interface HealthAwarePlan {
  plan: DailyPlan;
  coaching: CoachingOutput;
}

/** Generate today's plan with Whoop health data + LLM coaching */
export async function planTodayWithHealth(): Promise<HealthAwarePlan> {
  const [events, status, recovery, sleep] = await Promise.all([
    getTodayEvents().catch(() => []),
    getEcosystemStatus(),
    getLatestRecovery().catch(() => null),
    getLatestSleep().catch(() => null),
  ]);

  const protocol = loadProtocol();
  const pending = getPendingWork(status);
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const coaching = await generateCoaching({
    recovery,
    sleep,
    protocol,
    calendar: events,
    pending,
    dayOfWeek,
  });

  const plan = generateDailyPlan(events, status);

  return { plan, coaching };
}
```

**Step 2: Add health-aware Telegram formatter**

```typescript
// Add to packages/coach/src/schedule-engine.ts

import type { CoachingOutput } from "./coaching-engine";
import type { HealthAwarePlan } from "./index";

export function formatHealthPlanForTelegram(healthPlan: HealthAwarePlan): string {
  const { plan, coaching } = healthPlan;
  const h = coaching.healthSnapshot;
  const lines: string[] = [];

  // Health snapshot
  const colorEmoji = h.recoveryColor === "green" ? "🟢" : h.recoveryColor === "yellow" ? "🟡" : "🔴";
  lines.push(`${plan.greeting}!`);
  lines.push("");
  lines.push(`${colorEmoji} Recovery: ${h.recovery}% | Sleep: ${h.sleepHours}h (${h.sleepPerformance}%) | HRV: ${h.hrvRmssd.toFixed(0)}ms`);

  // Coaching advice
  lines.push("");
  lines.push(coaching.advice);

  // Workout
  lines.push("");
  lines.push(`💪 Workout: ${coaching.workout.type} (${coaching.workout.duration})`);
  if (coaching.workout.notes) {
    lines.push(`   ${coaching.workout.notes}`);
  }

  // Schedule
  if (plan.blocks.length > 0) {
    lines.push("");
    lines.push("📅 Schedule:");
    for (const block of plan.blocks) {
      lines.push(`  ${block.start}–${block.end}  ${block.title}`);
    }
  }

  // Pending items
  if (plan.pendingItems.length > 0) {
    lines.push("");
    lines.push("📋 Pending:");
    for (const item of plan.pendingItems.slice(0, 5)) {
      lines.push(`  ${item}`);
    }
  }

  // Huberman reminders
  if (coaching.hubermanReminders.length > 0) {
    lines.push("");
    lines.push("⏰ Reminders:");
    for (const r of coaching.hubermanReminders) {
      lines.push(`  • ${r}`);
    }
  }

  return lines.join("\n");
}
```

**Step 3: Update composer.ts /plan command**

Replace the `/plan` handler in `packages/coach/src/composer.ts` to use health-aware plan:

```typescript
// Update the /plan command handler
coachComposer.command("plan", async (ctx) => {
  try {
    await ctx.replyWithChatAction("typing");

    let text: string;
    try {
      // Try health-aware plan (with Whoop)
      const { planTodayWithHealth } = await import("./index");
      const { formatHealthPlanForTelegram } = await import("./schedule-engine");
      const healthPlan = await planTodayWithHealth();
      text = formatHealthPlanForTelegram(healthPlan);
    } catch (whoopErr) {
      // Fallback to basic plan (no Whoop)
      const plan = await planToday();
      text = formatPlanForTelegram(plan);
      text += "\n\n⚠️ Whoop data unavailable — basic plan shown.";
    }

    await ctx.reply(`📋 *Today's Plan*\n\n${text}`, { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply(`❌ Plan failed: ${err instanceof Error ? err.message : String(err)}`);
  }
});
```

**Step 4: Commit**

```bash
git add packages/coach/src/index.ts packages/coach/src/schedule-engine.ts packages/coach/src/composer.ts
git commit -m "feat(coach): health-aware /plan with Whoop + LLM coaching"
```

---

## Task 7: Wire Exports + Test End-to-End

**Files:**
- Verify: `packages/shared/package.json` exports whoop
- Test: manual `/plan` via Telegram

**Step 1: Verify shared package exports**

Check that `packages/shared/package.json` has the wildcard export pattern `"./*": "./src/*.ts"`. If not, add whoop to exports.

**Step 2: Run the auth flow (if not done yet)**

```bash
bun packages/shared/src/whoop/auth-server.ts
```

**Step 3: Test Whoop client standalone**

```bash
bun -e "
import { getLatestRecovery, getLatestSleep } from '@golems/shared/whoop/client';
const r = await getLatestRecovery();
const s = await getLatestSleep();
console.log('Recovery:', JSON.stringify(r, null, 2));
console.log('Sleep:', JSON.stringify(s, null, 2));
"
```

**Step 4: Test the full plan generation**

```bash
bun -e "
import '@golems/shared/lib/load-env';
import { planTodayWithHealth } from '@golems/coach/index';
import { formatHealthPlanForTelegram } from '@golems/coach/schedule-engine';
const hp = await planTodayWithHealth();
console.log(formatHealthPlanForTelegram(hp));
"
```

**Step 5: Test via Telegram**

Send `/plan` in Telegram. Expected: health-aware plan with recovery score, workout, Huberman reminders.

**Step 6: Final commit + branch**

```bash
git add -A
git commit -m "feat(coach): CoachGolem MVP — Whoop + Huberman + LLM coaching"
```

---

## Execution Order

| Task | Depends On | Est. |
|------|-----------|------|
| 1. Whoop types | — | 2 min |
| 2. OAuth2 auth | 1 | 5 min (needs user browser) |
| 3. Whoop client | 1, 2 | 5 min |
| 4. Protocol engine | — | 3 min |
| 5. Coaching engine | 1, 4 | 5 min |
| 6. Upgrade /plan | 3, 5 | 5 min |
| 7. Wire + test | All | 5 min |

**Total: ~30 minutes to working MVP.**

---

## Post-MVP (next session)

- [ ] Whoop MCP server (expose tools to Claude Code)
- [ ] Weather API (OpenMeteo for sunlight duration)
- [ ] Midday nudge (NSDR, afternoon sunlight)
- [ ] Evening wrap-up (enhance Bedtime Guardian)
- [ ] Huberman Knowledge Base (index transcripts into Zikaron)
- [ ] `/coach why` command (RAG explanations)
- [ ] Whoop data caching in Supabase
- [ ] 7-day trend analysis
- [ ] Briefing integration (morning briefing includes health data)
