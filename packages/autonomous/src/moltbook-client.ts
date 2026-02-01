#!/usr/bin/env bun
/**
 * Moltbook Client - Browse and filter posts from Moltbook
 *
 * Uses Ollama locally to filter shitposts (free)
 * No API costs for browsing.
 */

import { runOllamaJSON } from "./ollama-helper";

// Submolts we care about
const SUBMOLTS = [
  "todayilearned",
  "debuggingwins",
  "introductions",
  "general",
] as const;

// Post from Moltbook API
export interface MoltbookPost {
  id: string;
  title: string;
  content: string;
  author: string;
  submolt: string;
  createdAt: string;
  upvotes: number;
  comments: number;
}

// Quality-scored post
export interface ScoredPost extends MoltbookPost {
  qualityScore: number;
  qualityReason: string;
}

// Moltbook API base URL
const API_BASE = "https://www.moltbook.com/api/v1";

/**
 * Fetch posts from a submolt
 */
async function fetchSubmolt(submolt: string, limit = 20): Promise<MoltbookPost[]> {
  try {
    const resp = await fetch(`${API_BASE}/m/${submolt}/posts?limit=${limit}`, {
      headers: {
        "User-Agent": "GolemsZikaron/1.0 (memory bot)",
      },
    });

    if (!resp.ok) {
      console.error(`[Moltbook] Failed to fetch ${submolt}: ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    return (data.posts || []).map((p: any) => ({
      ...p,
      submolt,
    }));
  } catch (err) {
    console.error(`[Moltbook] Error fetching ${submolt}:`, err);
    return [];
  }
}

/**
 * Browse all relevant submolts
 */
export async function browseMoltbook(): Promise<MoltbookPost[]> {
  console.log("[Moltbook] Browsing submolts:", SUBMOLTS.join(", "));

  const allPosts: MoltbookPost[] = [];

  for (const submolt of SUBMOLTS) {
    const posts = await fetchSubmolt(submolt);
    allPosts.push(...posts);
    console.log(`[Moltbook] ${submolt}: ${posts.length} posts`);
  }

  console.log(`[Moltbook] Total: ${allPosts.length} posts`);
  return allPosts;
}

/**
 * Score a single post using Ollama (local, free)
 */
async function scorePost(post: MoltbookPost): Promise<ScoredPost> {
  const prompt = `You are evaluating a Moltbook post for quality.

POST:
Title: ${post.title}
Content: ${post.content?.slice(0, 500) || "(no content)"}
Author: ${post.author}
Upvotes: ${post.upvotes}

SCORING CRITERIA:
- Educational value (teaches something useful)
- Technical depth (not shallow takes)
- Original insight (not just reposts)
- Positive tone (not toxic/controversial)

SHITPOST INDICATORS (score low):
- Memes, jokes, low effort
- Controversy bait, negativity
- Self-promotion spam
- Vague platitudes

Respond with ONLY a JSON object:
{"score": 1-10, "reason": "brief explanation"}`;

  try {
    const parsed = await runOllamaJSON<{ score: number; reason: string }>(prompt);

    if (parsed) {
      return {
        ...post,
        qualityScore: parsed.score || 5,
        qualityReason: parsed.reason || "No reason given",
      };
    }
  } catch (err) {
    console.error(`[Ollama] Scoring error for "${post.title}":`, err);
  }

  // Default score if Ollama fails
  return {
    ...post,
    qualityScore: 5,
    qualityReason: "Scoring failed",
  };
}

/**
 * Filter posts by quality score (removes shitposts)
 */
export async function filterShitposts(
  posts: MoltbookPost[],
  minScore = 7
): Promise<ScoredPost[]> {
  console.log(`[Filter] Scoring ${posts.length} posts with Ollama...`);

  const scored: ScoredPost[] = [];

  // Score in batches to avoid overwhelming Ollama
  for (const post of posts) {
    const scoredPost = await scorePost(post);
    scored.push(scoredPost);

    if (scoredPost.qualityScore >= minScore) {
      console.log(`[Filter] ✓ ${scoredPost.qualityScore}/10: "${post.title.slice(0, 40)}..."`);
    } else {
      console.log(`[Filter] ✗ ${scoredPost.qualityScore}/10: "${post.title.slice(0, 40)}..." (filtered)`);
    }
  }

  const quality = scored.filter((p) => p.qualityScore >= minScore);
  console.log(`[Filter] Kept ${quality.length}/${posts.length} quality posts`);

  return quality;
}

/**
 * Extract learnings from quality posts
 */
export async function extractLearnings(posts: ScoredPost[]): Promise<string[]> {
  if (posts.length === 0) return [];

  const summaries = posts.map(
    (p) => `[${p.submolt}] "${p.title}" by ${p.author} (score: ${p.qualityScore})`
  );

  console.log("[Learnings] Quality posts found:");
  summaries.forEach((s) => console.log(`  • ${s}`));

  return summaries;
}

/**
 * Post to Moltbook (requires API key)
 */
export async function postToMoltbook(
  apiKey: string,
  submolt: string,
  title: string,
  content: string
): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE}/m/${submolt}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ title, content }),
    });

    if (!resp.ok) {
      console.error(`[Moltbook] Failed to post: ${resp.status}`);
      return false;
    }

    console.log(`[Moltbook] Posted to ${submolt}: "${title}"`);
    return true;
  } catch (err) {
    console.error("[Moltbook] Post error:", err);
    return false;
  }
}

/**
 * Check if Moltbook API is healthy (can fetch data from DB)
 * Returns { healthy: boolean, error?: string }
 */
export async function checkMoltbookHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(`${API_BASE}/m/general/posts?limit=1`, {
      headers: { "User-Agent": "GolemsZikaron/1.0 (health check)" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      return { healthy: false, error: `HTTP ${resp.status}` };
    }

    const data = await resp.json();

    // Check if we actually got data (DB is working)
    if (data.error) {
      return { healthy: false, error: data.error };
    }

    // Success - API and DB are working
    return { healthy: true };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { healthy: false, error: "Timeout" };
    }
    return { healthy: false, error: err.message || "Unknown error" };
  }
}

// CLI test
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args[0] === "health") {
    // Health check mode
    console.log("🏥 Checking Moltbook health...");
    const result = await checkMoltbookHealth();
    if (result.healthy) {
      console.log("✅ Moltbook is HEALTHY");
      process.exit(0);
    } else {
      console.log(`❌ Moltbook is DOWN: ${result.error}`);
      process.exit(1);
    }
  } else {
    // Default: browse test
    console.log("🔍 Testing Moltbook client...\n");

    const posts = await browseMoltbook();

    if (posts.length > 0) {
      // Only score first 5 for testing
      const sample = posts.slice(0, 5);
      const quality = await filterShitposts(sample);
      await extractLearnings(quality);
    } else {
      console.log("No posts found (Moltbook API may not be available yet)");
    }
  }
}
