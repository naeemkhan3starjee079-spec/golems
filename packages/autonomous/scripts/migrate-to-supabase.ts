#!/usr/bin/env bun
/**
 * Data Migration: Local Files → Supabase
 *
 * One-time, idempotent migration script.
 * Migrates:
 *   1. state.json → golem_state (one row per key)
 *   2. event-log.json → golem_events
 *   3. seen-jobs.json → golem_seen_jobs
 *   4. outreach.db → outreach_contacts + outreach_messages + outreach_companies
 *   5. practice.db → practice_sessions + practice_questions
 *
 * Usage:
 *   bun run scripts/migrate-to-supabase.ts              # Dry run
 *   bun run scripts/migrate-to-supabase.ts --execute     # Actually migrate
 *   bun run scripts/migrate-to-supabase.ts --execute --skip-sqlite  # Skip SQLite DBs
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createClient } from "@supabase/supabase-js";
import { Database } from "bun:sqlite";

const GOLEMS_DIR = join(homedir(), ".golems-zikaron");
const STATE_FILE = join(GOLEMS_DIR, "state.json");
const EVENT_LOG_FILE = join(GOLEMS_DIR, "event-log.json");
const SEEN_JOBS_FILE = join(GOLEMS_DIR, "job-golem", "seen-jobs.json");
const OUTREACH_DB = join(GOLEMS_DIR, "recruiter", "outreach.db");
const PRACTICE_DB = join(GOLEMS_DIR, "recruiter", "practice.db");

const DRY_RUN = !process.argv.includes("--execute");
const SKIP_SQLITE = process.argv.includes("--skip-sqlite");

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY required");
  }
  return createClient(url, key);
}

let migratedCount = 0;
let skippedCount = 0;
let errorCount = 0;

async function migrateState(supabase: ReturnType<typeof createClient>) {
  console.log("\n1️⃣  state.json → golem_state");

  if (!existsSync(STATE_FILE)) {
    console.log("   ⏭️  No state.json found, skipping");
    return;
  }

  const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  const keys = Object.keys(state);
  console.log(`   Found ${keys.length} state keys`);

  for (const key of keys) {
    if (DRY_RUN) {
      console.log(`   [DRY] Would upsert: ${key}`);
      continue;
    }

    const { error } = await supabase
      .from("golem_state")
      .upsert({ key, value: state[key], updated_at: new Date().toISOString() });

    if (error) {
      console.error(`   ❌ Failed: ${key} - ${error.message}`);
      errorCount++;
    } else {
      migratedCount++;
    }
  }
}

async function migrateEventLog(supabase: ReturnType<typeof createClient>) {
  console.log("\n2️⃣  event-log.json → golem_events");

  if (!existsSync(EVENT_LOG_FILE)) {
    console.log("   ⏭️  No event-log.json found, skipping");
    return;
  }

  const events = JSON.parse(readFileSync(EVENT_LOG_FILE, "utf-8"));
  console.log(`   Found ${events.length} events`);

  if (DRY_RUN) {
    console.log(`   [DRY] Would insert ${events.length} events`);
    return;
  }

  // Check for existing events to avoid duplicates
  const { data: existing } = await supabase
    .from("golem_events")
    .select("id");

  const existingIds = new Set((existing || []).map((e: { id: string }) => e.id));

  const newEvents = events.filter((e: { id: string }) => !existingIds.has(e.id));
  console.log(`   ${events.length - newEvents.length} already migrated, ${newEvents.length} new`);

  if (newEvents.length === 0) {
    skippedCount++;
    return;
  }

  // Insert in batches of 50
  for (let i = 0; i < newEvents.length; i += 50) {
    const batch = newEvents.slice(i, i + 50).map((e: any) => ({
      id: e.id,
      actor: e.actor,
      type: e.type,
      data: e.data,
      created_at: e.timestamp,
    }));

    const { error } = await supabase.from("golem_events").insert(batch);
    if (error) {
      console.error(`   ❌ Batch ${i / 50 + 1} failed: ${error.message}`);
      errorCount++;
    } else {
      migratedCount += batch.length;
    }
  }
}

async function migrateSeenJobs(supabase: ReturnType<typeof createClient>) {
  console.log("\n3️⃣  seen-jobs.json → golem_seen_jobs");

  if (!existsSync(SEEN_JOBS_FILE)) {
    console.log("   ⏭️  No seen-jobs.json found, skipping");
    return;
  }

  const seenJobs: string[] = JSON.parse(readFileSync(SEEN_JOBS_FILE, "utf-8"));
  console.log(`   Found ${seenJobs.length} seen jobs`);

  if (DRY_RUN) {
    console.log(`   [DRY] Would upsert ${seenJobs.length} job IDs`);
    return;
  }

  // Insert in batches of 100
  for (let i = 0; i < seenJobs.length; i += 100) {
    const batch = seenJobs.slice(i, i + 100).map((id) => ({
      job_id: id,
      seen_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("golem_seen_jobs")
      .upsert(batch, { onConflict: "job_id" });

    if (error) {
      console.error(`   ❌ Batch ${i / 100 + 1} failed: ${error.message}`);
      errorCount++;
    } else {
      migratedCount += batch.length;
    }
  }
}

async function migrateOutreachDb(supabase: ReturnType<typeof createClient>) {
  console.log("\n4️⃣  outreach.db → outreach_contacts + outreach_messages + outreach_companies");

  if (!existsSync(OUTREACH_DB)) {
    console.log("   ⏭️  No outreach.db found, skipping");
    return;
  }

  const db = new Database(OUTREACH_DB, { readonly: true });

  // Contacts
  const contacts = db.query("SELECT * FROM contacts").all() as any[];
  console.log(`   Found ${contacts.length} contacts`);

  if (!DRY_RUN) {
    for (const c of contacts) {
      const { error } = await supabase
        .from("outreach_contacts")
        .upsert({
          id: c.id,
          name: c.name,
          email: c.email,
          linkedin_url: c.linkedin_url,
          company: c.company,
          role: c.role,
          source: c.source,
          created_at: c.created_at,
        }, { onConflict: "id" });

      if (error) {
        console.error(`   ❌ Contact ${c.name}: ${error.message}`);
        errorCount++;
      } else {
        migratedCount++;
      }
    }
  } else {
    console.log(`   [DRY] Would insert ${contacts.length} contacts`);
  }

  // Outreach messages
  const messages = db.query("SELECT * FROM outreach").all() as any[];
  console.log(`   Found ${messages.length} outreach messages`);

  if (!DRY_RUN) {
    for (const m of messages) {
      const { error } = await supabase
        .from("outreach_messages")
        .upsert({
          id: m.id,
          job_id: m.job_id,
          contact_id: m.contact_id,
          message_type: m.message_type,
          message_text: m.message_text,
          status: m.status,
          sent_at: m.sent_at,
          created_at: m.created_at,
        }, { onConflict: "id" });

      if (error) {
        console.error(`   ❌ Outreach ${m.id}: ${error.message}`);
        errorCount++;
      } else {
        migratedCount++;
      }
    }
  } else {
    console.log(`   [DRY] Would insert ${messages.length} messages`);
  }

  // Company research
  const companies = db.query("SELECT * FROM company_research").all() as any[];
  console.log(`   Found ${companies.length} company research entries`);

  if (!DRY_RUN) {
    for (const c of companies) {
      const { error } = await supabase
        .from("outreach_companies")
        .upsert({
          company_name: c.company_name,
          data: JSON.parse(c.data_json),
          researched_at: c.researched_at,
        }, { onConflict: "company_name" });

      if (error) {
        console.error(`   ❌ Company ${c.company_name}: ${error.message}`);
        errorCount++;
      } else {
        migratedCount++;
      }
    }
  } else {
    console.log(`   [DRY] Would insert ${companies.length} companies`);
  }

  db.close();
}

async function migratePracticeDb(supabase: ReturnType<typeof createClient>) {
  console.log("\n5️⃣  practice.db → practice_sessions + practice_questions");

  if (!existsSync(PRACTICE_DB)) {
    console.log("   ⏭️  No practice.db found, skipping");
    return;
  }

  const db = new Database(PRACTICE_DB, { readonly: true });

  // Sessions
  const sessions = db.query("SELECT * FROM sessions").all() as any[];
  console.log(`   Found ${sessions.length} practice sessions`);

  if (!DRY_RUN) {
    for (const s of sessions) {
      const { error } = await supabase
        .from("practice_sessions")
        .upsert({
          id: s.id,
          mode: s.mode,
          difficulty: s.difficulty,
          status: s.status,
          passed: s.passed === 1,
          started_at: s.started_at,
          ended_at: s.ended_at,
          rating_before: s.rating_before,
          rating_after: s.rating_after,
        }, { onConflict: "id" });

      if (error) {
        console.error(`   ❌ Session ${s.id}: ${error.message}`);
        errorCount++;
      } else {
        migratedCount++;
      }
    }
  } else {
    console.log(`   [DRY] Would insert ${sessions.length} sessions`);
  }

  // Questions
  const questions = db.query("SELECT * FROM questions").all() as any[];
  console.log(`   Found ${questions.length} practice questions`);

  if (!DRY_RUN) {
    for (const q of questions) {
      const { error } = await supabase
        .from("practice_questions")
        .upsert({
          id: q.id,
          session_id: q.session_id,
          difficulty: q.difficulty,
          topic: q.topic,
          asked_at: q.asked_at,
        }, { onConflict: "id" });

      if (error) {
        console.error(`   ❌ Question ${q.id}: ${error.message}`);
        errorCount++;
      } else {
        migratedCount++;
      }
    }
  } else {
    console.log(`   [DRY] Would insert ${questions.length} questions`);
  }

  db.close();
}

// ═══════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════

async function main() {
  console.log("🔄 Golems Data Migration: Local → Supabase");
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN (add --execute to apply)" : "EXECUTING"}`);
  console.log(`   SQLite: ${SKIP_SQLITE ? "SKIPPED" : "included"}`);
  console.log(`   Data dir: ${GOLEMS_DIR}`);

  const supabase = DRY_RUN ? null as any : getSupabase();

  // JSON files (always)
  await migrateState(supabase);
  await migrateEventLog(supabase);
  await migrateSeenJobs(supabase);

  // SQLite databases (optional)
  if (!SKIP_SQLITE) {
    await migrateOutreachDb(supabase);
    await migratePracticeDb(supabase);
  }

  console.log("\n" + "═".repeat(50));
  console.log(`✅ Migrated: ${migratedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (DRY_RUN) {
    console.log("\n⚠️  This was a dry run. Add --execute to apply changes.");
  }
}

main().catch((err) => {
  console.error("\n💥 Migration failed:", err);
  process.exit(1);
});
