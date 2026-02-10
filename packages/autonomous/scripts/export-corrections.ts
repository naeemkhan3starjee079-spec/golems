#!/usr/bin/env bun
/**
 * Export human corrections from Supabase for Ollama fine-tuning.
 *
 * Outputs JSONL training data in Ollama's expected format:
 * { "prompt": "...", "completion": "..." }
 *
 * Usage:
 *   bun scripts/export-corrections.ts                    # export all
 *   bun scripts/export-corrections.ts --type emails      # emails only
 *   bun scripts/export-corrections.ts --type jobs        # jobs only
 *   bun scripts/export-corrections.ts --min 10           # min N corrections
 */

import "../src/lib/load-env";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { join } from "path";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

interface EmailCorrection {
  subject: string;
  from_address: string;
  snippet: string;
  score: number;
  category: string;
  human_score: number;
  human_category: string;
}

interface JobCorrection {
  title: string;
  company: string;
  location: string;
  description: string;
  match_score: number;
  human_match_score: number;
  human_relevant: boolean;
}

interface TrainingExample {
  prompt: string;
  completion: string;
}

async function exportEmailCorrections(): Promise<TrainingExample[]> {
  const { data, error } = await supabase
    .from("emails")
    .select("subject, from_address, snippet, score, category, human_score, human_category")
    .not("human_score", "is", null);

  if (error) {
    console.error("[Export] Email query error:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.log("[Export] No email corrections found yet");
    return [];
  }

  console.log(`[Export] Found ${data.length} email corrections`);

  return (data as EmailCorrection[]).map((email) => ({
    prompt: `Score this email for urgency (1-10) and categorize it.

EMAIL:
- Subject: ${email.subject}
- From: ${email.from_address}
- Preview: ${email.snippet || ""}

Categories: interview, urgent, job, subscription, tech-update, newsletter, promo, social, other

Respond with JSON: {"score": N, "category": "...", "reason": "..."}`,
    completion: JSON.stringify({
      score: email.human_score ?? email.score,
      category: email.human_category ?? email.category,
      reason: `Corrected from AI score ${email.score}/${email.category}`,
    }),
  }));
}

async function exportJobCorrections(): Promise<TrainingExample[]> {
  const { data, error } = await supabase
    .from("golem_jobs")
    .select("title, company, location, description, match_score, human_match_score, human_relevant")
    .not("human_match_score", "is", null);

  if (error) {
    console.error("[Export] Job query error:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.log("[Export] No job corrections found yet");
    return [];
  }

  console.log(`[Export] Found ${data.length} job corrections`);

  return (data as JobCorrection[]).map((job) => ({
    prompt: `Score this job listing for relevance (1-10) to a senior fullstack developer (React, TypeScript, Node.js, Python) looking for roles in Israel.

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || "Israel"}
- Description: ${(job.description || "").slice(0, 500)}

Respond with JSON: {"score": N, "relevant": true/false, "reason": "..."}`,
    completion: JSON.stringify({
      score: job.human_match_score ?? job.match_score,
      relevant: job.human_relevant ?? true,
      reason: `Corrected from AI score ${job.match_score}`,
    }),
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const typeFilter = args.includes("--type") ? args[args.indexOf("--type") + 1] : "all";
  const minCount = args.includes("--min") ? parseInt(args[args.indexOf("--min") + 1]) : 0;

  const examples: TrainingExample[] = [];

  if (typeFilter === "all" || typeFilter === "emails") {
    examples.push(...(await exportEmailCorrections()));
  }

  if (typeFilter === "all" || typeFilter === "jobs") {
    examples.push(...(await exportJobCorrections()));
  }

  if (examples.length === 0) {
    console.log("\nNo corrections to export. Start correcting scores on the dashboard!");
    console.log("Emails: https://etanheyman.com/admin/golem/emails");
    console.log("Jobs: https://etanheyman.com/admin/golem/jobs");
    return;
  }

  if (minCount > 0 && examples.length < minCount) {
    console.log(`\nOnly ${examples.length} corrections (need ${minCount}). Keep correcting!`);
    return;
  }

  // Write JSONL for Ollama fine-tuning
  const outputPath = join(import.meta.dir, "../data/training-corrections.jsonl");
  const jsonl = examples.map((e) => JSON.stringify(e)).join("\n");
  writeFileSync(outputPath, jsonl + "\n");

  console.log(`\nExported ${examples.length} training examples to: ${outputPath}`);
  console.log(`  Emails: ${examples.filter((e) => e.prompt.includes("email")).length}`);
  console.log(`  Jobs: ${examples.filter((e) => e.prompt.includes("job listing")).length}`);
  console.log(`\nTo fine-tune Ollama:`);
  console.log(`  ollama create golems-scorer -f Modelfile`);
  console.log(`  # Modelfile should reference the JSONL for training`);
}

main().catch(console.error);
