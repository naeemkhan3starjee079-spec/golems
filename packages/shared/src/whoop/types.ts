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
  score: number; // 0-100
  hrvRmssd: number; // ms
  restingHeartRate: number;
  spo2: number | null; // %
  skinTemp: number | null; // celsius
  scoreState: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
}

/** Whoop Sleep (from /activity/sleep) */
export interface WhoopSleep {
  id: string;
  start: string; // ISO
  end: string; // ISO
  durationMs: number;
  qualityDurationMs: number; // non-awake time
  remDurationMs: number;
  deepDurationMs: number;
  lightDurationMs: number;
  awakeDurationMs: number;
  sleepPerformance: number; // 0-100%
  sleepConsistency: number; // 0-100%
  sleepEfficiency: number; // 0-100%
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
