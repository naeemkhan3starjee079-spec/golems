/**
 * Whoop API Client
 *
 * Handles OAuth2 token refresh and API calls.
 * Credentials from env vars. Refresh tokens persisted to Supabase (survives deploys).
 * Whoop uses rotating refresh tokens — each use invalidates the old one.
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import type {
  WhoopTokens,
  WhoopRecovery,
  WhoopSleep,
  WhoopCycle,
  WhoopWorkout,
  WhoopPaginatedResponse,
} from "./types";

const BASE_URL = "https://api.prod.whoop.com/developer/v2";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const TOKEN_BUFFER_MS = 5 * 60 * 1000; // Refresh 5min before expiry
const TOKEN_CACHE_PATH = "/tmp/whoop-tokens.json";

let cachedTokens: WhoopTokens | null = null;

/** Read credentials from env vars (required: WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_REFRESH_TOKEN) */
function getCredentials(): {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
} {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const refreshToken = process.env.WHOOP_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Whoop credentials. Set WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_REFRESH_TOKEN env vars.",
    );
  }
  return { clientId, clientSecret, refreshToken };
}

/** Try loading cached tokens from /tmp/whoop-tokens.json */
function loadCachedTokensFromFile(): boolean {
  try {
    if (!existsSync(TOKEN_CACHE_PATH)) return false;
    const data = JSON.parse(readFileSync(TOKEN_CACHE_PATH, "utf-8"));
    if (data.access_token && data.expires_at > Date.now() + TOKEN_BUFFER_MS) {
      cachedTokens = data;
      return true;
    }
    // Even if access token expired, keep the refresh token
    if (data.refresh_token && !cachedTokens?.refresh_token) {
      cachedTokens = data;
    }
    return false;
  } catch {
    return false;
  }
}

/** Save tokens to cache file */
function saveTokensToFile(tokens: WhoopTokens): void {
  try {
    writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(tokens));
  } catch {
    // Non-critical — tokens still work from memory
  }
}

/** Load the latest refresh token from Supabase (survives container restarts) */
async function loadRefreshTokenFromSupabase(): Promise<string | null> {
  try {
    const { getSupabase } = await import("../lib/supabase-factory");
    const sb = getSupabase();
    const { data } = await sb
      .from("golem_state")
      .select("value")
      .eq("key", "whoop_refresh_token")
      .single();
    if (data?.value) {
      return typeof data.value === "string" ? data.value : String(data.value);
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist the new refresh token to Supabase (fire-and-forget) */
function saveRefreshTokenToSupabase(refreshToken: string): void {
  import("../lib/supabase-factory")
    .then(({ getSupabase }) => {
      const sb = getSupabase();
      sb.from("golem_state")
        .upsert(
          {
            key: "whoop_refresh_token",
            value: JSON.stringify(refreshToken),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        )
        .then(({ error }) => {
          if (error) console.error("[Whoop] Failed to save refresh token to Supabase:", error.message);
          else console.log("[Whoop] Refresh token persisted to Supabase");
        });
    })
    .catch(() => {});
}

/** Get the best available refresh token: memory > Supabase > env var */
async function getBestRefreshToken(): Promise<string> {
  // 1. In-memory (current session, most recent)
  if (cachedTokens?.refresh_token) {
    return cachedTokens.refresh_token;
  }

  // 2. Supabase (survives deploys/restarts)
  const supabaseToken = await loadRefreshTokenFromSupabase();
  if (supabaseToken) {
    console.log("[Whoop] Using refresh token from Supabase");
    return supabaseToken;
  }

  // 3. Env var (initial setup only — will be stale after first refresh)
  const { refreshToken } = getCredentials();
  console.log("[Whoop] Using refresh token from env var (first use)");
  return refreshToken;
}

/** Get a valid access token, refreshing if needed */
async function getAccessToken(): Promise<string> {
  if (cachedTokens && cachedTokens.expires_at > Date.now() + TOKEN_BUFFER_MS) {
    return cachedTokens.access_token;
  }

  // Try loading from local temp file
  if (loadCachedTokensFromFile()) {
    return cachedTokens!.access_token;
  }

  const { clientId, clientSecret } = getCredentials();
  const refreshToken = await getBestRefreshToken();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "offline",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `Whoop token refresh failed (${response.status}): ${err}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  cachedTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  saveTokensToFile(cachedTokens);
  saveRefreshTokenToSupabase(data.refresh_token);
  return cachedTokens.access_token;
}

/** Make an authenticated GET request to Whoop API */
async function whoopGet<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
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

/** Get latest recovery (v2 uses /recovery endpoint directly) */
export async function getLatestRecovery(): Promise<WhoopRecovery | null> {
  const recoveries = await whoopGet<WhoopPaginatedResponse<any>>("/recovery", {
    limit: "1",
  });
  if (recoveries.records.length === 0) return null;

  const r = recoveries.records[0];
  if (r.score_state !== "SCORED") {
    return {
      cycleId: r.cycle_id,
      score: 0,
      hrvRmssd: 0,
      restingHeartRate: 0,
      spo2: null,
      skinTemp: null,
      scoreState: r.score_state,
    };
  }

  return {
    cycleId: r.cycle_id,
    score: r.score.recovery_score,
    hrvRmssd: r.score.hrv_rmssd_milli,
    restingHeartRate: r.score.resting_heart_rate,
    spo2: r.score.spo2_percentage ?? null,
    skinTemp: r.score.skin_temp_celsius ?? null,
    scoreState: "SCORED",
  };
}

/** Get latest sleep */
export async function getLatestSleep(): Promise<WhoopSleep | null> {
  const sleeps = await whoopGet<WhoopPaginatedResponse<any>>(
    "/activity/sleep",
    { limit: "1" },
  );
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

  const stages = s.score.stage_summary;
  return {
    id: s.id,
    start: s.start,
    end: s.end,
    durationMs: stages.total_in_bed_time_milli ?? 0,
    qualityDurationMs:
      (stages.total_in_bed_time_milli ?? 0) -
      (stages.total_awake_time_milli ?? 0),
    remDurationMs: stages.total_rem_sleep_time_milli ?? 0,
    deepDurationMs: stages.total_slow_wave_sleep_time_milli ?? 0,
    lightDurationMs: stages.total_light_sleep_time_milli ?? 0,
    awakeDurationMs: stages.total_awake_time_milli ?? 0,
    sleepPerformance: s.score.sleep_performance_percentage ?? 0,
    sleepConsistency: s.score.sleep_consistency_percentage ?? 0,
    sleepEfficiency: s.score.sleep_efficiency_percentage ?? 0,
    scoreState: "SCORED",
  };
}

/** Get current cycle strain */
export async function getTodayStrain(): Promise<WhoopCycle | null> {
  const cycles = await whoopGet<WhoopPaginatedResponse<any>>("/cycle", {
    limit: "1",
  });
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
export async function getRecentWorkouts(
  limit = 5,
): Promise<WhoopWorkout[]> {
  const workouts = await whoopGet<WhoopPaginatedResponse<any>>(
    "/activity/workout",
    { limit: String(limit) },
  );

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
