/**
 * Forage - Collect posts from AI agent platforms for later processing
 *
 * Used by /forage command to fetch and cache posts.
 *
 * Supported platforms:
 * - Soltome (soltome.com) - Credit-powered discussion platform
 *
 * Note: Moltbook doesn't have a posts API - it's only for agent identity.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fetchPosts as fetchSoltomePosts, type SoltomePost } from "./soltome-client";

// Post structure for caching (platform-agnostic)
export interface ForagedPost {
  id: string;
  title: string;
  author: string;
  platform: "soltome" | "moltbook";
  content: string;
  url: string;
  createdAt?: string;
}

// Cache file metadata
export interface CacheMetadata {
  timestamp: string;
  count: number;
  platforms: string[];
}

/**
 * Fetch posts from Soltome
 */
export async function fetchSoltome(limit = 20): Promise<ForagedPost[]> {
  try {
    const posts = await fetchSoltomePosts(limit);

    return posts.map((p: SoltomePost) => ({
      id: p.id,
      title: p.title,
      author: p.author?.username || "unknown",
      platform: "soltome" as const,
      content: p.content || "",
      url: `https://soltome.com/posts/${p.id}`,
      createdAt: p.created_at,
    }));
  } catch (err) {
    console.error("[Forage] Soltome fetch error:", err);
    return [];
  }
}

/**
 * Fetch posts from all supported platforms
 */
export async function fetchAllPosts(limit = 20): Promise<ForagedPost[]> {
  const allPosts: ForagedPost[] = [];

  // Fetch from Soltome
  console.log("[Forage] Fetching from Soltome...");
  const soltomePosts = await fetchSoltome(limit);
  allPosts.push(...soltomePosts);
  console.log(`[Forage] Soltome: ${soltomePosts.length} posts`);

  // Note: Moltbook doesn't have a posts API - only identity verification
  // If Moltbook adds a posts API in the future, add it here

  console.log(`[Forage] Total: ${allPosts.length} posts`);
  return allPosts;
}

/**
 * Save posts to cache file with metadata
 */
export async function saveToCacheFile(
  posts: ForagedPost[],
  cacheFile: string
): Promise<CacheMetadata> {
  const platforms = [...new Set(posts.map((p) => p.platform))];

  const metadata: CacheMetadata = {
    timestamp: new Date().toISOString(),
    count: posts.length,
    platforms,
  };

  const cacheData = {
    metadata,
    posts,
  };

  // Ensure directory exists
  const dir = dirname(cacheFile);
  try {
    mkdirSync(dir, { recursive: true });
  } catch (err) {
    // Directory may already exist
  }

  writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));

  return metadata;
}

/**
 * Handle /forage command - fetch and cache posts from all platforms
 */
export async function handleForageCommand(
  cacheFile: string
): Promise<{ success: boolean; message: string }> {
  try {
    const posts = await fetchAllPosts();

    if (posts.length === 0) {
      return {
        success: false,
        message: "No posts found. Check Soltome credentials in state.json",
      };
    }

    const metadata = await saveToCacheFile(posts, cacheFile);

    const message = `🌾 ${metadata.count} posts harvested from ${metadata.platforms.join(", ")}`;

    return { success: true, message };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Forage failed: ${errorMsg}` };
  }
}

// CLI test
if (import.meta.main) {
  console.log("Testing forage...");
  const result = await handleForageCommand("/tmp/forage-test.json");
  console.log(result.message);
}
