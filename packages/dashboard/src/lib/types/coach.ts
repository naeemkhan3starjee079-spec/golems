// Coach / Whoop health snapshot types

export interface WhoopSnapshot {
  id: string;
  snapshot_date: string;
  recovery_score: number | null;
  recovery_state: string | null;
  hrv_rmssd: number | null;
  resting_heart_rate: number | null;
  spo2: number | null;
  skin_temp: number | null;
  sleep_duration_ms: number | null;
  sleep_quality_ms: number | null;
  rem_ms: number | null;
  deep_ms: number | null;
  light_ms: number | null;
  awake_ms: number | null;
  sleep_performance: number | null;
  sleep_consistency: number | null;
  sleep_efficiency: number | null;
  sleep_start: string | null;
  sleep_end: string | null;
  strain: number | null;
  kilojoule: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  created_at: string;
}

export type RecoveryColor = "green" | "yellow" | "red" | "unknown";

export function getRecoveryColor(score: number | null): RecoveryColor {
  if (score == null) return "unknown";
  if (score >= 67) return "green";
  if (score >= 34) return "yellow";
  return "red";
}
