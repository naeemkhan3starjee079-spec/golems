/**
 * Worktree Management for Parallel Story Execution
 * Phase 16: Boris DX — Parallel Execution
 *
 * AIDEV-NOTE: Each parallel story runs in its own git worktree to avoid conflicts.
 * Worktrees are created under .ralph-worktrees/ in the repo root.
 */

import { existsSync, mkdirSync, symlinkSync, copyFileSync, cpSync } from "fs";
import { join, dirname } from "path";
import { spawn as bunSpawn } from "bun";
import { randomBytes } from "crypto";

const WORKTREE_DIR = ".ralph-worktrees";

export interface WorktreeInfo {
  path: string;
  branch: string;
  storyId: string;
}

/**
 * Create a git worktree for a story.
 * Each story gets: own worktree dir, own branch, symlinked node_modules, copied .env
 */
export async function createStoryWorktree(
  repoPath: string,
  storyId: string,
): Promise<WorktreeInfo> {
  const sanitizedId = storyId.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  const suffix = randomBytes(4).toString("hex"); // 8 hex chars — no collision risk
  const branch = `ralph-parallel/${sanitizedId}-${suffix}`;
  const worktreeBase = join(repoPath, WORKTREE_DIR);
  const worktreePath = join(worktreeBase, sanitizedId);

  // Ensure worktree directory exists
  if (!existsSync(worktreeBase)) {
    mkdirSync(worktreeBase, { recursive: true });
  }

  // Create worktree with new branch
  const proc = bunSpawn(
    ["git", "worktree", "add", worktreePath, "-b", branch],
    { cwd: repoPath, stdout: "pipe", stderr: "pipe" },
  );
  await proc.exited;

  if (proc.exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();

    // Only retry without -b if the branch already exists
    if (stderr.includes("already exists")) {
      const retryProc = bunSpawn(
        ["git", "worktree", "add", worktreePath, branch],
        { cwd: repoPath, stdout: "pipe", stderr: "pipe" },
      );
      await retryProc.exited;

      if (retryProc.exitCode !== 0) {
        const retryStderr = await new Response(retryProc.stderr).text();
        throw new Error(
          `git worktree add failed (branch exists retry): ${retryStderr}`,
        );
      }
    } else {
      throw new Error(`git worktree add failed: ${stderr}`);
    }
  }

  // Symlink node_modules (avoid re-installing deps)
  const srcNodeModules = join(repoPath, "node_modules");
  const dstNodeModules = join(worktreePath, "node_modules");
  if (existsSync(srcNodeModules) && !existsSync(dstNodeModules)) {
    try {
      symlinkSync(srcNodeModules, dstNodeModules, "dir");
    } catch {
      // Non-fatal — Claude can still work without it
    }
  }

  // Copy .env file
  const srcEnv = join(repoPath, ".env");
  const dstEnv = join(worktreePath, ".env");
  if (existsSync(srcEnv) && !existsSync(dstEnv)) {
    try {
      copyFileSync(srcEnv, dstEnv);
    } catch {
      // Non-fatal
    }
  }

  // Copy prd-json into worktree to avoid race conditions on parallel writes
  const srcPrd = join(repoPath, "prd-json");
  const dstPrd = join(worktreePath, "prd-json");
  if (existsSync(srcPrd) && !existsSync(dstPrd)) {
    try {
      cpSync(srcPrd, dstPrd, { recursive: true });
    } catch {
      // Non-fatal — spawned Claude will still work with original path
    }
  }

  console.log(`[Worktree] Created: ${worktreePath} (branch: ${branch})`);
  return { path: worktreePath, branch, storyId };
}

/**
 * Clean up a story worktree and its branch.
 */
export async function cleanupStoryWorktree(
  repoPath: string,
  worktree: WorktreeInfo,
): Promise<void> {
  try {
    // Remove worktree
    const removeProc = bunSpawn(
      ["git", "worktree", "remove", worktree.path, "--force"],
      { cwd: repoPath, stdout: "pipe", stderr: "pipe" },
    );
    await removeProc.exited;

    // Delete the branch
    const branchProc = bunSpawn(["git", "branch", "-D", worktree.branch], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });
    await branchProc.exited;

    console.log(`[Worktree] Cleaned up: ${worktree.storyId}`);
  } catch (err) {
    // Try manual cleanup as fallback
    try {
      const { rmSync } = await import("fs");
      rmSync(worktree.path, { recursive: true, force: true });

      const pruneProc = bunSpawn(["git", "worktree", "prune"], {
        cwd: repoPath,
        stdout: "pipe",
        stderr: "pipe",
      });
      await pruneProc.exited;
    } catch {
      console.error(`[Worktree] Cleanup failed for ${worktree.storyId}:`, err);
    }
  }
}

/**
 * Clean up all ralph worktrees (for recovery/cleanup).
 */
export async function cleanupAllWorktrees(repoPath: string): Promise<void> {
  const worktreeBase = join(repoPath, WORKTREE_DIR);
  if (!existsSync(worktreeBase)) return;

  try {
    const { rmSync } = await import("fs");
    rmSync(worktreeBase, { recursive: true, force: true });

    const pruneProc = bunSpawn(["git", "worktree", "prune"], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });
    await pruneProc.exited;

    console.log("[Worktree] Cleaned up all ralph worktrees");
  } catch (err) {
    console.error("[Worktree] Cleanup all failed:", err);
  }
}
