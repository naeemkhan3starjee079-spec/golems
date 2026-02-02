#!/usr/bin/env bun
/**
 * Ollama Moltbook Surfer - Autonomous browsing and engagement
 *
 * Ollama reads Moltbook posts and decides on reactions (upvote, comment).
 * Runs scheduled or on-demand via /surf Telegram command.
 */

import { browseMoltbook, type MoltbookPost } from "./moltbook-client";
import { runOllamaJSON } from "./ollama-helper";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "/Users/etanheyman";
const SURF_STATE_DIR = join(HOME, ".golems-zikaron");
const SURF_STATE_FILE = join(SURF_STATE_DIR, "surf-state.json");
const APPROVAL_QUEUE_FILE = join(SURF_STATE_DIR, "surf-approval-queue.json");

// Ensure state directory exists
if (!existsSync(SURF_STATE_DIR)) {
  mkdirSync(SURF_STATE_DIR, { recursive: true });
}

/**
 * Surfing state - tracks seen posts to avoid re-processing
 */
interface SurfState {
  seenPostIds: string[];
  lastSurfedAt: string;
}

function loadSurfState(): SurfState {
  try {
    if (!existsSync(SURF_STATE_FILE)) {
      return { seenPostIds: [], lastSurfedAt: new Date().toISOString() };
    }
    return JSON.parse(readFileSync(SURF_STATE_FILE, "utf-8"));
  } catch (err) {
    console.error("[Surf] Failed to load state:", err);
    return { seenPostIds: [], lastSurfedAt: new Date().toISOString() };
  }
}

function saveSurfState(state: SurfState) {
  writeFileSync(SURF_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Approval queue for comments requiring human review
 */
export interface ApprovalItem {
  id: string;
  postId: string;
  postTitle: string;
  postAuthor: string;
  submolt: string;
  comment: string;
  reason: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

function loadApprovalQueue(): ApprovalItem[] {
  try {
    if (!existsSync(APPROVAL_QUEUE_FILE)) {
      return [];
    }
    return JSON.parse(readFileSync(APPROVAL_QUEUE_FILE, "utf-8"));
  } catch (err) {
    console.error("[Surf] Failed to load approval queue:", err);
    return [];
  }
}

function saveApprovalQueue(queue: ApprovalItem[]) {
  writeFileSync(APPROVAL_QUEUE_FILE, JSON.stringify(queue, null, 2));
}

export function addToApprovalQueue(item: Omit<ApprovalItem, "id" | "createdAt" | "status">): string {
  const queue = loadApprovalQueue();
  const id = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newItem: ApprovalItem = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  queue.push(newItem);
  saveApprovalQueue(queue);
  console.log(`[Surf] Added comment to approval queue: ${id}`);
  return id;
}

export function getPendingApprovals(): ApprovalItem[] {
  return loadApprovalQueue().filter((item) => item.status === "pending");
}

export function approveComment(id: string): ApprovalItem | null {
  const queue = loadApprovalQueue();
  const item = queue.find((i) => i.id === id);
  if (!item) return null;
  item.status = "approved";
  saveApprovalQueue(queue);
  return item;
}

export function rejectComment(id: string): boolean {
  const queue = loadApprovalQueue();
  const item = queue.find((i) => i.id === id);
  if (!item) return false;
  item.status = "rejected";
  saveApprovalQueue(queue);
  return true;
}

/**
 * Ollama decision on post interaction
 */
interface PostReaction {
  shouldUpvote: boolean;
  shouldComment: boolean;
  comment?: string;
  risk: "low" | "medium" | "high";
  reason: string;
}

/**
 * Ask Ollama to analyze a post and decide on reactions
 */
async function analyzePost(post: MoltbookPost): Promise<PostReaction | null> {
  const prompt = `You are GolemsZikaron, an AI agent assistant browsing Moltbook. Analyze this post and decide on engagement.

POST:
Title: ${post.title}
Content: ${post.content?.slice(0, 800) || "(no content)"}
Author: ${post.author}
Submolt: ${post.submolt}
Upvotes: ${post.upvotes}
Comments: ${post.comments}

DECISION CRITERIA:
- Upvote: Educational, insightful, or helpful posts
- Comment: When you can add genuine value or have relevant experience
- Risk levels:
  - LOW: Simple upvote or brief appreciation comment
  - MEDIUM: Technical opinion or sharing experience
  - HIGH: Controversial topics, critiques, or complex discussions

YOUR PERSONALITY (keep brief, casual):
- Friendly but technical
- Shares actual learnings from Golem development
- Avoids generic AI-sounding responses
- Hebrew/English code-switching OK if natural

Respond with ONLY a JSON object:
{
  "shouldUpvote": true/false,
  "shouldComment": true/false,
  "comment": "your comment if shouldComment=true, otherwise omit",
  "risk": "low" | "medium" | "high",
  "reason": "brief explanation of decision"
}`;

  try {
    const parsed = await runOllamaJSON<PostReaction>(prompt);
    if (parsed && typeof parsed.shouldUpvote === "boolean") {
      return parsed;
    }
  } catch (err) {
    console.error(`[Ollama] Analysis error for post ${post.id}:`, err);
  }

  return null;
}

/**
 * Process a single post - decide and take action
 */
async function processPost(post: MoltbookPost): Promise<void> {
  console.log(`\n[Surf] Analyzing: "${post.title.slice(0, 50)}..." by ${post.author}`);

  const reaction = await analyzePost(post);
  if (!reaction) {
    console.log("[Surf] Analysis failed, skipping");
    return;
  }

  console.log(`[Surf] Decision: upvote=${reaction.shouldUpvote}, comment=${reaction.shouldComment}, risk=${reaction.risk}`);
  console.log(`[Surf] Reason: ${reaction.reason}`);

  // Handle upvote (low risk - can be automated)
  if (reaction.shouldUpvote) {
    console.log(`[Surf] ✓ Would upvote post ${post.id} (API not implemented yet)`);
    // TODO: Implement upvote API call when available
  }

  // Handle comment (requires approval based on risk)
  if (reaction.shouldComment && reaction.comment) {
    if (reaction.risk === "low") {
      // Auto-post low-risk comments
      console.log(`[Surf] ✓ Would auto-post comment (low risk): "${reaction.comment.slice(0, 60)}..."`);
      // TODO: Implement comment API call when available
    } else {
      // Queue medium/high risk for approval
      addToApprovalQueue({
        postId: post.id,
        postTitle: post.title,
        postAuthor: post.author,
        submolt: post.submolt,
        comment: reaction.comment,
        reason: `${reaction.risk} risk: ${reaction.reason}`,
      });
      console.log(`[Surf] → Queued for approval (${reaction.risk} risk)`);
    }
  }
}

/**
 * Main surfing workflow
 */
export async function surfMoltbook(): Promise<void> {
  console.log("🏄 Starting Moltbook surfing session...\n");

  const state = loadSurfState();
  const posts = await browseMoltbook();

  if (posts.length === 0) {
    console.log("[Surf] No posts found");
    return;
  }

  // Filter out already seen posts
  const newPosts = posts.filter((p) => !state.seenPostIds.includes(p.id));
  console.log(`[Surf] Found ${newPosts.length} new posts (${posts.length} total, ${state.seenPostIds.length} seen)`);

  if (newPosts.length === 0) {
    console.log("[Surf] No new posts to process");
    return;
  }

  // Process each new post
  for (const post of newPosts) {
    await processPost(post);
    state.seenPostIds.push(post.id);
  }

  // Update state
  state.lastSurfedAt = new Date().toISOString();

  // Keep only last 1000 seen post IDs to prevent unbounded growth
  if (state.seenPostIds.length > 1000) {
    state.seenPostIds = state.seenPostIds.slice(-1000);
  }

  saveSurfState(state);

  // Summary
  const pendingApprovals = getPendingApprovals();
  console.log(`\n[Surf] Session complete!`);
  console.log(`  Processed: ${newPosts.length} posts`);
  console.log(`  Pending approvals: ${pendingApprovals.length}`);
}

// CLI test
if (import.meta.main) {
  await surfMoltbook();
}
