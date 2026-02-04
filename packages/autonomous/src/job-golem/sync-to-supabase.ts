#!/usr/bin/env bun
/**
 * Job Golem - Supabase Sync
 *
 * Syncs scraped jobs to etanheyman.com's Supabase database
 * for the ClaudeGolem Dashboard.
 *
 * Usage:
 *   bun src/job-golem/sync-to-supabase.ts [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import type { JobListing } from "./scraper";
import { loadScrapedJobs } from "./scraper";
import type { MatchResult } from "./matcher";

const HOME = process.env.HOME;
if (!HOME) {
  throw new Error("HOME environment variable is required but not set");
}
const DATA_DIR = join(HOME, ".golems-zikaron/job-golem");
const JOBS_FILE = join(DATA_DIR, "scraped-jobs.json");
const SYNC_STATE_FILE = join(DATA_DIR, "sync-state.json");

// Supabase connection (uses same env as etanheyman.com)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface SyncState {
  lastSyncAt: string;
  syncedIds: string[];
}

function loadSyncState(): SyncState {
  try {
    if (existsSync(SYNC_STATE_FILE)) {
      return JSON.parse(readFileSync(SYNC_STATE_FILE, "utf-8"));
    }
  } catch {}
  return { lastSyncAt: "", syncedIds: [] };
}

function saveSyncState(state: SyncState) {
  writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Clear synced jobs from local storage to free disk space.
 * Only keeps jobs that failed to sync (if any).
 */
function clearSyncedJobs(syncedIds: string[]) {
  if (!existsSync(JOBS_FILE)) return;

  try {
    const jobs = loadScrapedJobs();
    const remaining = jobs.filter((j) => !syncedIds.includes(j.id));

    if (remaining.length === 0) {
      // All jobs synced - delete the file entirely
      unlinkSync(JOBS_FILE);
      console.log("[Cleanup] Deleted scraped-jobs.json (all synced)");
    } else {
      // Some jobs failed - keep only those
      writeFileSync(JOBS_FILE, JSON.stringify(remaining, null, 2));
      console.log(`[Cleanup] Kept ${remaining.length} unsynced jobs`);
    }
  } catch (err) {
    console.error("[Cleanup] Failed to clean up local jobs:", err);
  }
}

async function syncJobs(dryRun = false) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("[Sync] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars");
    console.log("[Sync] Set these in your .env or environment");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const jobs = loadScrapedJobs();
  const syncState = loadSyncState();

  console.log(`[Sync] Found ${jobs.length} scraped jobs`);
  console.log(`[Sync] ${syncState.syncedIds.length} already synced`);

  // Find jobs that haven't been synced
  const newJobs = jobs.filter((j) => !syncState.syncedIds.includes(j.id));
  console.log(`[Sync] ${newJobs.length} new jobs to sync`);

  if (newJobs.length === 0) {
    console.log("[Sync] Nothing to sync, all jobs already in database");
    return;
  }

  if (dryRun) {
    console.log("[Sync] DRY RUN - would sync these jobs:");
    for (const job of newJobs.slice(0, 10)) {
      console.log(`  - ${job.title} @ ${job.company} (${job.source})`);
    }
    if (newJobs.length > 10) {
      console.log(`  ... and ${newJobs.length - 10} more`);
    }
    return;
  }

  // Sync in batches
  const BATCH_SIZE = 50;
  let synced = 0;
  let errors = 0;

  for (let i = 0; i < newJobs.length; i += BATCH_SIZE) {
    const batch = newJobs.slice(i, i + BATCH_SIZE);

    const records = batch.map((job) => ({
      external_id: job.id,
      title: job.title,
      company: job.company,
      location: job.location || null,
      experience: job.experience || null,
      description: job.description || null,
      url: job.url,
      source: job.source,
      language: job.language,
      status: "new",
      scraped_at: job.scrapedAt,
    }));

    // Use ignoreDuplicates to only INSERT new jobs, never UPDATE existing ones
    // This preserves user-set status (saved, applied, rejected) on re-scrape
    const { data, error } = await supabase
      .from("golem_jobs")
      .upsert(records, { onConflict: "external_id", ignoreDuplicates: true })
      .select();

    if (error) {
      console.error(`[Sync] Batch error:`, error.message);
      errors += batch.length;
    } else {
      synced += batch.length;
      // Update sync state
      syncState.syncedIds.push(...batch.map((j) => j.id));
    }

    // Small delay between batches
    if (i + BATCH_SIZE < newJobs.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // Save updated sync state
  syncState.lastSyncAt = new Date().toISOString();
  // Keep only last 1000 synced IDs to prevent unbounded growth
  if (syncState.syncedIds.length > 1000) {
    syncState.syncedIds = syncState.syncedIds.slice(-1000);
  }
  saveSyncState(syncState);

  console.log(`[Sync] Done: ${synced} synced, ${errors} errors`);

  // Clean up local storage after successful sync
  if (synced > 0 && errors === 0) {
    clearSyncedJobs(syncState.syncedIds);
  } else if (synced > 0) {
    // Partial success - only clear successfully synced jobs
    const successfulIds = newJobs.slice(0, synced).map((j) => j.id);
    clearSyncedJobs(successfulIds);
  }
}

/**
 * Sync match scores back to Supabase after Ollama scoring
 */
async function syncScores(matches: MatchResult[]) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("[SyncScores] Missing Supabase env vars");
    return;
  }

  if (matches.length === 0) {
    console.log("[SyncScores] No scores to sync");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let updated = 0;
  let errors = 0;

  for (const match of matches) {
    const { error } = await supabase
      .from("golem_jobs")
      .update({
        match_score: match.score,
        notes: match.reason,
        tags: match.highlights,
      })
      .eq("external_id", match.job.id);

    if (error) {
      console.error(`[SyncScores] Error updating ${match.job.id}:`, error.message);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`[SyncScores] Updated ${updated} jobs with scores (${errors} errors)`);
}

// CLI
if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  syncJobs(dryRun).catch((err) => {
    console.error("[Sync] Fatal error:", err);
    process.exit(1);
  });
}

export { syncJobs, syncScores };
