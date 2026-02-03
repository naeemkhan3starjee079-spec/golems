#!/usr/bin/env bun
/**
 * Night Shift v3 - Autonomous 3am improvements + Moltbook
 *
 * This script:
 * 1. Claude scans & implements improvement directly (no Ollama)
 * 2. Creates draft PR
 * 3. Browses Moltbook, filters shitposts
 * 4. Generates post drafts (critique-waves)
 * 5. Sends summary to Telegram
 */

import { $ } from "bun";
import { readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { fetchPosts as fetchSoltomePosts } from "./soltome-client";
import { getMoltbookStatus } from "./moltbook-client";
import { generatePosts } from "./post-generator";

// Configuration
const HOME = process.env.HOME || "/Users/etanheyman";
const REPOS_PATH = process.env.REPOS_PATH || `${HOME}/Gits`;
const STATE_FILE = join(HOME, ".golems-zikaron/state.json");

// Load state (includes Telegram chat ID)
interface State {
  nightShiftTarget: string;
  rotation: string[];
  telegramChatId: number | null;
  lastNightShift?: string;
  lastPrUrl?: string; // deprecated - kept for backwards compat
  nightShiftPRs?: { url: string; repo: string; createdAt: string }[];
}

function loadState(): State {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return {
      nightShiftTarget: "songscript",
      rotation: ["songscript", "zikaron", "claude-golem"],
      telegramChatId: null,
    };
  }
}

function saveState(state: State) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Get Telegram token from env or .env file
function getTelegramToken(): string {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN;

  try {
    const envFile = readFileSync(join(HOME, "Gits/golems/packages/autonomous/.env"), "utf-8");
    const match = envFile.match(/TELEGRAM_BOT_TOKEN=(.+)/);
    return match?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

async function sendTelegram(message: string) {
  const token = getTelegramToken();
  const state = loadState();
  const chatId = state.telegramChatId;

  if (!token || !chatId) {
    console.log("[Telegram] No token/chat ID, skipping notification");
    console.log("[Telegram] Message:", message);
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Telegram] API error ${res.status}: ${body}`);
    } else {
      console.log(`[Telegram] Sent: ${message.slice(0, 50)}...`);
    }
  } catch (err) {
    console.error("[Telegram] Network error:", err);
  }
}

interface NightShiftResult {
  repo: string;
  prUrl?: string;
  improvement?: string;
  moltbookLearnings: string[];
  draftsGenerated: number;
  success: boolean;
  error?: string;
}

// No more Ollama scanning - Claude does everything directly

async function createWorktree(repoPath: string, branchName: string): Promise<string> {
  const worktreePath = `${repoPath}-nightshift-${Date.now()}`;

  try {
    await $`cd ${repoPath} && git worktree add ${worktreePath} -b ${branchName}`;
  } catch (err) {
    // Branch might already exist, try without -b
    await $`cd ${repoPath} && git worktree add ${worktreePath} ${branchName}`;
  }

  // Setup environment in worktree
  console.log("[Worktree] Setting up environment...");

  // Link node_modules from main repo (faster than fresh install)
  try {
    await $`cd ${worktreePath} && ln -s ${repoPath}/node_modules node_modules 2>/dev/null || true`;
  } catch {}

  // Copy .env if exists
  try {
    await $`cp ${repoPath}/.env ${worktreePath}/.env 2>/dev/null || true`;
  } catch {}

  return worktreePath;
}

async function cleanupWorktree(repoPath: string, worktreePath: string) {
  try {
    await $`cd ${repoPath} && git worktree remove ${worktreePath} --force`;
  } catch {
    // Fallback: just delete the directory
    try {
      rmSync(worktreePath, { recursive: true, force: true });
      await $`cd ${repoPath} && git worktree prune`;
    } catch (e) {
      console.error("[Cleanup] Failed:", e);
    }
  }
}

async function runClaudeAndCreatePR(
  repoPath: string,
  worktreePath: string,
  branchName: string,
  repo: string
): Promise<{ success: boolean; prUrl?: string; improvement?: string }> {
  console.log(`[Claude] Scanning and implementing in ${worktreePath}`);

  // Claude finds, implements, AND reviews with CodeRabbit
  // Repo-specific context
  const repoSouls: Record<string, string> = {
    songscript: `SongScript: Language learning through song lyrics + transliteration.
Tech: TanStack Start, Convex, Bun. Check CLAUDE.md for Convex build rules.`,
    zikaron: `Zikaron: Memory layer that indexes Claude Code conversations for search/retrieval.`,
    "claude-golem": `Ralph (claude-golem): Autonomous AI coding loop. Runs PRD stories.`,
  };

  const soul = repoSouls[repo] || `Read CLAUDE.md to understand this project.`;

  const claudePrompt = `You are GolemsZikaron running Night Shift - autonomous 3am improvements.

Tonight's focus: ${soul}

Your creator sleeps while you work. Make them proud.

TASK: Find ONE small improvement, implement it, pass review.

⛔ CRITICAL: NEVER commit to master/main! You are in a worktree branch.
- Verify with: git branch (should NOT be master/main)
- If on master/main, STOP and output: "ERROR: Wrong branch"

STEP 0 - Check existing PRs:
- Run: gh pr list --state open --limit 10
- Do NOT duplicate work from existing PRs
- If a TODO/issue is already addressed in an open PR, skip it

STEP 1 - Explore & Find:
- Scan for TODOs, FIXMEs, type errors, missing error handling
- Check CLAUDE.md or AGENTS.md for context
- Make minimal, focused changes (one thing only)

STEP 2 - Review with CodeRabbit:
- Stage: git add -A
- Run: cr review --plain
- CRITICAL/HIGH issues → fix and re-run
- Repeat until clean

STEP 3 - Commit:
- Message format: "nightshift: [what you fixed]"
- Do NOT push (I handle that)
- Output exactly: "DONE: [brief noun phrase, no 'Implemented', max 40 chars]"
  Example: "DONE: Language detection for leaderboard"

If nothing to fix, output: "NOTHING_TO_FIX"

Remember: Small wins compound. One improvement tonight, another tomorrow. 🌙`;

  try {
    // Per-repo session ID - Night Shift workers have focused memory
    const sessionId = `nightshift-${repo}`;

    // Run Claude - let it scan and implement
    const proc = Bun.spawn([
      "/Users/etanheyman/.local/bin/claude",
      "--dangerously-skip-permissions",
      "--resume", sessionId,  // Persist per-repo context across nights
      "-p", claudePrompt
    ], {
      cwd: worktreePath,
      stdout: "pipe",
      stderr: "pipe",
    });

    // 5 minute timeout for scanning + implementing
    const timeout = setTimeout(() => {
      proc.kill();
      console.error("[Claude] Timeout after 5 minutes");
    }, 300000);

    await proc.exited;
    clearTimeout(timeout);

    const output = await new Response(proc.stdout).text();
    console.log(`[Claude] Output: ${output.slice(0, 200)}...`);

    // Check if Claude found nothing
    if (output.includes("NOTHING_TO_FIX")) {
      console.log("[Claude] No improvements found");
      return { success: false, improvement: "No improvements found" };
    }

    // Extract what was done
    const doneMatch = output.match(/DONE:\s*(.+)/);
    const improvement = doneMatch ? doneMatch[1].trim() : "Improvement made";

    // Check if there are commits
    const hasCommits = await $`cd ${worktreePath} && git log origin/main..HEAD --oneline 2>/dev/null || git log origin/master..HEAD --oneline 2>/dev/null || echo ""`.text();

    if (!hasCommits.trim()) {
      console.log("[Claude] No commits made");
      return { success: false, improvement };
    }

    // Check if there are actual file changes (not just empty commits)
    const diffStat = await $`cd ${worktreePath} && git diff --stat origin/main...HEAD 2>/dev/null || git diff --stat origin/master...HEAD 2>/dev/null || echo ""`.text();

    if (!diffStat.trim() || diffStat.includes("0 insertions") && diffStat.includes("0 deletions")) {
      console.log("[Claude] No actual file changes - skipping PR creation");
      return { success: false, improvement: "No file changes made" };
    }

    console.log(`[Git] Changes: ${diffStat.trim().split('\n').pop()}`);

    // Push and create draft PR
    console.log("[Git] Pushing branch...");
    await $`cd ${worktreePath} && git push -u origin ${branchName}`;

    console.log("[GitHub] Creating draft PR...");
    const title = `🌙 Night Shift: ${improvement.slice(0, 45)}`;
    const body = `Automated improvement by GolemsZikaron Night Shift.\n\n${improvement}`;

    const prProc = Bun.spawn([
      "gh", "pr", "create",
      "--title", title,
      "--body", body
    ], {
      cwd: worktreePath,
      stdout: "pipe",
      stderr: "pipe",
    });

    await prProc.exited;
    const prUrl = (await new Response(prProc.stdout).text()).trim();
    const prErr = await new Response(prProc.stderr).text();

    if (prErr && !prUrl) {
      console.error("[GitHub] PR error:", prErr);
    }

    console.log(`[GitHub] PR created: ${prUrl}`);
    return { success: true, prUrl, improvement };
  } catch (err) {
    console.error("[Claude/Git] Failed:", err);
    return { success: false };
  }
}

async function nightShift(): Promise<NightShiftResult> {
  const state = loadState();
  const repo = state.nightShiftTarget || "songscript";
  const repoPath = `${REPOS_PATH}/${repo}`;

  console.log(`\n🌙 Night Shift v3 starting...`);
  console.log(`📁 Target repo: ${repo}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);

  await sendTelegram(`🌙 *Night Shift Starting*\n\nTarget: \`${repo}\`\nScanning...`);

  const result: NightShiftResult = {
    repo,
    moltbookLearnings: [],
    draftsGenerated: 0,
    success: false,
  };

  try {
    // ═══════════════════════════════════════════════════════
    // PHASE 1: Claude scans & implements (no Ollama)
    // ═══════════════════════════════════════════════════════
    console.log("\n═══ PHASE 1: Code Improvements ═══\n");

    const branchName = `nightshift/${new Date().toISOString().split("T")[0]}-${Date.now() % 10000}`;
    let worktreePath: string | null = null;

    try {
      worktreePath = await createWorktree(repoPath, branchName);
      console.log(`[Worktree] Created: ${worktreePath}`);

      const { success, prUrl, improvement } = await runClaudeAndCreatePR(
        repoPath,
        worktreePath,
        branchName,
        repo
      );

      result.improvement = improvement;
      result.prUrl = prUrl;

      if (success && prUrl) {
        state.lastPrUrl = prUrl; // backwards compat
        // Add to PR array
        if (!state.nightShiftPRs) state.nightShiftPRs = [];
        state.nightShiftPRs.push({
          url: prUrl,
          repo,
          createdAt: new Date().toISOString(),
        });
        saveState(state);
      }
    } finally {
      // Always cleanup worktree
      if (worktreePath) {
        await cleanupWorktree(repoPath, worktreePath);
      }
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 2: Browse Soltome → Extract Learnings
    // Note: Moltbook is for identity only, not content
    // ═══════════════════════════════════════════════════════
    console.log("\n═══ PHASE 2: Soltome Browsing ═══\n");

    try {
      const posts = await fetchSoltomePosts(20);
      if (posts.length > 0) {
        // Extract titles as learnings for post generation context
        result.moltbookLearnings = posts.slice(0, 5).map(
          (p) => `[Soltome] "${p.title}" by ${p.author?.username || "unknown"}`
        );
        console.log(`[Soltome] Found ${posts.length} posts, extracted ${result.moltbookLearnings.length} learnings`);
      } else {
        result.moltbookLearnings = ["No Soltome posts available (check credentials)"];
      }
    } catch (err) {
      console.error("[Soltome] Browsing failed:", err);
      result.moltbookLearnings = ["Soltome API not available"];
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 3: Generate Post Drafts (Critique-Waves)
    // ═══════════════════════════════════════════════════════
    console.log("\n═══ PHASE 3: Post Generation ═══\n");

    try {
      const drafts = await generatePosts({
        zikaronInfo: "Zikaron indexes Claude Code conversations for search/retrieval.",
        claudeGolemInfo: "Ralph (claude-golem) runs autonomous coding loops.",
        overnightLearnings: result.moltbookLearnings.join("\n"),
      });
      result.draftsGenerated = drafts.length;
    } catch (err) {
      console.error("[PostGen] Failed:", err);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 4: Send Summary
    // ═══════════════════════════════════════════════════════
    result.success = true;
    state.lastNightShift = new Date().toISOString();
    saveState(state);

    // Summary will be sent by briefing.ts at 8 AM
    // But send a quick notification now
    await sendTelegram(
      `🌙 *Night Shift Complete*\n\n` +
        `🔧 PR: ${result.prUrl || "None created"}\n` +
        `📚 Learnings: ${result.moltbookLearnings.length}\n` +
        `📝 Drafts: ${result.draftsGenerated}\n\n` +
        `Full briefing at 8 AM.`
    );

    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    result.error = error;
    await sendTelegram(`❌ *Night Shift Failed*\n\n${error}`);
    return result;
  }
}

// Run if called directly
if (import.meta.main) {
  nightShift()
    .then((result) => {
      console.log("\n✅ Night Shift complete:", JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("\n❌ Night Shift error:", err);
      process.exit(1);
    });
}

export { nightShift, sendTelegram };
