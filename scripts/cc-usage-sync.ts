#!/usr/bin/env bun
/**
 * Claude Code Usage Sync — syncs CC session token usage into Supabase llm_usage table.
 *
 * Reads JSONL transcript files from ~/.claude/projects/, aggregates per-session,
 * calculates cost from pricing table, and inserts into llm_usage with source="claude-code".
 *
 * Dedup: uses metadata.session_id to skip already-synced sessions.
 *
 * Usage:
 *   bun scripts/cc-usage-sync.ts                  # Sync last 7 days (default)
 *   bun scripts/cc-usage-sync.ts --days 30        # Sync last 30 days
 *   bun scripts/cc-usage-sync.ts --days 1         # Sync today only
 *   bun scripts/cc-usage-sync.ts --dry-run        # Show what would be synced
 */

import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join } from "path";

// ─── Load env ─────────────────────────────────────────────────────
try {
  await import("../packages/shared/src/lib/load-env");
} catch { /* ok if not in repo root */ }

// ─── Types ─────────────────────────────────────────────────────────

interface SessionUsage {
  sessionId: string;
  project: string;
  model: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  apiCalls: number;
  costUsd: number;
}

// ─── Pricing (per MTok, Feb 2026) ──────────────────────────────────

const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheCreate: number }> = {
  "claude-opus-4-6":              { input: 15.0,  output: 75.0,  cacheRead: 1.5,   cacheCreate: 18.75  },
  "claude-opus-4-5-20250620":     { input: 15.0,  output: 75.0,  cacheRead: 1.5,   cacheCreate: 18.75  },
  "claude-sonnet-4-5-20250929":   { input: 3.0,   output: 15.0,  cacheRead: 0.30,  cacheCreate: 3.75   },
  "claude-sonnet-4-5-20250514":   { input: 3.0,   output: 15.0,  cacheRead: 0.30,  cacheCreate: 3.75   },
  "claude-haiku-4-5-20251001":    { input: 0.80,  output: 4.0,   cacheRead: 0.08,  cacheCreate: 1.0    },
};

function getModelPricing(model: string) {
  if (PRICING[model]) return PRICING[model];
  if (model.includes("opus"))   return PRICING["claude-opus-4-6"];
  if (model.includes("sonnet")) return PRICING["claude-sonnet-4-5-20250929"];
  if (model.includes("haiku"))  return PRICING["claude-haiku-4-5-20251001"];
  return PRICING["claude-sonnet-4-5-20250929"];
}

function calculateCost(model: string, input: number, output: number, cacheRead: number, cacheCreate: number): number {
  const p = getModelPricing(model);
  return (input / 1_000_000 * p.input)
       + (output / 1_000_000 * p.output)
       + (cacheRead / 1_000_000 * p.cacheRead)
       + (cacheCreate / 1_000_000 * p.cacheCreate);
}

// ─── Parse CC Transcripts ──────────────────────────────────────────

function scanCCTranscripts(cutoffDate: Date): SessionUsage[] {
  const home = process.env.HOME;
  if (!home) return [];
  const projectsDir = join(home, ".claude", "projects");
  if (!existsSync(projectsDir)) return [];

  const sessions: SessionUsage[] = [];
  const projectDirs = readdirSync(projectsDir);

  for (const proj of projectDirs) {
    const projPath = join(projectsDir, proj);
    try {
      if (!statSync(projPath).isDirectory()) continue;
    } catch { continue; }

    const files = readdirSync(projPath).filter(f => f.endsWith(".jsonl"));

    for (const file of files) {
      const filePath = join(projPath, file);
      const sessionId = file.replace(".jsonl", "");

      // Skip old files by mtime
      try {
        const mtime = statSync(filePath).mtime;
        if (mtime < cutoffDate) continue;
      } catch { continue; }

      try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter(l => l.trim());

        let totalInput = 0;
        let totalOutput = 0;
        let totalCacheRead = 0;
        let totalCacheCreate = 0;
        let apiCalls = 0;
        let model = "unknown";
        let firstTimestamp = "";

        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            if (obj.type !== "assistant") continue;

            const msg = obj.message;
            if (!msg || typeof msg !== "object") continue;

            const usage = msg.usage;
            if (!usage) continue;

            if (!firstTimestamp && obj.timestamp) firstTimestamp = obj.timestamp;
            if (msg.model) model = msg.model;

            totalInput += usage.input_tokens || 0;
            totalOutput += usage.output_tokens || 0;
            totalCacheRead += usage.cache_read_input_tokens || 0;
            totalCacheCreate += usage.cache_creation_input_tokens || 0;
            apiCalls++;
          } catch { /* skip malformed */ }
        }

        if (apiCalls > 0) {
          // Filter by cutoff on actual timestamp
          if (firstTimestamp) {
            const sessionDate = new Date(firstTimestamp);
            if (sessionDate < cutoffDate) continue;
          }

          const cost = calculateCost(model, totalInput, totalOutput, totalCacheRead, totalCacheCreate);
          const projectName = proj.replace(/^-Users-etanheyman-/, "").replace(/-/g, "/");

          sessions.push({
            sessionId,
            project: projectName || "root",
            model,
            timestamp: firstTimestamp,
            inputTokens: totalInput,
            outputTokens: totalOutput,
            cacheReadTokens: totalCacheRead,
            cacheCreateTokens: totalCacheCreate,
            apiCalls,
            costUsd: cost,
          });
        }
      } catch { /* skip unreadable */ }
    }
  }

  return sessions;
}

// ─── Supabase Sync ─────────────────────────────────────────────────

async function getExistingSessionIds(): Promise<Set<string>> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY required");

  const resp = await fetch(
    `${url}/rest/v1/llm_usage?source=eq.claude-code&select=metadata&limit=50000`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!resp.ok) throw new Error(`Failed to fetch existing sessions: ${resp.status}`);

  const rows = await resp.json() as Array<{ metadata: { session_id?: string } | null }>;
  const ids = new Set<string>();
  for (const row of rows) {
    const sid = row.metadata?.session_id;
    if (sid) ids.add(sid);
  }
  return ids;
}

async function insertSessions(sessions: SessionUsage[]): Promise<number> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY required");

  // Insert in batches of 100
  const BATCH = 100;
  let inserted = 0;

  for (let i = 0; i < sessions.length; i += BATCH) {
    const batch = sessions.slice(i, i + BATCH);
    const rows = batch.map(s => ({
      model: s.model,
      source: "claude-code",
      input_tokens: s.inputTokens,
      output_tokens: s.outputTokens,
      cost_usd: s.costUsd,
      cache_read_tokens: s.cacheReadTokens,
      cache_creation_tokens: s.cacheCreateTokens,
      tier: "subscription",
      created_at: s.timestamp || new Date().toISOString(),
      metadata: {
        session_id: s.sessionId,
        project: s.project,
        api_calls: s.apiCalls,
      },
    }));

    const resp = await fetch(`${url}/rest/v1/llm_usage`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(rows),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Insert failed (batch ${i / BATCH + 1}): ${resp.status} ${body}`);
    }
    inserted += batch.length;
  }

  return inserted;
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const daysArg = args.find(a => a.startsWith("--days"));
  const days = daysArg
    ? parseInt(args[args.indexOf(daysArg) + 1] || args[0]?.split("=")[1] || "7")
    : 7;
  const dryRun = args.includes("--dry-run");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  console.log(`Scanning CC transcripts since ${cutoff.toISOString().slice(0, 10)} (${days} days)...`);
  const sessions = scanCCTranscripts(cutoff);
  console.log(`Found ${sessions.length} sessions with usage data.`);

  if (sessions.length === 0) {
    console.log("Nothing to sync.");
    return;
  }

  // Dedup: check which sessions already exist in Supabase
  console.log("Checking existing sessions in Supabase...");
  const existing = await getExistingSessionIds();
  const newSessions = sessions.filter(s => !existing.has(s.sessionId));
  console.log(`${existing.size} already synced, ${newSessions.length} new sessions to insert.`);

  if (newSessions.length === 0) {
    console.log("All sessions already synced. Nothing to do.");
    return;
  }

  // Show summary
  const totalCost = newSessions.reduce((s, x) => s + x.costUsd, 0);
  const totalInput = newSessions.reduce((s, x) => s + x.inputTokens, 0);
  const totalOutput = newSessions.reduce((s, x) => s + x.outputTokens, 0);
  const totalCacheRead = newSessions.reduce((s, x) => s + x.cacheReadTokens, 0);
  const totalCacheCreate = newSessions.reduce((s, x) => s + x.cacheCreateTokens, 0);

  console.log(`\nSummary of new sessions:`);
  console.log(`  Sessions: ${newSessions.length}`);
  console.log(`  Input tokens: ${totalInput.toLocaleString()}`);
  console.log(`  Output tokens: ${totalOutput.toLocaleString()}`);
  console.log(`  Cache read: ${totalCacheRead.toLocaleString()}`);
  console.log(`  Cache create: ${totalCacheCreate.toLocaleString()}`);
  console.log(`  Estimated cost: $${totalCost.toFixed(2)}`);

  // By model breakdown
  const byModel: Record<string, number> = {};
  for (const s of newSessions) {
    byModel[s.model] = (byModel[s.model] || 0) + 1;
  }
  console.log(`  Models: ${Object.entries(byModel).map(([m, c]) => `${m}(${c})`).join(", ")}`);

  if (dryRun) {
    console.log("\n[DRY RUN] Would insert the above sessions. Use without --dry-run to actually sync.");
    return;
  }

  // Insert
  console.log("\nInserting into Supabase...");
  const inserted = await insertSessions(newSessions);
  console.log(`Done! Inserted ${inserted} sessions into llm_usage (source: "claude-code").`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
