#!/usr/bin/env bun
/**
 * Moltbook Learner - Learn from high-performing posts
 *
 * Runs at 2am BEFORE Night Shift (3am)
 * Builds training data for better post drafting
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { browseMoltbook, type MoltbookPost } from "./moltbook-client";
import { forMoltbook, getEmbedding, batchEmbed, findSimilar } from "./ollama-wrapper";

const HOME = process.env.HOME || "/Users/etanheyman";
const DATA_DIR = join(HOME, "Gits/golems-zikaron/data");
const TRAINING_FILE = join(DATA_DIR, "moltbook-training.json");
const PATTERNS_FILE = join(DATA_DIR, "learned-patterns.json");
const ZIKARON_STYLE = join(HOME, "Gits/zikaron/data/archives/style-2026-01-31-2121/master-style-guide.md");

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Training data structure
interface TrainingPost {
  id: string;
  title: string;
  content: string;
  author: string;
  submolt: string;
  upvotes: number;
  comments: number;
  engagementScore: number; // upvotes + comments*2
  scrapedAt: string;
  embedding?: number[]; // Vector for semantic search
}

interface LearnedPatterns {
  topPerformers: TrainingPost[];
  patterns: {
    titlePatterns: string[];
    contentPatterns: string[];
    avoidPatterns: string[];
    bestSubmolts: string[];
  };
  stats: {
    totalPosts: number;
    avgUpvotes: number;
    avgComments: number;
    topAuthor: string;
  };
  updatedAt: string;
}

function loadTrainingData(): TrainingPost[] {
  try {
    return JSON.parse(readFileSync(TRAINING_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveTrainingData(posts: TrainingPost[]) {
  writeFileSync(TRAINING_FILE, JSON.stringify(posts, null, 2));
}

function loadPatterns(): LearnedPatterns | null {
  try {
    return JSON.parse(readFileSync(PATTERNS_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function savePatterns(patterns: LearnedPatterns) {
  writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
}

/**
 * Convert MoltbookPost to TrainingPost with engagement score
 */
function toTrainingPost(post: MoltbookPost): TrainingPost {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    author: post.author,
    submolt: post.submolt,
    upvotes: post.upvotes,
    comments: post.comments,
    engagementScore: post.upvotes + post.comments * 2, // Comments worth more
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Merge new posts with existing training data (dedupe by id)
 */
function mergeTrainingData(existing: TrainingPost[], newPosts: TrainingPost[]): TrainingPost[] {
  const byId = new Map<string, TrainingPost>();

  // Add existing
  for (const post of existing) {
    byId.set(post.id, post);
  }

  // Update/add new (newer data wins)
  for (const post of newPosts) {
    byId.set(post.id, post);
  }

  // Sort by engagement score
  return Array.from(byId.values()).sort((a, b) => b.engagementScore - a.engagementScore);
}

/**
 * Embed posts that don't have embeddings yet
 */
async function embedNewPosts(posts: TrainingPost[]): Promise<TrainingPost[]> {
  const needsEmbedding = posts.filter((p) => !p.embedding || p.embedding.length === 0);

  if (needsEmbedding.length === 0) {
    console.log("[Embed] All posts already embedded");
    return posts;
  }

  console.log(`[Embed] Embedding ${needsEmbedding.length} new posts...`);

  // Create text for embedding: title + content snippet
  const texts = needsEmbedding.map((p) => `${p.title}\n${p.content?.slice(0, 500) || ""}`);
  const embeddings = await batchEmbed(texts);

  // Assign embeddings back to posts
  for (let i = 0; i < needsEmbedding.length; i++) {
    needsEmbedding[i].embedding = embeddings[i];
  }

  console.log(`[Embed] Done. Vector dim: ${embeddings[0]?.length || 0}`);
  return posts;
}

/**
 * Find similar posts to a query using embeddings
 */
export async function findSimilarPosts(
  query: string,
  topK = 5
): Promise<Array<TrainingPost & { similarity: number }>> {
  const posts = loadTrainingData();
  const queryEmbedding = await getEmbedding(query);

  if (queryEmbedding.length === 0) return [];

  return findSimilar(queryEmbedding, posts, topK);
}

/**
 * Use Ollama to extract patterns from top performers
 */
async function extractPatterns(topPosts: TrainingPost[]): Promise<LearnedPatterns["patterns"]> {
  if (topPosts.length === 0) {
    return {
      titlePatterns: [],
      contentPatterns: [],
      avoidPatterns: [],
      bestSubmolts: [],
    };
  }

  const examples = topPosts.slice(0, 10).map((p) =>
    `Title: ${p.title}\nContent: ${p.content?.slice(0, 200) || "(none)"}\nUpvotes: ${p.upvotes}, Comments: ${p.comments}`
  ).join("\n\n---\n\n");

  const prompt = `Analyze these top-performing Moltbook posts and extract patterns.

${examples}

What makes these posts successful? Respond with ONLY a JSON object:
{
  "titlePatterns": ["pattern 1", "pattern 2", "pattern 3"],
  "contentPatterns": ["what works in content"],
  "avoidPatterns": ["what to avoid"],
  "bestSubmolts": ["which submolts work best"]
}`;

  const result = await forMoltbook.runOllamaJSON<LearnedPatterns["patterns"]>(prompt);

  return result || {
    titlePatterns: ["Use specific hooks", "Ask questions", "Share learnings"],
    contentPatterns: ["Be concise", "Include examples", "Show don't tell"],
    avoidPatterns: ["Vague platitudes", "Self-promotion", "Walls of text"],
    bestSubmolts: ["todayilearned", "debuggingwins"],
  };
}

/**
 * Calculate stats from training data
 */
function calculateStats(posts: TrainingPost[]): LearnedPatterns["stats"] {
  if (posts.length === 0) {
    return { totalPosts: 0, avgUpvotes: 0, avgComments: 0, topAuthor: "none" };
  }

  const totalUpvotes = posts.reduce((sum, p) => sum + p.upvotes, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);

  // Find top author by total engagement
  const authorScores = new Map<string, number>();
  for (const post of posts) {
    const current = authorScores.get(post.author) || 0;
    authorScores.set(post.author, current + post.engagementScore);
  }

  let topAuthor = "none";
  let topScore = 0;
  for (const [author, score] of authorScores) {
    if (score > topScore) {
      topScore = score;
      topAuthor = author;
    }
  }

  return {
    totalPosts: posts.length,
    avgUpvotes: Math.round(totalUpvotes / posts.length),
    avgComments: Math.round(totalComments / posts.length),
    topAuthor,
  };
}

/**
 * Main learning function
 */
export async function learnFromMoltbook(): Promise<LearnedPatterns> {
  console.log("\n📚 Moltbook Learner starting...");
  console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);

  // Load existing training data
  const existing = loadTrainingData();
  console.log(`[Data] Loaded ${existing.length} existing posts`);

  // Fetch fresh posts
  console.log("[Fetch] Browsing Moltbook...");
  const freshPosts = await browseMoltbook();

  if (freshPosts.length === 0) {
    console.log("[Fetch] No posts fetched (API may be down)");

    // Return existing patterns if available
    const existingPatterns = loadPatterns();
    if (existingPatterns) {
      console.log("[Patterns] Using cached patterns");
      return existingPatterns;
    }
  }

  // Convert to training format
  const newTraining = freshPosts.map(toTrainingPost);
  console.log(`[Fetch] Got ${newTraining.length} fresh posts`);

  // Merge with existing
  let allPosts = mergeTrainingData(existing, newTraining);
  console.log(`[Merge] Total unique posts: ${allPosts.length}`);

  // Embed posts (only new ones without embeddings)
  allPosts = await embedNewPosts(allPosts);

  // Save merged training data with embeddings
  saveTrainingData(allPosts);
  console.log(`[Save] Training data saved to ${TRAINING_FILE}`);

  // Get top performers (top 20 by engagement)
  const topPerformers = allPosts.slice(0, 20);
  console.log(`\n[Top 5] Highest engagement:`);
  topPerformers.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. "${p.title.slice(0, 40)}..." (${p.upvotes}↑ ${p.comments}💬)`);
  });

  // Extract patterns using Ollama
  console.log("\n[Ollama] Extracting patterns from top performers...");
  const patterns = await extractPatterns(topPerformers);
  console.log("[Ollama] Patterns extracted:");
  console.log(`  Titles: ${patterns.titlePatterns.slice(0, 3).join(", ")}`);
  console.log(`  Content: ${patterns.contentPatterns.slice(0, 2).join(", ")}`);

  // Calculate stats
  const stats = calculateStats(allPosts);
  console.log(`\n[Stats] Total: ${stats.totalPosts} posts, Avg: ${stats.avgUpvotes}↑ ${stats.avgComments}💬`);
  console.log(`[Stats] Top author: ${stats.topAuthor}`);

  // Build and save learned patterns
  const learned: LearnedPatterns = {
    topPerformers,
    patterns,
    stats,
    updatedAt: new Date().toISOString(),
  };

  savePatterns(learned);
  console.log(`\n✅ Patterns saved to ${PATTERNS_FILE}`);

  return learned;
}

/**
 * Get patterns for post generator (called by post-generator.ts)
 */
export function getLearnedPatterns(): LearnedPatterns | null {
  return loadPatterns();
}

/**
 * Get top examples for prompt injection
 */
export function getTopExamples(count = 5): string[] {
  const patterns = loadPatterns();
  if (!patterns) return [];

  return patterns.topPerformers.slice(0, count).map((p) =>
    `[${p.upvotes}↑] "${p.title}"\n${p.content?.slice(0, 150) || ""}`
  );
}

/**
 * Get Zikaron communication style guide
 */
export function getZikaronStyle(): string {
  try {
    const content = readFileSync(ZIKARON_STYLE, "utf-8");
    // Extract just the DO's section for brevity
    const dosMatch = content.match(/## \*\*2\. DO'S.*?(?=## \*\*3\.)/s);
    return dosMatch ? dosMatch[0].slice(0, 1000) : "";
  } catch {
    return "";
  }
}

/**
 * Get semantically similar posts to a topic
 */
export async function getSimilarPosts(topic: string, count = 3): Promise<string[]> {
  const similar = await findSimilarPosts(topic, count);
  return similar.map((p) =>
    `[${p.upvotes}↑ ${Math.round(p.similarity * 100)}% match] "${p.title}"\n${p.content?.slice(0, 150) || ""}`
  );
}

// CLI
if (import.meta.main) {
  learnFromMoltbook()
    .then((result) => {
      console.log("\n📊 Learning complete!");
      console.log(`  Posts indexed: ${result.stats.totalPosts}`);
      console.log(`  Patterns found: ${result.patterns.titlePatterns.length} title, ${result.patterns.contentPatterns.length} content`);
    })
    .catch((err) => {
      console.error("\n❌ Learning failed:", err);
      process.exit(1);
    });
}
