#!/usr/bin/env bun
/**
 * Soltome Learner - Learn from high-performing Soltome posts
 *
 * Runs at 2am BEFORE Night Shift (3am)
 * Fetches posts via HTTP, scores with Ollama, extracts patterns
 *
 * Types are tied to SoltomePost from soltome-client.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { fetchPosts, type SoltomePost } from "./soltome-client";
import { runOllamaJSON, runOllama } from "./ollama-wrapper";

const HOME = process.env.HOME || "/Users/etanheyman";
const DEFAULT_DATA_DIR = join(HOME, "Gits/golems-zikaron/data");
const DEFAULT_TRAINING_FILE = join(DEFAULT_DATA_DIR, "soltome-training.json");
const DEFAULT_PATTERNS_FILE = join(DEFAULT_DATA_DIR, "soltome-patterns.json");

// Training data extends SoltomePost with quality score
export interface TrainingPost extends SoltomePost {
  qualityScore: number; // Ollama-assigned 1-10
  scrapedAt: string;
}

// Learned patterns structure
export interface LearnedPatterns {
  topPerformers: TrainingPost[];
  patterns: {
    titlePatterns: string[];
    contentPatterns: string[];
    avoidPatterns: string[];
  };
  stats: {
    totalPosts: number;
    avgQuality: number;
    topAuthor: string;
  };
  updatedAt: string;
}

// Config for the learner
interface LearnerConfig {
  dataDir?: string;
  maxPosts?: number;
}

function getTrainingFile(dataDir?: string): string {
  return dataDir ? join(dataDir, "soltome-training.json") : DEFAULT_TRAINING_FILE;
}

function getPatternsFile(dataDir?: string): string {
  return dataDir ? join(dataDir, "soltome-patterns.json") : DEFAULT_PATTERNS_FILE;
}

/**
 * Load training data from JSON file
 */
export function loadTrainingData(filePath?: string): TrainingPost[] {
  const path = filePath || DEFAULT_TRAINING_FILE;
  try {
    if (!existsSync(path)) return [];
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Save training data to JSON file
 */
export function saveTrainingData(posts: TrainingPost[], filePath?: string): void {
  const path = filePath || DEFAULT_TRAINING_FILE;
  const dir = join(path, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(posts, null, 2));
}

/**
 * Load learned patterns from JSON file
 */
function loadPatterns(filePath?: string): LearnedPatterns | null {
  const path = filePath || DEFAULT_PATTERNS_FILE;
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Save learned patterns to JSON file
 */
function savePatterns(patterns: LearnedPatterns, filePath?: string): void {
  const path = filePath || DEFAULT_PATTERNS_FILE;
  const dir = join(path, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(patterns, null, 2));
}

/**
 * Score posts using Ollama (quality 1-10)
 *
 * Criteria:
 * - Originality and insight (not spam)
 * - Technical depth
 * - Engagement potential
 * - Authenticity (not promotional)
 */
export async function scorePosts(posts: SoltomePost[]): Promise<TrainingPost[]> {
  if (posts.length === 0) return [];

  const scored: TrainingPost[] = [];

  for (const post of posts) {
    const prompt = `Rate this Soltome post quality from 1-10.

Title: ${post.title}
Content: ${post.content?.slice(0, 500) || "(no content)"}
Author: ${post.author?.username || "unknown"}
Votes: ${post.vote_count || 0}

Criteria:
- Originality and insight (not spam/promo)
- Technical depth or thoughtfulness
- Engagement potential (interesting to discuss)
- Authenticity (genuine, not self-promotional)

Respond with ONLY a JSON object:
{"score": <number 1-10>, "reason": "<brief reason>"}`;

    try {
      const result = await runOllamaJSON<{ score: number; reason: string }>(prompt, "soltome-learner");

      const qualityScore = Math.min(10, Math.max(1, result?.score || 5));

      scored.push({
        ...post,
        qualityScore,
        scrapedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[Score] Failed to score post ${post.id}:`, err);
      // Default to neutral score on error
      scored.push({
        ...post,
        qualityScore: 5,
        scrapedAt: new Date().toISOString(),
      });
    }
  }

  return scored;
}

/**
 * Extract patterns from top-performing posts using Ollama
 */
export async function extractPatterns(
  posts: SoltomePost[] | TrainingPost[]
): Promise<LearnedPatterns["patterns"]> {
  if (posts.length === 0) {
    return {
      titlePatterns: [],
      contentPatterns: [],
      avoidPatterns: [],
    };
  }

  // Get top posts by vote count or quality score
  const sorted = [...posts].sort((a, b) => {
    const aScore = "qualityScore" in a ? a.qualityScore : (a.vote_count || 0);
    const bScore = "qualityScore" in b ? b.qualityScore : (b.vote_count || 0);
    return bScore - aScore;
  });

  const topPosts = sorted.slice(0, 10);
  const bottomPosts = sorted.slice(-3);

  const examples = topPosts
    .map(
      (p) =>
        `Title: ${p.title}\nContent: ${p.content?.slice(0, 200) || "(none)"}\nVotes: ${p.vote_count || 0}`
    )
    .join("\n\n---\n\n");

  const badExamples = bottomPosts
    .map((p) => `Title: ${p.title}`)
    .join("\n");

  const prompt = `Analyze these top-performing Soltome posts and extract patterns.

TOP POSTS:
${examples}

LOW-PERFORMING:
${badExamples}

What makes the top posts successful? What should be avoided?

Respond with ONLY a JSON object:
{
  "titlePatterns": ["pattern 1", "pattern 2", "pattern 3"],
  "contentPatterns": ["what works in content"],
  "avoidPatterns": ["what to avoid based on low performers"]
}`;

  try {
    const result = await runOllamaJSON<LearnedPatterns["patterns"]>(prompt, "soltome-learner");

    return result || {
      titlePatterns: ["Share specific learnings", "Ask thought-provoking questions", "Use concrete examples"],
      contentPatterns: ["Be concise", "Show don't tell", "Include technical details"],
      avoidPatterns: ["Self-promotion", "Vague platitudes", "Hiring posts"],
    };
  } catch (err) {
    console.error("[Patterns] Failed to extract patterns:", err);
    return {
      titlePatterns: ["Share learnings", "Ask questions"],
      contentPatterns: ["Be concise", "Be specific"],
      avoidPatterns: ["Spam", "Self-promotion"],
    };
  }
}

/**
 * Merge new posts with existing training data (dedupe by id)
 * New posts with same id override old ones (fresher data wins)
 */
export function mergeTrainingData(
  existing: TrainingPost[],
  newPosts: TrainingPost[]
): TrainingPost[] {
  const byId = new Map<string, TrainingPost>();

  // Add existing first
  for (const post of existing) {
    byId.set(post.id, post);
  }

  // Override with new (newer data wins)
  for (const post of newPosts) {
    byId.set(post.id, post);
  }

  // Sort by quality score
  return Array.from(byId.values()).sort((a, b) => b.qualityScore - a.qualityScore);
}

/**
 * Calculate stats from training data
 */
function calculateStats(posts: TrainingPost[]): LearnedPatterns["stats"] {
  if (posts.length === 0) {
    return { totalPosts: 0, avgQuality: 0, topAuthor: "none" };
  }

  const totalQuality = posts.reduce((sum, p) => sum + p.qualityScore, 0);

  // Find top author by average quality
  const authorScores = new Map<string, { total: number; count: number }>();
  for (const post of posts) {
    const author = post.author?.username || "unknown";
    const current = authorScores.get(author) || { total: 0, count: 0 };
    authorScores.set(author, {
      total: current.total + post.qualityScore,
      count: current.count + 1,
    });
  }

  let topAuthor = "none";
  let topAvg = 0;
  for (const [author, scores] of authorScores) {
    const avg = scores.total / scores.count;
    if (avg > topAvg && scores.count >= 2) {
      // Require at least 2 posts
      topAvg = avg;
      topAuthor = author;
    }
  }

  return {
    totalPosts: posts.length,
    avgQuality: Math.round((totalQuality / posts.length) * 10) / 10,
    topAuthor,
  };
}

/**
 * Main learning function
 */
export async function learnFromSoltome(config: LearnerConfig = {}): Promise<LearnedPatterns> {
  const { dataDir, maxPosts = 50 } = config;

  console.log("\n📚 Soltome Learner starting...");
  console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);

  // Ensure data directory exists
  const trainingFile = getTrainingFile(dataDir);
  const patternsFile = getPatternsFile(dataDir);
  const dir = dataDir || DEFAULT_DATA_DIR;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Load existing training data
  const existing = loadTrainingData(trainingFile);
  console.log(`[Data] Loaded ${existing.length} existing posts`);

  // Fetch fresh posts from Soltome (HTTP only)
  console.log("[Fetch] Fetching posts from Soltome...");
  const freshPosts = await fetchPosts(maxPosts);

  if (freshPosts.length === 0) {
    console.log("[Fetch] No posts fetched (API may be down or no API key)");

    // Return existing patterns if available
    const existingPatterns = loadPatterns(patternsFile);
    if (existingPatterns) {
      console.log("[Patterns] Using cached patterns");
      return existingPatterns;
    }

    // Return empty patterns
    return {
      topPerformers: [],
      patterns: { titlePatterns: [], contentPatterns: [], avoidPatterns: [] },
      stats: { totalPosts: 0, avgQuality: 0, topAuthor: "none" },
      updatedAt: new Date().toISOString(),
    };
  }

  console.log(`[Fetch] Got ${freshPosts.length} fresh posts`);

  // Score posts with Ollama
  console.log("[Score] Scoring posts with Ollama...");
  const scoredPosts = await scorePosts(freshPosts);
  console.log(`[Score] Scored ${scoredPosts.length} posts`);

  // Log top 3 scored posts
  const top3 = [...scoredPosts].sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 3);
  console.log("\n[Top 3] Highest quality:");
  top3.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.qualityScore}/10] "${p.title.slice(0, 40)}..."`);
  });

  // Merge with existing
  const allPosts = mergeTrainingData(existing, scoredPosts);
  console.log(`[Merge] Total unique posts: ${allPosts.length}`);

  // Save merged training data
  saveTrainingData(allPosts, trainingFile);
  console.log(`[Save] Training data saved to ${trainingFile}`);

  // Get top performers (top 20 by quality)
  const topPerformers = allPosts.slice(0, 20);

  // Extract patterns using Ollama
  console.log("\n[Ollama] Extracting patterns from top performers...");
  const patterns = await extractPatterns(topPerformers);
  console.log("[Ollama] Patterns extracted:");
  console.log(`  Titles: ${patterns.titlePatterns.slice(0, 3).join(", ")}`);
  console.log(`  Avoid: ${patterns.avoidPatterns.slice(0, 2).join(", ")}`);

  // Calculate stats
  const stats = calculateStats(allPosts);
  console.log(`\n[Stats] Total: ${stats.totalPosts} posts, Avg quality: ${stats.avgQuality}/10`);
  console.log(`[Stats] Top author: ${stats.topAuthor}`);

  // Build and save learned patterns
  const learned: LearnedPatterns = {
    topPerformers,
    patterns,
    stats,
    updatedAt: new Date().toISOString(),
  };

  savePatterns(learned, patternsFile);
  console.log(`\n✅ Patterns saved to ${patternsFile}`);

  return learned;
}

/**
 * Get patterns for post generator
 */
export function getLearnedPatterns(dataDir?: string): LearnedPatterns | null {
  return loadPatterns(getPatternsFile(dataDir));
}

/**
 * Get top examples for prompt injection
 */
export function getTopExamples(count = 5, dataDir?: string): string[] {
  const patterns = loadPatterns(getPatternsFile(dataDir));
  if (!patterns) return [];

  return patterns.topPerformers.slice(0, count).map((p) =>
    `[${p.qualityScore}/10] "${p.title}"\n${p.content?.slice(0, 150) || ""}`
  );
}

/**
 * Get Zikaron communication style guide (owner's style)
 */
export function getZikaronStyle(): string {
  const ZIKARON_STYLE = join(HOME, "Gits/zikaron/data/archives/style-2026-01-31-2121/master-style-guide.md");
  try {
    const content = readFileSync(ZIKARON_STYLE, "utf-8");
    // Extract just the DO's section for brevity
    const dosMatch = content.match(/## \*\*2\. DO'S.*?(?=## \*\*3\.)/s);
    return dosMatch ? dosMatch[0].slice(0, 1000) : "";
  } catch {
    return "";
  }
}

// CLI
if (import.meta.main) {
  learnFromSoltome()
    .then((result) => {
      console.log("\n📊 Learning complete!");
      console.log(`  Posts indexed: ${result.stats.totalPosts}`);
      console.log(`  Avg quality: ${result.stats.avgQuality}/10`);
      console.log(`  Patterns: ${result.patterns.titlePatterns.length} title, ${result.patterns.avoidPatterns.length} avoid`);
    })
    .catch((err) => {
      console.error("\n❌ Learning failed:", err);
      process.exit(1);
    });
}
