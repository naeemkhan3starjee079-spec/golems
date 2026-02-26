#!/usr/bin/env bun
/**
 * Import LinkedIn Connections to Supabase
 *
 * Parses the exported Connections.csv and imports into linkedin_connections table.
 * Normalizes company names for fuzzy matching against job listings.
 *
 * Usage:
 *   bun scripts/import-linkedin-connections.ts [--dry-run]
 */

import "../src/lib/load-env";

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME!;
const CSV_PATH = join(HOME, "Gits/golems/docs.local/Basic_LinkedInDataExport_02-09-2026.zip/Connections.csv");
const MESSAGES_PATH = join(HOME, "Gits/golems/docs.local/Basic_LinkedInDataExport_02-09-2026.zip/messages.csv");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Company name suffixes to strip for normalization */
const COMPANY_SUFFIXES = [
  /\s*\(.*?\)\s*/g,   // Remove parenthetical
  /\s*[-–]\s*.+$/,     // Remove " - subtitle"
  /\s*(ltd|inc|corp|llc|gmbh|sa|ag|plc|co|limited|בע"?מ)\.?\s*$/i,
  /\s*®\s*/g,          // Remove ®
  /\s*™\s*/g,          // Remove ™
];

function normalizeCompany(company: string): string {
  let normalized = company.trim().toLowerCase();
  for (const pattern of COMPANY_SUFFIXES) {
    normalized = normalized.replace(pattern, "");
  }
  return normalized.trim();
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n");

  // Find the header line (skip notes at the top)
  let headerIdx = lines.findIndex(l => l.startsWith("First Name,"));
  if (headerIdx === -1) {
    console.error("Could not find CSV header");
    return [];
  }

  const headers = lines[headerIdx].split(",").map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse (handles quoted fields)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

/** Check which connections have LinkedIn messages (indicates stronger relationship) */
function getConnectionsWithMessages(): Set<string> {
  const withMessages = new Set<string>();

  if (!existsSync(MESSAGES_PATH)) {
    console.log("[Messages] messages.csv not found, skipping relationship strength");
    return withMessages;
  }

  const content = readFileSync(MESSAGES_PATH, "utf-8");
  // Extract unique participant URLs from messages
  const urlPattern = /linkedin\.com\/in\/([a-zA-Z0-9-]+)/g;
  let match;
  while ((match = urlPattern.exec(content)) !== null) {
    withMessages.add(`https://www.linkedin.com/in/${match[1]}`);
  }

  console.log(`[Messages] Found ${withMessages.size} connections with message history`);
  return withMessages;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (!existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const content = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(content);
  const connectionsWithMessages = getConnectionsWithMessages();

  console.log(`[Import] Parsed ${rows.length} connections from CSV`);

  if (dryRun) {
    console.log("[Import] DRY RUN — showing first 5:");
    for (const row of rows.slice(0, 5)) {
      const normalized = normalizeCompany(row["Company"] || "");
      console.log(`  ${row["First Name"]} ${row["Last Name"]} — ${row["Company"]} → "${normalized}"`);
    }
    console.log(`\n[Import] Companies with messages: ${connectionsWithMessages.size}`);
    return;
  }

  // Prepare records
  const records = rows
    .filter(r => r["First Name"] && r["Last Name"]) // Skip malformed rows
    .map(r => {
      const url = r["URL"] || null;
      const hasMessages = url ? connectionsWithMessages.has(url) : false;

      return {
        first_name: r["First Name"].trim(),
        last_name: r["Last Name"].trim(),
        linkedin_url: url,
        email: r["Email Address"] || null,
        company: r["Company"] || null,
        company_normalized: r["Company"] ? normalizeCompany(r["Company"]) : null,
        position: r["Position"] || null,
        connected_on: r["Connected On"] ? parseDate(r["Connected On"]) : null,
        has_messages: hasMessages,
        relationship_strength: hasMessages ? "medium" : "unknown",
      };
    });

  // Batch upsert
  const BATCH_SIZE = 50;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("linkedin_connections")
      .upsert(batch, { onConflict: "linkedin_url", ignoreDuplicates: true });

    if (error) {
      console.error(`[Import] Batch error:`, error.message);
      errors += batch.length;
    } else {
      imported += batch.length;
    }
  }

  console.log(`[Import] Done: ${imported} imported, ${errors} errors`);

  // Stats
  const companies = new Set(records.map(r => r.company_normalized).filter(Boolean));
  const withEmail = records.filter(r => r.email).length;
  const withMessages = records.filter(r => r.has_messages).length;

  console.log(`[Stats] Unique companies: ${companies.size}`);
  console.log(`[Stats] With email: ${withEmail}`);
  console.log(`[Stats] With messages: ${withMessages}`);
}

/** Parse "09 Feb 2026" format */
function parseDate(dateStr: string): string | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  } catch {
    return null;
  }
}

main().catch(err => {
  console.error("[Import] Fatal:", err);
  process.exit(1);
});
