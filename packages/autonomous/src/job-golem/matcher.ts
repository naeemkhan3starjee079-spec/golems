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
// Profile now in consolidated monorepo location
const PROFILE_PATH = join(HOME, "Gits/golems/packages/autonomous/src/job-golem/profile.json");

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

  // Build matching prompt with nuanced requirements understanding
  const prompt = `You are a job matching assistant. Analyze if this job is a good fit for the candidate.

CANDIDATE PROFILE:
- Experience: ${profile.yearsExperience}+ years
- Target roles: ${profile.roles.join(", ")}
- PRIMARY skills (daily use): ${profile.primarySkills.join(", ")}
- SECONDARY skills (production experience): ${profile.secondarySkills.join(", ")}
- Languages: Hebrew (native), English (near-native), Spanish (intermediate)
- Location: Looking for jobs in Israel or fully remote

JOB LISTING${isHebrew ? " (Hebrew - translate if needed)" : ""}:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description || "(no description)"}
- Source: ${job.source}

CRITICAL: Distinguish between REQUIREMENTS and NICE-TO-HAVE!
- Look for sections like "Requirements", "Must have" vs "Nice to have", "Preferred", "Bonus"
- Wrong-stack tech (C#, .NET, Java, Angular, PHP) in REQUIREMENTS = low score (1-3)
- Wrong-stack tech in NICE-TO-HAVE only, with right-stack (React/TypeScript) in REQUIREMENTS = still good (7-9)

SCORING LOGIC:
1. First: Is this the RIGHT tech stack (React/TypeScript/Next.js ecosystem)?
   - If wrong stack (Java/.NET/C#/Angular/PHP) is REQUIRED → score 1-3
   - If wrong stack is only nice-to-have but React/TS is required → continue scoring
2. Then: Does experience level match (3+ years, not senior/staff/principal)?
3. Then: Is location compatible (Israel or remote)?
4. Finally: How many primary skills match the requirements?

SCORES:
- 9-10: React/TS ecosystem, experience matches, location works, most skills align
- 7-8: Right stack, good fit with minor gaps
- 5-6: Partial match, might be worth a look
- 3-4: Weak match, significant gaps
- 1-2: Wrong stack in requirements, wrong seniority, or wrong location

Respond with ONLY a JSON object:
{"score": 1-10, "reason": "brief explanation including what's REQUIRED vs nice-to-have", "highlights": ["matching", "skills"]}`;

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
 * Now with parallel processing support via OLLAMA_NUM_PARALLEL env var
 */
export async function matchJobs(jobs: JobListing[], minScore = 6): Promise<MatchResult[]> {
  console.log(`[Matcher] Scoring ${jobs.length} jobs with Ollama...`);

  const startTime = Date.now();
  const results: MatchResult[] = [];

  // Process jobs - Ollama handles parallelism via OLLAMA_NUM_PARALLEL
  // No artificial delay needed - Ollama batches requests automatically
  for (const job of jobs) {
    console.log(`  • Scoring: ${job.title} @ ${job.company}`);
    const result = await matchJob(job);
    results.push(result);
    // Removed 500ms delay - Ollama handles rate limiting internally
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Filter and sort by score
  const matches = results
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score);

  console.log(`[Matcher] ${matches.length}/${jobs.length} jobs scored ${minScore}+ in ${elapsed}s`);
  return matches;
}

/**
 * TIER 0: Instant reject based on job title
 * These are wrong-stack jobs that don't need any further analysis
 */
const WRONG_STACK_TITLE_PATTERNS = [
  /\b(java|c#|\.net|dotnet|php|angular)\s+(developer|engineer|programmer)/i,
  /\b(devops|sre|site reliability|infrastructure|platform)\s+(engineer|developer)/i,
  /\b(data\s+scientist|machine\s+learning|ml\s+engineer|ai\s+engineer)/i,
  /\b(embedded|firmware|hardware)\s+(engineer|developer)/i,
  /\b(qa|quality\s+assurance|test)\s+(engineer|developer|analyst)/i,
  /\bcobol\b/i,
  /\brpg\s+developer/i,
];

/**
 * TIER 0: Instant pass - these are definitely worth scoring
 */
const RIGHT_STACK_TITLE_PATTERNS = [
  /\b(react|next\.?js|typescript|frontend|front-end)\s+(developer|engineer)/i,
  /\b(full\s*stack|fullstack)\s+(developer|engineer)/i,
  /\bnode\.?js\s+(developer|engineer)/i,
];

/**
 * TIER 1: Wrong-stack keywords in REQUIREMENTS section
 * If these appear in requirements (not just nice-to-have), likely wrong fit
 */
const WRONG_STACK_REQUIRED_KEYWORDS = [
  'c# required', 'c# is required', 'must have c#', 'must know c#',
  '.net required', '.net is required', 'must have .net', 'must know .net',
  'java required', 'java is required', 'must have java', 'must know java',
  'angular required', 'angular is required', 'must have angular',
  'php required', 'php is required', 'must have php',
  'python required', 'python is required', 'must have python', // unless it's a React+Python role
  'go required', 'golang required', 'must have go',
  'rust required', 'must have rust',
];

/**
 * Section headers that indicate REQUIREMENTS (not nice-to-have)
 */
const REQUIREMENTS_SECTION_PATTERNS = [
  /requirements?:?/i,
  /must\s+have:?/i,
  /essential:?/i,
  /what\s+you('ll)?\s+need:?/i,
  /minimum\s+qualifications?:?/i,
  /required\s+skills?:?/i,
];

/**
 * Section headers that indicate NICE-TO-HAVE (safe to have wrong-stack here)
 */
const PREFERRED_SECTION_PATTERNS = [
  /nice\s+to\s+have:?/i,
  /preferred:?/i,
  /bonus:?/i,
  /a\s+plus:?/i,
  /ideal(ly)?:?/i,
  /desired:?/i,
  /advantage:?/i,
];

/**
 * Extract the requirements section from a job description
 */
function extractRequirementsSection(description: string): string {
  const lines = description.split('\n');
  let inRequirements = false;
  let requirementsText = '';

  for (const line of lines) {
    // Check if we're entering a requirements section
    if (REQUIREMENTS_SECTION_PATTERNS.some(p => p.test(line))) {
      inRequirements = true;
      continue;
    }
    // Check if we're entering a preferred section (exit requirements)
    if (PREFERRED_SECTION_PATTERNS.some(p => p.test(line))) {
      inRequirements = false;
      continue;
    }
    // Collect requirements text
    if (inRequirements) {
      requirementsText += line + ' ';
    }
  }

  // If no clear sections, treat first 60% as requirements
  if (!requirementsText) {
    const cutoff = Math.floor(description.length * 0.6);
    requirementsText = description.substring(0, cutoff);
  }

  return requirementsText.toLowerCase();
}

export interface PrefilterResult {
  job: JobListing;
  tier: 'PASS' | 'REJECT' | 'NEEDS_LLM';
  reason: string;
}

/**
 * Tiered pre-filter before expensive Ollama scoring
 *
 * Tier 0: Title-based instant reject/pass (~40% filtered)
 * Tier 1: Requirements section analysis (~30% filtered)
 * Tier 2: Needs LLM for nuanced decision (~30% go to Ollama)
 */
export function prefilterJob(job: JobListing): PrefilterResult {
  const title = job.title.toLowerCase();
  const description = (job.description || '').toLowerCase();
  const text = `${title} ${description}`;

  // TIER 0: Title-based instant reject
  for (const pattern of WRONG_STACK_TITLE_PATTERNS) {
    if (pattern.test(job.title)) {
      return { job, tier: 'REJECT', reason: `Wrong stack in title: ${job.title}` };
    }
  }

  // TIER 0: Title-based instant pass (still needs LLM for scoring, but definitely worth it)
  for (const pattern of RIGHT_STACK_TITLE_PATTERNS) {
    if (pattern.test(job.title)) {
      return { job, tier: 'PASS', reason: `Right stack in title: ${job.title}` };
    }
  }

  // Hebrew jobs skip to LLM (need language understanding)
  if (job.language === 'he') {
    return { job, tier: 'NEEDS_LLM', reason: 'Hebrew job - needs LLM' };
  }

  // TIER 1: Check for wrong-stack in requirements section
  const requirementsSection = extractRequirementsSection(description);
  for (const keyword of WRONG_STACK_REQUIRED_KEYWORDS) {
    if (requirementsSection.includes(keyword)) {
      return { job, tier: 'REJECT', reason: `Wrong stack in requirements: "${keyword}"` };
    }
  }

  // TIER 1: Load profile and check excludeKeywords
  const profile = loadProfile();
  const excludeKeywords = profile.excludeKeywords.map((k: string) => k.toLowerCase());

  for (const kw of excludeKeywords) {
    if (text.includes(kw)) {
      return { job, tier: 'REJECT', reason: `Excluded keyword: "${kw}"` };
    }
  }

  // TIER 1: Check if any primary skills are mentioned
  const primarySkills = profile.primarySkills.map((s: string) => s.toLowerCase());
  const hasPrimarySkill = primarySkills.some((skill: string) => text.includes(skill));

  if (!hasPrimarySkill) {
    // No primary skills mentioned - likely wrong stack
    return { job, tier: 'REJECT', reason: 'No primary skills (React/TypeScript/Next.js) mentioned' };
  }

  // Passed basic checks - needs LLM for nuanced scoring
  return { job, tier: 'NEEDS_LLM', reason: 'Passed pre-filter, needs LLM scoring' };
}

/**
 * Quick keyword filter before expensive Ollama scoring
 * Now uses tiered approach for better filtering
 */
export function prefilterJobs(jobs: JobListing[]): JobListing[] {
  const results = jobs.map(job => prefilterJob(job));

  // Log filtering stats
  const rejected = results.filter(r => r.tier === 'REJECT');
  const passed = results.filter(r => r.tier === 'PASS');
  const needsLlm = results.filter(r => r.tier === 'NEEDS_LLM');

  console.log(`[Prefilter] ${jobs.length} jobs → ${rejected.length} rejected, ${passed.length} instant pass, ${needsLlm.length} need LLM`);

  // Log some rejection reasons for debugging
  if (rejected.length > 0) {
    console.log(`[Prefilter] Sample rejections:`);
    rejected.slice(0, 3).forEach(r => console.log(`  • ${r.job.title}: ${r.reason}`));
  }

  // Return jobs that passed or need LLM (not rejected)
  return results
    .filter(r => r.tier !== 'REJECT')
    .map(r => r.job);
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
