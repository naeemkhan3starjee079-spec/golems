/**
 * Whoop → Supabase sync
 *
 * Fetches latest Whoop data and upserts into whoop_snapshots table.
 * Designed to run on a cron schedule (Cloud Worker or local).
 */

import {
  getLatestRecovery,
  getLatestSleep,
  getTodayStrain,
  whoopGet,
} from "./client";
import { getSupabase } from "../lib/supabase-factory";
import type { WhoopPaginatedResponse } from "./types";

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

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  }); // YYYY-MM-DD

  // Build snapshot with ONLY non-null fields to avoid overwriting
  // previously synced data with nulls (e.g., recovery scores later than sleep)
  const snapshot: Record<string, unknown> = {
    snapshot_date: today,
    updated_at: new Date().toISOString(),
  };

  // Recovery — only include if actually scored (PENDING_SCORE has zeroed values)
  if (r && r.scoreState === "SCORED") {
    snapshot.recovery_score = r.score;
    snapshot.recovery_state = r.scoreState;
    snapshot.hrv_rmssd = r.hrvRmssd;
    snapshot.resting_heart_rate = r.restingHeartRate;
    if (r.spo2 != null) snapshot.spo2 = r.spo2;
    if (r.skinTemp != null) snapshot.skin_temp = r.skinTemp;
  }

  // Sleep — only include if actually scored
  if (s && s.scoreState === "SCORED") {
    snapshot.sleep_duration_ms = s.durationMs;
    snapshot.sleep_quality_ms = s.qualityDurationMs;
    snapshot.rem_ms = s.remDurationMs;
    snapshot.deep_ms = s.deepDurationMs;
    snapshot.light_ms = s.lightDurationMs;
    snapshot.awake_ms = s.awakeDurationMs;
    snapshot.sleep_performance = s.sleepPerformance;
    snapshot.sleep_consistency = s.sleepConsistency;
    snapshot.sleep_efficiency = s.sleepEfficiency;
    snapshot.sleep_start = s.start;
    snapshot.sleep_end = s.end;
  }

  // Strain — only include if available
  if (c) {
    snapshot.strain = c.strain;
    snapshot.kilojoule = c.kilojoule;
    snapshot.avg_heart_rate = c.averageHeartRate;
    snapshot.max_heart_rate = c.maxHeartRate;
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("whoop_snapshots")
    .upsert(snapshot, { onConflict: "snapshot_date" });

  if (error) {
    throw new Error(`Whoop sync failed: ${error.message}`);
  }

  return {
    date: today,
    recovery: r?.score ?? null,
    sleep_hours: s?.durationMs
      ? Math.round((s.durationMs / 3600000) * 10) / 10
      : null,
    strain: c?.strain ?? null,
  };
}

/**
 * Backfill recent Whoop snapshots.
 * Fetches the last N days of recovery, sleep, and strain data
 * and upserts each day's data into whoop_snapshots.
 * Uses the same selective-write pattern: only non-null scored fields are written.
 */
export async function backfillWhoopSnapshots(days = 7): Promise<{
  updated: string[];
  errors: string[];
}> {
  const supabase = getSupabase();
  const updated: string[] = [];
  const errors: string[] = [];

  // Convert UTC ISO string to Israel local date (YYYY-MM-DD)
  // Whoop returns UTC timestamps — we need Israel dates for snapshot alignment
  const toIsraelDate = (iso: string): string => {
    return new Date(iso).toLocaleDateString("en-CA", {
      timeZone: "Asia/Jerusalem",
    });
  };

  // Fetch recent records from each endpoint
  // AIDEV-NOTE: Uses raw API responses (any) because backfill needs N records
  // while typed client functions (getLatestRecovery etc.) fetch only 1.
  const [recoveries, sleeps, cycles] = await Promise.allSettled([
    whoopGet<WhoopPaginatedResponse<Record<string, unknown>>>("/recovery", {
      limit: String(days),
    }),
    whoopGet<WhoopPaginatedResponse<Record<string, unknown>>>(
      "/activity/sleep",
      { limit: String(days) },
    ),
    whoopGet<WhoopPaginatedResponse<Record<string, unknown>>>("/cycle", {
      limit: String(days),
    }),
  ]);

  // Index cycles by date — use cycle.end (wake time) to align with sleep.end
  // For in-progress cycles (end is null), fall back to start date
  const cyclesByDate = new Map<string, Record<string, unknown>>();
  if (cycles.status === "fulfilled") {
    for (const c of cycles.value.records) {
      const raw = c.end ?? c.start;
      if (raw) cyclesByDate.set(toIsraelDate(raw), c);
    }
  }

  // Index recoveries by cycle_id → need to match to cycle dates
  const recoveryByCycleId = new Map<number, any>();
  if (recoveries.status === "fulfilled") {
    for (const r of recoveries.value.records) {
      recoveryByCycleId.set(r.cycle_id, r);
    }
  }

  // Index sleeps by Israel date (sleep end = wake time = the day it counts for)
  const sleepsByDate = new Map<string, any>();
  if (sleeps.status === "fulfilled") {
    for (const s of sleeps.value.records) {
      if (s.end) sleepsByDate.set(toIsraelDate(s.end), s);
    }
  }

  // For each cycle (= each day), build and upsert the snapshot
  for (const [date, cycle] of cyclesByDate) {
    const snapshot: Record<string, unknown> = {
      snapshot_date: date,
      updated_at: new Date().toISOString(),
    };

    // Recovery
    const rec = recoveryByCycleId.get(cycle.id);
    if (rec?.score_state === "SCORED" && rec.score) {
      snapshot.recovery_score = rec.score.recovery_score;
      snapshot.recovery_state = "SCORED";
      snapshot.hrv_rmssd = rec.score.hrv_rmssd_milli;
      snapshot.resting_heart_rate = rec.score.resting_heart_rate;
      if (rec.score.spo2_percentage != null)
        snapshot.spo2 = rec.score.spo2_percentage;
      if (rec.score.skin_temp_celsius != null)
        snapshot.skin_temp = rec.score.skin_temp_celsius;
    }

    // Sleep
    const slp = sleepsByDate.get(date);
    if (slp?.score_state === "SCORED" && slp.score) {
      const stages = slp.score.stage_summary;
      snapshot.sleep_duration_ms = stages.total_in_bed_time_milli ?? 0;
      snapshot.sleep_quality_ms =
        (stages.total_in_bed_time_milli ?? 0) -
        (stages.total_awake_time_milli ?? 0);
      snapshot.rem_ms = stages.total_rem_sleep_time_milli ?? 0;
      snapshot.deep_ms = stages.total_slow_wave_sleep_time_milli ?? 0;
      snapshot.light_ms = stages.total_light_sleep_time_milli ?? 0;
      snapshot.awake_ms = stages.total_awake_time_milli ?? 0;
      snapshot.sleep_performance = slp.score.sleep_performance_percentage ?? 0;
      snapshot.sleep_consistency = slp.score.sleep_consistency_percentage ?? 0;
      snapshot.sleep_efficiency = slp.score.sleep_efficiency_percentage ?? 0;
      snapshot.sleep_start = slp.start;
      snapshot.sleep_end = slp.end;
    }

    // Strain (from cycle) — only include if cycle has scored data
    if (cycle.score && cycle.score_state === "SCORED") {
      snapshot.strain = cycle.score.strain ?? 0;
      snapshot.kilojoule = cycle.score.kilojoule ?? 0;
      snapshot.avg_heart_rate = cycle.score.average_heart_rate ?? 0;
      snapshot.max_heart_rate = cycle.score.max_heart_rate ?? 0;
    }

    // Only upsert if we have at least one data field beyond the date
    if (Object.keys(snapshot).length > 2) {
      const { error } = await supabase
        .from("whoop_snapshots")
        .upsert(snapshot, { onConflict: "snapshot_date" })
        .select("snapshot_date");
      if (error) {
        errors.push(`${date}: ${error.message}`);
      } else {
        updated.push(date);
      }
    }
  }

  return { updated, errors };
}
