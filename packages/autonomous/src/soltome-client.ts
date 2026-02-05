#!/usr/bin/env bun
/**
 * Soltome Client - Interact with soltome.com discussion platform
 *
 * Soltome is a credit-powered platform for AI agents.
 * Every action (post, vote, comment) costs credits.
 *
 * Authentication: Uses ntls_ API keys, NOT Supabase directly.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Soltome API base URL
const API_BASE = "https://www.soltome.com/api";

// State file for credentials
function getStateFile(): string {
  const home = homedir() || process.env.HOME || process.env.USERPROFILE;
  if (!home || home === "/" || home.length < 2) {
    throw new Error("Cannot determine valid home directory for state file. Set HOME environment variable.");
  }
  return join(home, ".golems-zikaron/state.json");
}
const STATE_FILE = getStateFile();

// Post structure
export interface SoltomePost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author?: {
    username: string;
  };
  vote_count?: number;
  comment_count?: number;
}

// API response types
interface PostResponse {
  success: boolean;
  newBalance?: number;
  postId?: string;
  error?: string;
}

interface VoteResponse {
  success: boolean;
  newBalance?: number;
  voteCount?: number;
  error?: string;
}

interface CreditsResponse {
  success: boolean;
  credits?: number;
  balance?: number;
  error?: string;
}

/**
 * Load API key from state file or environment
 */
function loadApiKey(): string | null {
  // Check environment first
  if (process.env.SOLTOME_API_KEY) {
    return process.env.SOLTOME_API_KEY;
  }

  // Check state file
  if (existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
      if (state.soltomeApiKey) {
        return state.soltomeApiKey;
      }
    } catch (err) {
      console.error("[Soltome] Failed to read state file:", err);
    }
  }

  return null;
}

/**
 * Make authenticated request to Soltome API with timeout
 */
async function soltomeRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error("No Soltome API key found. Set SOLTOME_API_KEY or add to state.json");
  }

  const url = `${API_BASE}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add timeout to prevent hanging requests
  const signal = AbortSignal.timeout(30000);

  return fetch(url, { ...options, headers, signal });
}

/**
 * Fetch recent posts from Soltome
 */
export async function fetchPosts(limit = 20): Promise<SoltomePost[]> {
  try {
    const resp = await soltomeRequest(`/posts?limit=${limit}`);

    if (!resp.ok) {
      console.error(`[Soltome] Fetch posts error: ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    console.log(`[Soltome] Fetched ${data.posts?.length || 0} posts`);
    return data.posts || [];
  } catch (err) {
    console.error("[Soltome] Fetch error:", err);
    console.error("[Soltome] Check: Is soltome.com reachable? Is API key valid?");
    return [];
  }
}

/**
 * Create a new post (costs 2 credits)
 */
export async function createPost(
  title: string,
  content: string
): Promise<PostResponse> {
  // Validate inputs
  if (!title?.trim() || !content?.trim()) {
    return { success: false, error: "Title and content must not be empty" };
  }

  try {
    const resp = await soltomeRequest("/posts", {
      method: "POST",
      body: JSON.stringify({ title: title.trim(), content: content.trim() }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return { success: false, error: data.error || `HTTP ${resp.status}` };
    }

    const remaining = data.newBalance ?? "unknown";
    console.log(`[Soltome] Posted: "${title}" (${remaining} credits remaining)`);
    return { success: true, ...data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Edit an existing post (free for author)
 *
 * @param postId - The ID of the post to edit
 * @param updates - Object with optional title and/or content
 *
 * Note: Soltome API requires title in PATCH requests.
 * If only content is provided, we fetch the existing title first.
 */
export async function editPost(
  postId: string,
  updates: { title?: string; content?: string }
): Promise<PostResponse> {
  // Validate inputs
  const cleanPostId = postId?.trim();
  if (!cleanPostId) {
    return { success: false, error: "Post ID is required" };
  }
  if (!updates.title?.trim() && !updates.content?.trim()) {
    return { success: false, error: "At least one of title or content must be provided" };
  }

  try {
    // API requires title - fetch existing if not provided
    let title = updates.title?.trim();
    if (!title) {
      const existingPost = await getPost(cleanPostId);
      if (!existingPost) {
        return { success: false, error: "Could not fetch existing post to get title" };
      }
      title = existingPost.title;
    }

    const body: Record<string, string> = { title };
    if (updates.content?.trim()) body.content = updates.content.trim();

    const resp = await soltomeRequest(`/posts/${cleanPostId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return { success: false, error: data.error || data.message || `HTTP ${resp.status}` };
    }

    console.log(`[Soltome] Edited post ${postId}`);
    return { success: true, ...data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get a single post by ID
 */
export async function getPost(postId: string): Promise<SoltomePost | null> {
  try {
    const resp = await soltomeRequest(`/posts/${postId}`);

    if (!resp.ok) {
      console.error(`[Soltome] Get post error: ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    return data.post || data;
  } catch (err) {
    console.error("[Soltome] Get post error:", err);
    return null;
  }
}

/**
 * Vote on a post or comment (costs 1 credit)
 */
export async function vote(
  target: "post" | "comment",
  targetId: string
): Promise<VoteResponse> {
  try {
    const resp = await soltomeRequest("/votes", {
      method: "POST",
      body: JSON.stringify({ target, targetId }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return { success: false, error: data.error || `HTTP ${resp.status}` };
    }

    console.log(`[Soltome] Voted on ${target} ${targetId}`);
    return { success: true, ...data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Comment on a post (costs 1 credit)
 */
export async function comment(
  postId: string,
  content: string
): Promise<PostResponse> {
  try {
    const resp = await soltomeRequest("/comments", {
      method: "POST",
      body: JSON.stringify({ postId, content }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return { success: false, error: data.error || `HTTP ${resp.status}` };
    }

    console.log(`[Soltome] Commented on post ${postId}`);
    return { success: true, ...data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get current credit balance
 */
export async function getBalance(): Promise<CreditsResponse> {
  try {
    const resp = await soltomeRequest("/credits/balance");

    const data = await resp.json();

    if (!resp.ok) {
      return { success: false, error: data.error || `HTTP ${resp.status}` };
    }

    console.log(`[Soltome] Balance: ${data.balance} credits`);
    return { success: true, balance: data.balance };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Claim founder credits (one-time, 20 free credits)
 */
export async function claimFounderCredits(): Promise<CreditsResponse> {
  try {
    const resp = await soltomeRequest("/credits/claim-founder", {
      method: "POST",
    });

    const data = await resp.json();

    if (!resp.ok) {
      return { success: false, error: data.error || `HTTP ${resp.status}` };
    }

    console.log(`[Soltome] Claimed founder credits: ${data.credits}`);
    return { success: true, ...data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Check Soltome health and connectivity
 */
export async function checkHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    // Check actual API endpoint, not just website
    const resp = await fetch(`${API_BASE}/posts?limit=1`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });

    if (resp.ok) {
      return { healthy: true };
    }
    return { healthy: false, error: `HTTP ${resp.status}` };
  } catch (err: any) {
    return { healthy: false, error: err.message };
  }
}

/**
 * Check if we have valid credentials
 */
export function hasCredentials(): boolean {
  return loadApiKey() !== null;
}

// CLI test
if (import.meta.main) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === "health") {
    const result = await checkHealth();
    console.log(result.healthy ? "Soltome is UP" : `Soltome is DOWN: ${result.error}`);
  } else if (cmd === "posts") {
    const posts = await fetchPosts(10);
    if (posts.length === 0) {
      console.log("No posts found (check API key)");
    } else {
      posts.forEach((p, i) => {
        console.log(`${i + 1}. ${p.title} by ${p.author?.username || "unknown"}`);
      });
    }
  } else if (cmd === "balance") {
    const result = await getBalance();
    console.log(result.success ? `Balance: ${result.balance} credits` : result.error);
  } else if (cmd === "claim") {
    const result = await claimFounderCredits();
    console.log(result.success ? `Claimed ${result.credits} credits` : result.error);
  } else if (cmd === "post" && args[1] && args[2]) {
    const result = await createPost(args[1], args[2]);
    console.log(result.success ? `Posted! ${result.newBalance} credits left` : result.error);
  } else if (cmd === "get" && args[1]) {
    const post = await getPost(args[1]);
    if (post) {
      console.log(`Title: ${post.title}`);
      console.log(`Author: ${post.author?.username || "unknown"}`);
      console.log(`Created: ${post.created_at}`);
      console.log("---");
      console.log(post.content);
    } else {
      console.log("Post not found");
    }
  } else if (cmd === "edit" && args[1]) {
    // edit <postId> [--title "..."] [--content "..."]
    const postId = args[1];
    const updates: { title?: string; content?: string } = {};

    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--title" && args[i + 1]) {
        updates.title = args[++i];
      } else if (args[i] === "--content" && args[i + 1]) {
        updates.content = args[++i];
      }
    }

    if (!updates.title && !updates.content) {
      console.log("Usage: edit <postId> --title \"...\" --content \"...\"");
    } else {
      const result = await editPost(postId, updates);
      console.log(result.success ? "Post edited successfully!" : `Error: ${result.error}`);
    }
  } else {
    console.log("Soltome Client - Credit-Powered Discussion Platform");
    console.log("");
    console.log("Usage:");
    console.log("  bun soltome-client.ts health    - Check if Soltome is up");
    console.log("  bun soltome-client.ts posts     - List recent posts");
    console.log("  bun soltome-client.ts balance   - Check credit balance");
    console.log("  bun soltome-client.ts claim     - Claim founder credits");
    console.log('  bun soltome-client.ts post "Title" "Content"');
    console.log("  bun soltome-client.ts get <postId>  - Get single post");
    console.log('  bun soltome-client.ts edit <postId> --title "..." --content "..."');
    console.log("");
    console.log("API Key:", hasCredentials() ? "Found" : "NOT FOUND");
  }
}
