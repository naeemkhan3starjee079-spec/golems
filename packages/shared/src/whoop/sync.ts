/**
 * Whoop → Supabase sync
 *
 * Fetches latest Whoop data and upserts into whoop_snapshots table.
 * Designed to run on a cron schedule (Cloud Worker or local).
 */

import { getLatestRecovery, getLatestSleep, getTodayStrain } from "./client";
import { getSupabase } from "../lib/supabase-factory";

export async function syncWhoopToSupabase(): Promise<{
  date: string;
  recovery: number | null;
  sleep_hours: number | null;
  strain: number | null;
}> {
  const [recovery, sleep, strain] = await Promise.allSettled([
    getLatestRecovery(),
    getLatestSleep(),
    getTodayStrain(),
  ]);

  const r = recovery.status === "fulfilled" ? recovery.value : null;
  const s = sleep.status === "fulfilled" ? sleep.value : null;
  const c = strain.status === "fulfilled" ? strain.value : null;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" }); // YYYY-MM-DD

  const snapshot = {
    snapshot_date: today,
    // Recovery
    recovery_score: r?.score ?? null,
    recovery_state: r?.scoreState ?? null,
    hrv_rmssd: r?.hrvRmssd ?? null,
    resting_heart_rate: r?.restingHeartRate ?? null,
    spo2: r?.spo2 ?? null,
    skin_temp: r?.skinTemp ?? null,
    // Sleep
    sleep_duration_ms: s?.durationMs ?? null,
    sleep_quality_ms: s?.qualityDurationMs ?? null,
    rem_ms: s?.remDurationMs ?? null,
    deep_ms: s?.deepDurationMs ?? null,
    light_ms: s?.lightDurationMs ?? null,
    awake_ms: s?.awakeDurationMs ?? null,
    sleep_performance: s?.sleepPerformance ?? null,
    sleep_consistency: s?.sleepConsistency ?? null,
    sleep_efficiency: s?.sleepEfficiency ?? null,
    sleep_start: s?.start ?? null,
    sleep_end: s?.end ?? null,
    // Strain
    strain: c?.strain ?? null,
    kilojoule: c?.kilojoule ?? null,
    avg_heart_rate: c?.averageHeartRate ?? null,
    max_heart_rate: c?.maxHeartRate ?? null,
    // Metadata
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  const { error } = await supabase
    .from("whoop_snapshots")
    .upsert(snapshot, { onConflict: "user_id,snapshot_date" });

  if (error) {
    throw new Error(`Whoop sync failed: ${error.message}`);
  }

  return {
    date: today,
    recovery: r?.score ?? null,
    sleep_hours: s?.durationMs ? Math.round(s.durationMs / 3600000 * 10) / 10 : null,
    strain: c?.strain ?? null,
  };
}
