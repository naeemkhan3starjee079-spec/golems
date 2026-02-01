#!/usr/bin/env bun
/**
 * Job Golem - Matcher
 *
 * Uses Ollama (Qwen3) to match jobs against your profile.
 * Handles both English and Hebrew job listings.
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { JobListing } from "./scraper";
import { forJobGolem } from "../ollama-wrapper";

const HOME = process.env.HOME || "/Users/etanheyman";
const PROFILE_PATH = join(HOME, "Gits/golems-zikaron/src/job-golem/profile.json");

export interface MatchResult {
  job: JobListing;
  score: number; // 1-10
  reason: string;
  highlights: string[]; // Matching skills/keywords
}

// Load candidate profile
function loadProfile() {
  return JSON.parse(readFileSync(PROFILE_PATH, "utf-8"));
}

/**
 * Call Ollama for job matching (via wrapper for sandboxed mode support)
 */
async function callOllama(prompt: string): Promise<{ score: number; reason: string; highlights: string[] } | null> {
  const result = await forJobGolem.runOllamaJSON<{
    score: number;
    reason: string;
    highlights: string[];
  }>(prompt);

  if (result) {
    return {
      score: result.score || 5,
      reason: result.reason || "No reason",
      highlights: result.highlights || [],
    };
  }

  return null;
}

/**
 * Match a single job against profile
 */
export async function matchJob(job: JobListing): Promise<MatchResult> {
  const profile = loadProfile();

  const isHebrew = job.language === "he";

  // Build matching prompt (bilingual for Hebrew jobs)
  const prompt = `You are a job matching assistant. Analyze if this job is a good fit for the candidate.

CANDIDATE PROFILE:
- Experience: ${profile.yearsExperience}+ years
- Target roles: ${profile.roles.join(", ")}
- Primary skills: ${profile.primarySkills.join(", ")}
- Secondary skills: ${profile.secondarySkills.join(", ")}
- Languages: Hebrew (native), English (near-native), Spanish (intermediate)
- Location: Looking for jobs in Israel

JOB LISTING${isHebrew ? " (Hebrew - translate if needed)" : ""}:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description || "(no description)"}
- Source: ${job.source}

SCORING CRITERIA:
- 9-10: Perfect match - role, skills, and experience align
- 7-8: Good match - most skills match, reasonable fit
- 5-6: Partial match - some skills overlap
- 3-4: Weak match - few matching criteria
- 1-2: Poor match - wrong field/seniority/location

Respond with ONLY a JSON object:
{"score": 1-10, "reason": "brief explanation in English", "highlights": ["matching", "skills"]}`;

  const result = await callOllama(prompt);

  if (result) {
    return {
      job,
      score: result.score,
      reason: result.reason,
      highlights: result.highlights,
    };
  }

  // Default score if Ollama fails
  return {
    job,
    score: 5,
    reason: "Scoring unavailable",
    highlights: [],
  };
}

/**
 * Match multiple jobs and sort by score
 */
export async function matchJobs(jobs: JobListing[], minScore = 6): Promise<MatchResult[]> {
  console.log(`[Matcher] Scoring ${jobs.length} jobs with Ollama...`);

  const results: MatchResult[] = [];

  for (const job of jobs) {
    console.log(`  • Scoring: ${job.title} @ ${job.company}`);
    const result = await matchJob(job);
    results.push(result);

    // Rate limit Ollama calls
    await new Promise(r => setTimeout(r, 500));
  }

  // Filter and sort by score
  const matches = results
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score);

  console.log(`[Matcher] ${matches.length}/${jobs.length} jobs scored ${minScore}+`);
  return matches;
}

/**
 * Quick keyword filter before expensive Ollama scoring
 * Note: Hebrew jobs skip keyword filter since qwen3-coder handles Hebrew matching
 */
export function prefilterJobs(jobs: JobListing[]): JobListing[] {
  const profile = loadProfile();
  const keywords = profile.keywords.map((k: string) => k.toLowerCase());
  const excludeKeywords = profile.excludeKeywords.map((k: string) => k.toLowerCase());

  return jobs.filter((job) => {
    const text = `${job.title} ${job.description}`.toLowerCase();

    // Exclude jobs with senior requirements (works for English)
    if (job.language === "en" && excludeKeywords.some((kw) => text.includes(kw))) {
      return false;
    }

    // Hebrew jobs skip keyword filter - let Ollama handle matching
    if (job.language === "he") {
      return true;
    }

    // English jobs: Include if any keyword matches
    return keywords.some((kw) => text.includes(kw));
  });
}

// CLI
if (import.meta.main) {
  console.log("🎯 Job Golem Matcher Test\n");

  // Test with a sample job
  const testJob: JobListing = {
    id: "test-1",
    title: "Full Stack Developer",
    company: "Test Startup",
    location: "Tel Aviv, Israel",
    description: "Looking for a React/Node.js developer with 2+ years experience. Tailwind CSS, TypeScript preferred.",
    url: "https://example.com/job/1",
    source: "secretTLV",
    language: "en",
    scrapedAt: new Date().toISOString(),
  };

  const result = await matchJob(testJob);
  console.log(`\nScore: ${result.score}/10`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Highlights: ${result.highlights.join(", ")}`);
}
