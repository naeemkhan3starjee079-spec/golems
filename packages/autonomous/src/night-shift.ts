#!/usr/bin/env bun
/**
 * Night Shift v4 - Self-Healing Batch Loop + CLI Helpers
 *
 * Improvements over v3:
 * - Batch loop: works through ALL repos in rotation, not just one
 * - Self-healing: failures logged to fix list, picked up next run
 * - CLI helpers: Gemini pre-scan finds improvements before Claude implements
 * - Absolute paths: all tools use full paths for launchd compatibility
 */

import { $ } from "bun";
import { readFileSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
// Absolute paths for tools (launchd runs from /, not package root)
const HOME = process.env.HOME || "/Users/etanheyman";
const REPOS_PATH = process.env.REPOS_PATH || `${HOME}/Gits`;
const STATE_FILE = join(HOME, ".golems-zikaron/state.json");
const FIX_LIST_FILE = join(HOME, ".golems-zikaron/nightshift-fixes.json");
const CLAUDE_BIN = `${HOME}/.local/bin/claude`;
const GEMINI_BIN = `${HOME}/.nvm/versions/node/v22.0.0/bin/gemini`;
const GH_BIN = "/usr/local/bin/gh";

// ─── State Management ──────────────────────────────────────────────

interface State {
  nightShiftTarget: string;
  rotation: string[];
  telegramChatId: number | null;
  lastNightShift?: string;
  lastPrUrl?: string;
  nightShiftPRs?: { url: string; repo: string; createdAt: string }[];
}

interface FixItem {
  id: string;
  repo: string;
  tool: string;
  error: string;
  createdAt: string;
  resolved: boolean;
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

function loadFixList(): FixItem[] {
  try {
    return JSON.parse(readFileSync(FIX_LIST_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveFixList(fixes: FixItem[]) {
  writeFileSync(FIX_LIST_FILE, JSON.stringify(fixes, null, 2));
}

function addFixItem(repo: string, tool: string, error: string) {
  const fixes = loadFixList();
  fixes.push({
    id: `fix-${Date.now()}`,
    repo,
    tool,
    error: error.slice(0, 200),
    createdAt: new Date().toISOString(),
    resolved: false,
  });
  saveFixList(fixes);
  console.log(`[FixList] Added: ${tool} failure in ${repo}`);
}

function getPendingFixes(repo?: string): FixItem[] {
  return loadFixList().filter(
    (f) => !f.resolved && (!repo || f.repo === repo)
  );
}

function resolveFixItem(id: string) {
  const fixes = loadFixList();
  const fix = fixes.find((f) => f.id === id);
  if (fix) fix.resolved = true;
  saveFixList(fixes);
}

// ─── Telegram ──────────────────────────────────────────────────────

function getTelegramToken(): string {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN;
  try {
    const envFile = readFileSync(
      join(HOME, "Gits/golems/packages/autonomous/.env"),
      "utf-8"
    );
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
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Telegram] API error ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error("[Telegram] Network error:", err);
  }
}

// ─── CLI Helpers ───────────────────────────────────────────────────

async function geminiPreScan(repoPath: string): Promise<string | null> {
  if (!existsSync(GEMINI_BIN)) {
    console.log("[Gemini] Not installed, skipping pre-scan");
    return null;
  }

  const prompt = `Look at the codebase structure and recent git log. Suggest ONE specific, small improvement (a bug fix, missing error handling, or type cleanup). Be very specific: name the file and what to change. Keep it under 3 sentences.`;

  try {
    const proc = Bun.spawn(["bash", "-c", `cd "${repoPath}" && echo "${prompt}" | "${GEMINI_BIN}" 2>/dev/null`], {
      stdout: "pipe",
      stderr: "pipe",
      timeout: 30000,
    });

    const timer = setTimeout(() => proc.kill(), 30000);
    await proc.exited;
    clearTimeout(timer);

    const output = (await new Response(proc.stdout).text()).trim();
    if (output && output.length > 10) {
      console.log(`[Gemini] Suggestion: ${output.slice(0, 150)}...`);
      return output;
    }
  } catch (err) {
    console.log("[Gemini] Pre-scan failed (non-critical):", String(err).slice(0, 100));
    addFixItem("*", "gemini", String(err).slice(0, 200));
  }

  return null;
}

// ─── Git Operations ────────────────────────────────────────────────

interface NightShiftResult {
  repo: string;
  prUrl?: string;
  improvement?: string;
  success: boolean;
  error?: string;
}

async function createWorktree(
  repoPath: string,
  branchName: string
): Promise<string> {
  const worktreePath = `${repoPath}-nightshift-${Date.now()}`;

  try {
    await $`cd ${repoPath} && git worktree add ${worktreePath} -b ${branchName}`;
  } catch {
    await $`cd ${repoPath} && git worktree add ${worktreePath} ${branchName}`;
  }

  // Link node_modules + copy .env
  try {
    await $`cd ${worktreePath} && ln -s ${repoPath}/node_modules node_modules 2>/dev/null || true`;
  } catch {}
  try {
    await $`cp ${repoPath}/.env ${worktreePath}/.env 2>/dev/null || true`;
  } catch {}

  return worktreePath;
}

async function cleanupWorktree(repoPath: string, worktreePath: string) {
  try {
    await $`cd ${repoPath} && git worktree remove ${worktreePath} --force`;
  } catch {
    try {
      rmSync(worktreePath, { recursive: true, force: true });
      await $`cd ${repoPath} && git worktree prune`;
    } catch (e) {
      console.error("[Cleanup] Failed:", e);
    }
  }
}

// ─── Core: Claude Implementation ──────────────────────────────────

const repoSouls: Record<string, string> = {
  songscript: `SongScript: Language learning through song lyrics + transliteration. Tech: TanStack Start, Convex, Bun. Check CLAUDE.md for Convex build rules.`,
  zikaron: `Zikaron: Memory layer that indexes Claude Code conversations for search/retrieval.`,
  "claude-golem": `Ralph (claude-golem): Autonomous AI coding loop. Runs PRD stories.`,
};

async function runClaudeOnRepo(
  repoPath: string,
  worktreePath: string,
  branchName: string,
  repo: string,
  geminiHint?: string | null,
  fixItems?: FixItem[]
): Promise<{ success: boolean; prUrl?: string; improvement?: string }> {
  console.log(`[Claude] Working in ${worktreePath}`);

  const soul = repoSouls[repo] || `Read CLAUDE.md to understand this project.`;

  // Build context from Gemini hint + fix list
  let extraContext = "";
  if (geminiHint) {
    extraContext += `\nGemini suggested this improvement:\n${geminiHint}\nConsider this, but use your own judgment.\n`;
  }
  if (fixItems && fixItems.length > 0) {
    extraContext += `\nPrevious failures to fix:\n${fixItems.map((f) => `- ${f.tool}: ${f.error}`).join("\n")}\n`;
  }

  const claudePrompt = `You are GolemsZikaron running Night Shift - autonomous 3am improvements.

Tonight's focus: ${soul}
${extraContext}
Your creator sleeps while you work. Make them proud.

TASK: Find ONE small improvement, implement it, pass review.

CRITICAL: NEVER commit to master/main! You are in a worktree branch.
- Verify with: git branch (should NOT be master/main)
- If on master/main, STOP and output: "ERROR: Wrong branch"

STEP 0 - Check existing PRs:
- Run: gh pr list --state open --limit 10
- Do NOT duplicate work from existing PRs

STEP 1 - Explore & Find:
- Scan for TODOs, FIXMEs, type errors, missing error handling
- Check CLAUDE.md or AGENTS.md for context
- Make minimal, focused changes (one thing only)

STEP 2 - Review with CodeRabbit:
- Stage: git add -A
- Run: cr review --plain
- CRITICAL/HIGH issues -> fix and re-run
- Repeat until clean

STEP 3 - Commit:
- Message format: "nightshift: [what you fixed]"
- Do NOT push (I handle that)
- Output exactly: "DONE: [brief noun phrase, no 'Implemented', max 40 chars]"
  Example: "DONE: Language detection for leaderboard"

If nothing to fix, output: "NOTHING_TO_FIX"

Remember: Small wins compound. One improvement tonight, another tomorrow.`;

  try {
    const sessionId = `nightshift-${repo}`;

    const proc = Bun.spawn(
      [
        CLAUDE_BIN,
        "--dangerously-skip-permissions",
        "--resume",
        sessionId,
        "-p",
        claudePrompt,
      ],
      {
        cwd: worktreePath,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    // 5 minute timeout
    const timeout = setTimeout(() => {
      proc.kill();
      console.error("[Claude] Timeout after 5 minutes");
      addFixItem(repo, "claude", "Timeout after 5 minutes");
    }, 300000);

    await proc.exited;
    clearTimeout(timeout);

    const output = await new Response(proc.stdout).text();
    console.log(`[Claude] Output: ${output.slice(0, 200)}...`);

    if (output.includes("NOTHING_TO_FIX")) {
      return { success: false, improvement: "No improvements found" };
    }

    const doneMatch = output.match(/DONE:\s*(.+)/);
    const improvement = doneMatch ? doneMatch[1].trim() : "Improvement made";

    // Check for actual commits
    const hasCommits =
      await $`cd ${worktreePath} && git log origin/main..HEAD --oneline 2>/dev/null || git log origin/master..HEAD --oneline 2>/dev/null || echo ""`.text();

    if (!hasCommits.trim()) {
      return { success: false, improvement };
    }

    const diffStat =
      await $`cd ${worktreePath} && git diff --stat origin/main...HEAD 2>/dev/null || git diff --stat origin/master...HEAD 2>/dev/null || echo ""`.text();

    if (
      !diffStat.trim() ||
      (diffStat.includes("0 insertions") && diffStat.includes("0 deletions"))
    ) {
      return { success: false, improvement: "No file changes made" };
    }

    console.log(
      `[Git] Changes: ${diffStat.trim().split("\n").pop()}`
    );

    // Push and create PR
    await $`cd ${worktreePath} && git push -u origin ${branchName}`;

    const title = `Night Shift: ${improvement.slice(0, 45)}`;
    const body = `Automated improvement by GolemsZikaron Night Shift.\n\n${improvement}`;

    const prProc = Bun.spawn(
      [GH_BIN, "pr", "create", "--title", title, "--body", body],
      {
        cwd: worktreePath,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    await prProc.exited;
    const prUrl = (await new Response(prProc.stdout).text()).trim();
    const prErr = await new Response(prProc.stderr).text();

    if (prErr && !prUrl) {
      console.error("[GitHub] PR error:", prErr);
      addFixItem(repo, "gh-pr", prErr.slice(0, 200));
    }

    if (prUrl) console.log(`[GitHub] PR created: ${prUrl}`);

    // Mark related fixes as resolved
    if (fixItems) {
      for (const fix of fixItems) resolveFixItem(fix.id);
    }

    return { success: true, prUrl, improvement };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Claude/Git] Failed:", msg);
    addFixItem(repo, "claude-git", msg.slice(0, 200));
    return { success: false };
  }
}

// ─── Batch Loop: Process All Repos ─────────────────────────────────

async function processRepo(
  repo: string,
  state: State
): Promise<NightShiftResult> {
  const repoPath = `${REPOS_PATH}/${repo}`;
  const result: NightShiftResult = {
    repo,
    success: false,
  };

  if (!existsSync(repoPath)) {
    console.log(`[Skip] Repo not found: ${repoPath}`);
    result.error = "Repo not found";
    return result;
  }

  console.log(`\n── Processing: ${repo} ──\n`);

  // 1. Gemini pre-scan (non-blocking, optional)
  const geminiHint = await geminiPreScan(repoPath);

  // 2. Check fix list for this repo
  const fixes = getPendingFixes(repo);
  if (fixes.length > 0) {
    console.log(`[FixList] ${fixes.length} pending fixes for ${repo}`);
  }

  // 3. Create worktree and run Claude
  const branchName = `nightshift/${new Date().toISOString().split("T")[0]}-${Date.now() % 10000}`;
  let worktreePath: string | null = null;

  try {
    worktreePath = await createWorktree(repoPath, branchName);

    const { success, prUrl, improvement } = await runClaudeOnRepo(
      repoPath,
      worktreePath,
      branchName,
      repo,
      geminiHint,
      fixes
    );

    result.improvement = improvement;
    result.prUrl = prUrl;
    result.success = success;

    if (success && prUrl) {
      state.lastPrUrl = prUrl;
      if (!state.nightShiftPRs) state.nightShiftPRs = [];
      state.nightShiftPRs.push({
        url: prUrl,
        repo,
        createdAt: new Date().toISOString(),
      });
      saveState(state);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.error = msg;
    addFixItem(repo, "worktree", msg.slice(0, 200));
  } finally {
    if (worktreePath) {
      await cleanupWorktree(repoPath, worktreePath);
    }
  }

  return result;
}

// ─── Main Entry Point ──────────────────────────────────────────────

async function nightShift(): Promise<NightShiftResult[]> {
  const state = loadState();
  const rotation = state.rotation || ["songscript", "zikaron", "claude-golem"];

  // Start with the target repo, then continue through rotation
  const target = state.nightShiftTarget || rotation[0];
  const targetIdx = rotation.indexOf(target);
  const orderedRepos = [
    ...rotation.slice(targetIdx >= 0 ? targetIdx : 0),
    ...rotation.slice(0, targetIdx >= 0 ? targetIdx : 0),
  ];

  console.log(`\n🌙 Night Shift v4 starting...`);
  console.log(`📁 Repos: ${orderedRepos.join(" → ")}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);

  const pendingFixes = getPendingFixes();
  if (pendingFixes.length > 0) {
    console.log(`🔧 Pending fixes: ${pendingFixes.length}`);
  }
  console.log("");

  await sendTelegram(
    `🌙 *Night Shift v4 Starting*\n\nRepos: ${orderedRepos.join(" → ")}\nPending fixes: ${pendingFixes.length}`
  );

  const results: NightShiftResult[] = [];

  // Process each repo in rotation
  for (const repo of orderedRepos) {
    try {
      const result = await processRepo(repo, state);
      results.push(result);

      // Brief pause between repos
      if (orderedRepos.indexOf(repo) < orderedRepos.length - 1) {
        console.log("\n[Batch] Moving to next repo in 5s...\n");
        await Bun.sleep(5000);
      }
    } catch (err) {
      console.error(`[Batch] Failed on ${repo}:`, err);
      addFixItem(repo, "batch", String(err).slice(0, 200));
    }
  }

  // ═══ Summary ═══
  state.lastNightShift = new Date().toISOString();

  // Rotate target for next run
  const nextIdx = (targetIdx + 1) % rotation.length;
  state.nightShiftTarget = rotation[nextIdx];
  saveState(state);

  // Sync key state values to Supabase (so dashboard can see night shift data)
  try {
    const { reportServiceRun, setState: setSupabaseState } = await import("./lib/state-store");
    // reportServiceRun always writes to Supabase regardless of STATE_BACKEND
    await reportServiceRun("lastNightShift");
    // Also sync dashboard-visible values
    await Promise.allSettled([
      setSupabaseState("nightShiftTarget", state.nightShiftTarget),
      setSupabaseState("nightShiftPRs", state.nightShiftPRs || []),
    ]);
    console.log("[NightShift] Synced state to Supabase");
  } catch (err) {
    console.error("[NightShift] Failed to sync to Supabase:", err);
    // Non-fatal — local state is always the source of truth for night shift
  }

  const successCount = results.filter((r) => r.success).length;
  const prUrls = results
    .filter((r) => r.prUrl)
    .map((r) => r.prUrl)
    .join("\n");

  await sendTelegram(
    `🌙 *Night Shift v4 Complete*\n\n` +
      `Repos: ${results.length}/${orderedRepos.length}\n` +
      `PRs created: ${successCount}\n` +
      `${prUrls ? `\n${prUrls}` : ""}\n\n` +
      `Next target: ${rotation[nextIdx]}\n` +
      `Full briefing at 8 AM.`
  );

  return results;
}

// Run if called directly
if (import.meta.main) {
  nightShift()
    .then((results) => {
      const success = results.some((r) => r.success);
      console.log(
        "\n✅ Night Shift complete:",
        JSON.stringify(
          results.map((r) => ({
            repo: r.repo,
            success: r.success,
            pr: r.prUrl || "none",
          })),
          null,
          2
        )
      );
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error("\n❌ Night Shift error:", err);
      process.exit(1);
    });
}

export { nightShift, sendTelegram };
