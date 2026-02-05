#!/usr/bin/env bun
/**
 * One-time cleanup script to delete bad jobs from Supabase
 * Run: bun scripts/cleanup-bad-jobs.ts
 */

import "../src/lib/load-env";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Bad patterns that should have been filtered out
const BAD_PATTERNS = [
  /director/i, /manager/i, /architect/i, /principal/i, /staff engineer/i,
  /tech lead/i, /team lead/i, /head of/i, /vp of/i,
  /c\+\+/i, /rust\s/i, /\bjava\b/i, /\.net/i, /c#/i, /angular/i, /php/i,
  /devops/i, /sre/i, /infrastructure/i, /platform engineer/i, /infra\s/i,
  /data engineer/i, /data scientist/i, /ml engineer/i, /machine learning/i,
  /automation/i, /\bqa\b/i, /quality assurance/i, /test engineer/i,
  /embedded/i, /firmware/i, /hardware/i,
  /\bdba\b/i, /database admin/i, /system analyst/i, /מנתח מערכות/,
  /bi developer/i, /bi analyst/i, /business intelligence/i,
  /support/i, /helpdesk/i, /\bnoc\b/i, /\bsap\b/i, /technical writer/i,
  /wireless/i, /\bphy\b/i, /security analyst/i, /cyber/i,
  /low level/i, /kernel/i, /driver/i,
  /\bibi r&d\b/i, /o365/i, /365/i, /sharepoint/i,
  /מערכות מידע/i, /מיישם/i, /pmo/i, /בכיר/i,
];

async function cleanup() {
  console.log("Fetching all jobs from Supabase...");
  const { data: jobs, error } = await supabase
    .from("golem_jobs")
    .select("id, title, match_score");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${jobs.length} jobs in database`);

  // Find bad jobs based on title patterns
  const badJobs = jobs.filter(job => {
    const title = job.title;
    return BAD_PATTERNS.some(pattern => pattern.test(title));
  });

  console.log(`\nFound ${badJobs.length} bad jobs to delete:`);
  badJobs.slice(0, 30).forEach((j) => {
    console.log(`  - ${j.title}`);
  });
  if (badJobs.length > 30) console.log(`  ... and ${badJobs.length - 30} more`);

  if (badJobs.length === 0) {
    console.log("\nNothing to delete!");
    return;
  }

  // Require --force flag for actual deletion
  const forceDelete = process.argv.includes("--force");
  if (!forceDelete) {
    console.log(`\n⚠️  Run with --force to actually delete these ${badJobs.length} jobs`);
    console.log("   bun scripts/cleanup-bad-jobs.ts --force");
    return;
  }

  console.log(`\nDeleting ${badJobs.length} jobs...`);

  // Batch deletes to avoid Supabase query limits
  const BATCH_SIZE = 500;
  const ids = badJobs.map((j) => j.id);
  let deletedCount = 0;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const { error: deleteError } = await supabase
      .from("golem_jobs")
      .delete()
      .in("id", batch);

    if (deleteError) {
      console.error(`Delete error (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, deleteError);
    } else {
      deletedCount += batch.length;
      console.log(`  Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} jobs`);
    }
  }

  console.log(`✅ Deleted ${deletedCount} bad jobs`);

  // Show what's left
  const { data: remaining } = await supabase
    .from("golem_jobs")
    .select("title")
    .limit(10);

  console.log(`\nRemaining jobs (sample):`);
  remaining?.forEach((j) => {
    console.log(`  - ${j.title}`);
  });
}

cleanup();
