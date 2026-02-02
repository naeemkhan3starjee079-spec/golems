#!/usr/bin/env bun
/**
 * EmailGolem - Smart Email Triage
 *
 * Main entry point. Runs every 10 minutes via launchd.
 *
 * Flow:
 * 1. Sync offline queue (if any)
 * 2. Fetch new emails from Gmail
 * 3. Score each email with Ollama
 * 4. Save to Supabase
 * 5. Notify immediately if score >= 10
 * 6. Track subscriptions for monthly digest
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { fetchRecentEmails, fetchEmailsSince, type GmailEmail } from "./gmail-client";
import { scoreEmail, shouldNotifyImmediately, shouldTrackSubscription, type ScoredEmail, type EmailInput } from "./scorer";
import {
  createDbClient,
  saveEmail,
  trackSubscription,
  recordPayment,
  markNotified,
  syncOfflineQueue,
  type Email,
  type Subscription,
} from "./db-client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Configuration
const HOME = process.env.HOME || "/Users/etanheyman";
const STATE_FILE = join(HOME, ".golems-zikaron/state.json");
const NOTIFICATION_PORT = 3847;

// Category emojis for notifications
const CATEGORY_EMOJIS: Record<string, string> = {
  interview: "📅",
  urgent: "🚨",
  job: "💼",
  subscription: "💳",
  newsletter: "📰",
  promo: "🏷️",
  other: "📧",
};

// State interface
interface State {
  nightShiftTarget?: string;
  rotation?: string[];
  telegramChatId?: number | null;
  lastEmailCheck?: string;
  processedEmailIds?: string[];
}

function loadState(): State {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("[EmailGolem] Failed to load state:", err);
  }
  return {};
}

function saveState(state: State) {
  try {
    // Merge with existing state to preserve other fields
    const existing = loadState();
    const merged = { ...existing, ...state };
    writeFileSync(STATE_FILE, JSON.stringify(merged, null, 2));
  } catch (err) {
    console.error("[EmailGolem] Failed to save state:", err);
  }
}

/**
 * Send notification to Telegram via local notification server
 */
async function sendNotification(title: string, body: string) {
  try {
    const response = await fetch(`http://localhost:${NOTIFICATION_PORT}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        source: "email-golem",
        priority: "high",
      }),
    });

    if (!response.ok) {
      console.error("[EmailGolem] Notification failed:", response.status);
    }
  } catch (err) {
    console.error("[EmailGolem] Could not send notification:", err);
  }
}

/**
 * Convert GmailEmail to EmailInput for scorer
 */
function toEmailInput(gmail: GmailEmail): EmailInput {
  return {
    id: gmail.id,
    subject: gmail.subject,
    from: gmail.from,
    snippet: gmail.snippet,
    receivedAt: gmail.receivedAt.toISOString(),
  };
}

/**
 * Convert ScoredEmail to DB Email format
 */
function toDbEmail(scored: ScoredEmail): Email {
  return {
    gmail_id: scored.id,
    subject: scored.subject,
    from_address: scored.from,
    snippet: scored.snippet,
    score: scored.score,
    category: scored.category,
    received_at: new Date(scored.receivedAt),
    scored_at: new Date(scored.scoredAt),
    notified: false,
  };
}

/**
 * Process a single email: score, save, notify if urgent
 */
async function processEmail(
  gmail: GmailEmail,
  db: SupabaseClient | null,
  dryRun: boolean
): Promise<ScoredEmail> {
  const input = toEmailInput(gmail);
  console.log(`  📧 Scoring: ${input.subject.slice(0, 50)}...`);

  const scored = await scoreEmail(input);
  console.log(`     Score: ${scored.score}/10 (${scored.category})`);

  if (dryRun) {
    console.log(`     [DRY-RUN] Would save to DB`);
    if (shouldNotifyImmediately(scored)) {
      console.log(`     [DRY-RUN] Would notify: ${scored.subject}`);
    }
    if (shouldTrackSubscription(scored)) {
      console.log(`     [DRY-RUN] Would track subscription: ${scored.subscription?.serviceName}`);
    }
    return scored;
  }

  // Save to database
  if (db) {
    const dbEmail = toDbEmail(scored);
    const saveResult = await saveEmail(db, dbEmail);

    if (!saveResult.success) {
      console.log(`     Queued for later sync`);
    }

    // Notify if urgent
    if (shouldNotifyImmediately(scored)) {
      const emoji = CATEGORY_EMOJIS[scored.category] || "📧";
      const title = `${emoji} Urgent Email`;
      const body = `${scored.category}: ${scored.subject.slice(0, 100)}`;

      await sendNotification(title, body);
      console.log(`     🔔 Notification sent!`);

      // Mark as notified
      if (saveResult.data?.id) {
        await markNotified(db, saveResult.data.id);
      }
    }

    // Track subscription
    if (shouldTrackSubscription(scored) && scored.subscription) {
      const sub: Subscription = {
        service_name: scored.subscription.serviceName,
        amount: scored.subscription.amount,
        currency: "USD",
        frequency: scored.subscription.frequency === "unknown" ? null : scored.subscription.frequency,
        status: "active",
        last_payment: new Date(),
      };

      await trackSubscription(db, sub);
      console.log(`     💳 Subscription tracked: ${sub.service_name}`);

      // Record payment if amount is known
      if (scored.subscription.amount) {
        await recordPayment(db, {
          subscription_id: null, // Will be linked by service_name
          email_id: null,
          amount: scored.subscription.amount,
          currency: "USD",
          paid_at: new Date(),
        });
      }
    }
  }

  return scored;
}

/**
 * Main processing loop
 */
async function processEmails(options: { dryRun?: boolean; maxEmails?: number } = {}) {
  const { dryRun = false, maxEmails = 20 } = options;

  console.log("\n📧 EmailGolem - Starting...\n");

  if (dryRun) {
    console.log("⚠️  DRY-RUN MODE - No changes will be made\n");
  }

  // Load state
  const state = loadState();
  const processedIds = new Set(state.processedEmailIds || []);

  // Initialize DB client (may fail if offline)
  let db: SupabaseClient | null = null;
  try {
    db = createDbClient();
    console.log("✓ Supabase connected");

    // Sync any offline queue items first
    if (!dryRun) {
      const syncResult = await syncOfflineQueue(db);
      if (syncResult.synced > 0) {
        console.log(`✓ Synced ${syncResult.synced} queued items`);
      }
    }
  } catch (err) {
    console.log("⚠️  Supabase unavailable - will queue locally");
  }

  // Fetch emails
  let emails: GmailEmail[] = [];
  try {
    if (state.lastEmailCheck) {
      console.log(`\nFetching emails since ${state.lastEmailCheck}...`);
      const since = new Date(state.lastEmailCheck);
      emails = await fetchEmailsSince(since, maxEmails);
    } else {
      console.log(`\nFetching ${maxEmails} recent emails...`);
      emails = await fetchRecentEmails(maxEmails);
    }
    console.log(`✓ Found ${emails.length} emails`);
  } catch (err: any) {
    console.error("❌ Gmail fetch failed:", err.message);
    return;
  }

  // Filter out already-processed emails
  const newEmails = emails.filter((e) => !processedIds.has(e.id));
  console.log(`✓ ${newEmails.length} new emails to process\n`);

  if (newEmails.length === 0) {
    console.log("No new emails. Done.");
    return;
  }

  // Process each email
  const results: ScoredEmail[] = [];
  for (const email of newEmails) {
    const scored = await processEmail(email, db, dryRun);
    results.push(scored);
    processedIds.add(email.id);

    // Small delay between Ollama calls
    await new Promise((r) => setTimeout(r, 300));
  }

  // Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━");
  console.log("Summary:");

  const urgent = results.filter((r) => r.score >= 10);
  const briefing = results.filter((r) => r.score >= 7 && r.score < 10);
  const subscriptions = results.filter((r) => r.category === "subscription");
  const ignored = results.filter((r) => r.score < 5);

  console.log(`  🚨 Urgent: ${urgent.length}`);
  console.log(`  💼 For briefing: ${briefing.length}`);
  console.log(`  💳 Subscriptions: ${subscriptions.length}`);
  console.log(`  📭 Ignored: ${ignored.length}`);

  // Update state
  if (!dryRun) {
    saveState({
      lastEmailCheck: new Date().toISOString(),
      processedEmailIds: Array.from(processedIds).slice(-500), // Keep last 500 IDs
    });
    console.log("\n✓ State saved");
  }

  console.log("\n📧 EmailGolem - Done!\n");
}

/**
 * CLI
 */
async function main() {
  const args = process.argv.slice(2);

  const dryRun = args.includes("--dry-run") || args.includes("-n");
  const maxEmailsArg = args.find((a) => a.startsWith("--max="));
  const maxEmails = maxEmailsArg ? parseInt(maxEmailsArg.split("=")[1], 10) : 20;

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
EmailGolem - Smart Email Triage

Usage:
  bun run src/email-golem/index.ts [options]

Options:
  --dry-run, -n    Don't save to DB or send notifications
  --max=N          Maximum emails to fetch (default: 20)
  --help, -h       Show this help

Examples:
  bun run src/email-golem/index.ts --dry-run
  bun run src/email-golem/index.ts --max=50
`);
    process.exit(0);
  }

  try {
    await processEmails({ dryRun, maxEmails });
    process.exit(0);
  } catch (err) {
    console.error("❌ EmailGolem failed:", err);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

// Exports for testing and briefing integration
export { processEmails, loadState, saveState, CATEGORY_EMOJIS };
