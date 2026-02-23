/**
 * Main Iteration Runner - Core iteration loop for Ralph
 * Part of MP-006: Move iteration loop from zsh to TypeScript
 */

import type {
  RunnerConfig,
  IterationResult,
  RunnerState,
  Model,
  SpawnOptions,
} from "./types";
import { DEFAULT_TIMEOUT_MS } from "./types";
import {
  readIndex,
  getNextStory,
  getIndependentStories,
  applyUpdateQueue,
  isComplete,
  isAllBlocked,
  getCriteriaProgress,
  autoBlockStoryIfNeeded,
  readStory,
  writeStory,
  writeIndex,
} from "./prd";
import { spawnClaude, analyzeResult } from "./claude";
import { spawnClaudePTY } from "./pty-claude";
import {
  writeStatus,
  cleanupStatus,
  setRunning,
  setComplete,
  setError,
  setRetry,
  setInterrupted,
  setTerminated,
} from "./status";
import {
  detectError,
  shouldRetry,
  getCooldownMs,
  getErrorDescription,
  hasCompletePromise,
  hasAllBlockedPromise,
} from "./errors";
import { buildIterationContext } from "./context";
import {
  notifyIterationComplete,
  notifyPRDComplete,
  notifyError,
  notifyRetry,
  notifyBlocked,
} from "./ntfy";
import { SessionContext } from "./session-context";
import {
  createStoryWorktree,
  cleanupStoryWorktree,
  type WorktreeInfo,
} from "./worktree";
import { existsSync } from "fs";
import { join } from "path";

// AIDEV-NOTE: This is the main iteration loop that replaces the 943-line loop in ralph.zsh
// The state machine follows the design in docs.local/mp-006-design.md

// Default configuration values
export const DEFAULT_CONFIG: Partial<RunnerConfig> = {
  iterations: 100,
  gapSeconds: 5,
  model: "sonnet" as Model,
  notify: false,
  quiet: false,
  verbose: false,
};

// Create a full config from partial options
export function createConfig(options: Partial<RunnerConfig>): RunnerConfig {
  if (!options.prdJsonDir) {
    throw new Error("prdJsonDir is required");
  }
  if (!options.workingDir) {
    throw new Error("workingDir is required");
  }

  return {
    prdJsonDir: options.prdJsonDir,
    workingDir: options.workingDir,
    iterations: options.iterations ?? DEFAULT_CONFIG.iterations!,
    gapSeconds: options.gapSeconds ?? DEFAULT_CONFIG.gapSeconds!,
    model: options.model ?? DEFAULT_CONFIG.model!,
    notify: options.notify ?? DEFAULT_CONFIG.notify!,
    ntfyTopic: options.ntfyTopic,
    quiet: options.quiet ?? DEFAULT_CONFIG.quiet!,
    verbose: options.verbose ?? DEFAULT_CONFIG.verbose!,
    usePty: options.usePty,
    parallelCount: options.parallelCount,
    onOutput: options.onOutput,
    onStrippedOutput: options.onStrippedOutput,
  };
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Log utility (respects quiet mode)
function log(config: RunnerConfig, message: string): void {
  if (!config.quiet) {
    console.log(message);
  }
}

// Verbose log utility
function verbose(config: RunnerConfig, message: string): void {
  if (config.verbose && !config.quiet) {
    console.log(`[verbose] ${message}`);
  }
}

// Startup scan: check all blocked stories and unblock if blocker is completed
function scanAndUnblockStories(prdJsonDir: string): void {
  const index = readIndex(prdJsonDir);
  if (!index) return;

  const unblockedStories: string[] = [];

  for (const blockedStoryId of [...index.blocked]) {
    const blockedStory = readStory(prdJsonDir, blockedStoryId);
    if (!blockedStory || !blockedStory.blockedBy) continue;

    // Check if the blocker story is completed
    const blockerStory = readStory(prdJsonDir, blockedStory.blockedBy);
    if (blockerStory && blockerStory.passes) {
      // Remove blockedBy field from story
      delete blockedStory.blockedBy;
      writeStory(prdJsonDir, blockedStory);

      // Move from blocked to pending
      index.blocked = index.blocked.filter((id) => id !== blockedStoryId);
      index.pending.push(blockedStoryId);

      // Update stats
      index.stats.blocked = Math.max(0, index.stats.blocked - 1);
      index.stats.pending++;

      unblockedStories.push(blockedStoryId);
      console.log(
        `[PRD] Startup scan: Auto-unblocked ${blockedStoryId} (blocker ${blockedStory.blockedBy} completed)`,
      );
    }
  }

  if (unblockedStories.length > 0) {
    // Set next story if pending was empty before
    if (index.pending.length > 0 && !index.nextStory) {
      index.nextStory = index.pending[0];
    }

    writeIndex(prdJsonDir, index);
    console.log(
      `[PRD] Startup scan: Unblocked ${unblockedStories.length} stories`,
    );
  }
}

// Single iteration execution
export async function runSingleIteration(
  config: RunnerConfig,
  iteration: number,
  runStartTime?: number,
): Promise<IterationResult> {
  const startTime = Date.now();

  // Check for update queue
  const updateResult = applyUpdateQueue(config.prdJsonDir);
  if (updateResult.applied) {
    verbose(config, `Applied update queue: ${updateResult.changes.join(", ")}`);
  }

  // Get next story
  let story = getNextStory(config.prdJsonDir);

  if (!story) {
    // Check if complete or all blocked
    if (isComplete(config.prdJsonDir)) {
      return {
        iteration,
        storyId: "",
        success: true,
        hasComplete: true,
        hasBlocked: false,
        durationMs: Date.now() - startTime,
      };
    }

    if (isAllBlocked(config.prdJsonDir)) {
      return {
        iteration,
        storyId: "",
        success: false,
        hasComplete: false,
        hasBlocked: true,
        durationMs: Date.now() - startTime,
      };
    }

    // No story available but not complete
    return {
      iteration,
      storyId: "",
      success: false,
      hasComplete: false,
      hasBlocked: false,
      durationMs: Date.now() - startTime,
      error: "No story available",
    };
  }

  // Update status with model and start time
  setRunning(iteration, story.id, {
    model: config.model,
    startTime: runStartTime ?? startTime,
  });

  // Check if story is blocked (auto-unblock if blocker is completed)
  if (story.blockedBy) {
    const wasAutoBlocked = autoBlockStoryIfNeeded(config.prdJsonDir, story.id);

    if (wasAutoBlocked) {
      // Story was moved to blocked array - return blocked status
      verbose(config, `Story ${story.id} auto-blocked: ${story.blockedBy}`);
      return {
        iteration,
        storyId: story.id,
        success: false,
        hasComplete: false,
        hasBlocked: true,
        durationMs: Date.now() - startTime,
        error: `Blocked: ${story.blockedBy}`,
      };
    }
    // wasAutoBlocked=false means blocker completed, story was unblocked - continue execution
    // Re-read story to get updated state without blockedBy
    story = getNextStory(config.prdJsonDir)!;
  }

  // Build context and prompt for Claude
  const progress = getCriteriaProgress(story);
  const { systemContext, storyPrompt } = buildIterationContext(
    story.id,
    config.model,
    config.prdJsonDir,
    config.workingDir,
  );

  // Spawn Claude with full context
  const spawnOptions: SpawnOptions = {
    model: config.model,
    prompt: storyPrompt,
    contextFile: systemContext, // Pass system context directly (not a file path)
    workingDir: config.workingDir,
    timeout: DEFAULT_TIMEOUT_MS,
  };

  verbose(
    config,
    `Spawning Claude with model ${config.model}${config.usePty ? " (PTY)" : ""}`,
  );

  // Wrap output callback to also update lastActivity (throttled to avoid excessive disk writes)
  let lastActivityUpdate = 0;
  const ACTIVITY_THROTTLE_MS = 5000; // Update at most every 5 seconds
  const wrappedOnOutput = config.onOutput
    ? (data: string) => {
        const now = Date.now();
        if (now - lastActivityUpdate > ACTIVITY_THROTTLE_MS) {
          writeStatus({}); // Updates lastActivity timestamp
          lastActivityUpdate = now;
        }
        config.onOutput!(data);
      }
    : undefined;

  // Use PTY or regular spawning based on config
  const spawnResult = config.usePty
    ? await spawnClaudePTY(spawnOptions, {
        onData: wrappedOnOutput,
        onStrippedData: config.onStrippedOutput,
      })
    : await spawnClaude(spawnOptions);
  const outcome = analyzeResult(spawnResult);

  const durationMs = Date.now() - startTime;

  // Check for completion signals in output
  if (hasCompletePromise(spawnResult.stdout)) {
    return {
      iteration,
      storyId: story.id,
      success: true,
      hasComplete: true,
      hasBlocked: false,
      durationMs,
    };
  }

  if (hasAllBlockedPromise(spawnResult.stdout)) {
    return {
      iteration,
      storyId: story.id,
      success: false,
      hasComplete: false,
      hasBlocked: true,
      durationMs,
    };
  }

  // Handle errors
  if (!spawnResult.success && outcome.errorType) {
    const errorDesc = getErrorDescription(outcome.errorType);
    return {
      iteration,
      storyId: story.id,
      success: false,
      hasComplete: false,
      hasBlocked: false,
      durationMs,
      error: errorDesc,
    };
  }

  return {
    iteration,
    storyId: story.id,
    success: spawnResult.success,
    hasComplete: outcome.hasComplete,
    hasBlocked: outcome.hasAllBlocked,
    durationMs,
    error: spawnResult.success ? undefined : spawnResult.stderr,
  };
}

// AIDEV-NOTE: Prompt building moved to context.ts - buildIterationContext()

// AIDEV-NOTE: Phase 16 — Parallel batch execution using worktree isolation
/**
 * Run a batch of independent stories in parallel, each in its own worktree.
 * Returns results for all stories in the batch.
 */
async function runParallelBatch(
  config: RunnerConfig,
  iteration: number,
  runStartTime?: number,
): Promise<IterationResult[]> {
  const parallelCount = config.parallelCount ?? 1;
  const stories = getIndependentStories(config.prdJsonDir, parallelCount);

  if (stories.length === 0) {
    // Fall back to single iteration (handles completion/blocked detection)
    return [await runSingleIteration(config, iteration, runStartTime)];
  }

  if (stories.length === 1) {
    // Only one story available — run normally without worktree overhead
    return [await runSingleIteration(config, iteration, runStartTime)];
  }

  log(config, `[Parallel] Running ${stories.length} stories in parallel`);

  const worktrees: WorktreeInfo[] = [];
  const results: IterationResult[] = [];

  try {
    // Create worktrees for each story
    for (const story of stories) {
      try {
        const wt = await createStoryWorktree(config.workingDir, story.id);
        worktrees.push(wt);
      } catch (err) {
        console.error(
          `[Parallel] Failed to create worktree for ${story.id}:`,
          err,
        );
        // Continue with other stories
      }
    }

    if (worktrees.length === 0) {
      // All worktree creations failed — fall back to sequential
      log(
        config,
        "[Parallel] All worktree creations failed, falling back to sequential",
      );
      return [await runSingleIteration(config, iteration, runStartTime)];
    }

    // Run stories in parallel
    const promises = worktrees.map(async (wt, idx) => {
      const story = stories.find((s) => s.id === wt.storyId);
      if (!story) {
        return {
          iteration: iteration + idx,
          storyId: wt.storyId,
          success: false,
          hasComplete: false,
          hasBlocked: false,
          durationMs: 0,
          error: "Story not found",
        } satisfies IterationResult;
      }

      const startTime = Date.now();

      try {
        // Build context for this story — use worktree's prd-json copy to avoid races
        const worktreePrdDir = join(wt.path, "prd-json");
        const prdDir = existsSync(worktreePrdDir)
          ? worktreePrdDir
          : config.prdJsonDir;
        const { systemContext, storyPrompt } = buildIterationContext(
          story.id,
          config.model,
          prdDir,
          wt.path, // Use worktree path as working dir
        );

        const spawnOptions: SpawnOptions = {
          model: config.model,
          prompt: storyPrompt,
          contextFile: systemContext,
          workingDir: wt.path, // Each story runs in its own worktree
          timeout: DEFAULT_TIMEOUT_MS,
        };

        verbose(
          config,
          `[Parallel] Spawning Claude for ${story.id} in ${wt.path}`,
        );

        const spawnResult = await spawnClaude(spawnOptions);
        const outcome = analyzeResult(spawnResult);
        const durationMs = Date.now() - startTime;

        return {
          iteration: iteration + idx,
          storyId: story.id,
          success: spawnResult.success,
          hasComplete: outcome.hasComplete,
          hasBlocked: outcome.hasAllBlocked,
          durationMs,
          error: spawnResult.success ? undefined : spawnResult.stderr,
        } satisfies IterationResult;
      } catch (err) {
        return {
          iteration: iteration + idx,
          storyId: story.id,
          success: false,
          hasComplete: false,
          hasBlocked: false,
          durationMs: Date.now() - startTime,
          error: err instanceof Error ? err.message : String(err),
        } satisfies IterationResult;
      }
    });

    const settled = await Promise.allSettled(promises);
    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          iteration,
          storyId: "unknown",
          success: false,
          hasComplete: false,
          hasBlocked: false,
          durationMs: 0,
          error: result.reason?.message ?? "Unknown parallel execution error",
        });
      }
    }

    log(
      config,
      `[Parallel] Batch complete: ${results.filter((r) => r.success).length}/${results.length} succeeded`,
    );
  } finally {
    // Clean up all worktrees
    for (const wt of worktrees) {
      await cleanupStoryWorktree(config.workingDir, wt);
    }
  }

  return results;
}

// Main iteration loop as async generator
export async function* runIterations(
  config: RunnerConfig,
): AsyncGenerator<IterationResult> {
  // Create unified session context
  const sessionContext = SessionContext.create({
    config: {
      notifications: {
        enabled: config.notify,
        topic: config.ntfyTopic,
      },
    },
  });

  // Log session context for debugging
  log(
    config,
    `[SESSION] runner=${sessionContext.runner} model=${sessionContext.model} notify=${sessionContext.notifications.enabled}`,
  );

  let iteration = 1;
  let retryCount = 0;
  const runStartTime = Date.now(); // Track start time for the entire run

  // Set up signal handlers
  let interrupted = false;
  const handleSignal = () => {
    interrupted = true;
  };

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  try {
    // Startup scan: check all blocked stories and unblock if blocker is completed
    scanAndUnblockStories(config.prdJsonDir);

    const isParallel = (config.parallelCount ?? 1) > 1;

    while (iteration <= config.iterations && !interrupted) {
      // Parallel mode: run batch of independent stories
      if (isParallel) {
        log(config, `\n=== Parallel Batch (iteration ${iteration}) ===`);

        const batchResults = await runParallelBatch(
          config,
          iteration,
          runStartTime,
        );

        for (const result of batchResults) {
          yield result;

          if (result.hasComplete) {
            log(config, "All stories complete!");
            setComplete();
            break;
          }
        }

        // Check if all complete after parallel batch
        if (isComplete(config.prdJsonDir)) {
          break;
        }

        // Advance iteration by batch size
        iteration += batchResults.length;

        if (iteration <= config.iterations && config.gapSeconds > 0) {
          await sleep(config.gapSeconds * 1000);
        }
        continue;
      }

      // Sequential mode (default)
      log(config, `\n=== Iteration ${iteration} ===`);

      const result = await runSingleIteration(config, iteration, runStartTime);

      // Yield result to caller
      yield result;

      // Handle completion
      if (result.hasComplete) {
        log(config, "All stories complete!");
        setComplete();
        if (
          sessionContext.notifications.enabled &&
          sessionContext.notifications.topic
        ) {
          await notifyPRDComplete(sessionContext.notifications.topic);
        }
        break;
      }

      // Handle all blocked
      if (result.hasBlocked && !result.storyId) {
        log(config, "All remaining stories are blocked");
        setError("All stories blocked");
        if (
          sessionContext.notifications.enabled &&
          sessionContext.notifications.topic
        ) {
          await notifyBlocked(
            sessionContext.notifications.topic,
            undefined,
            "All stories blocked",
          );
        }
        break;
      }

      // Handle errors with retry
      if (!result.success && result.error) {
        const errorType = detectError(result.error);

        if (errorType && shouldRetry(errorType, retryCount)) {
          retryCount++;
          const cooldown = getCooldownMs(errorType);
          const cooldownSecs = Math.ceil(cooldown / 1000);

          log(config, `Retry ${retryCount}: ${result.error}`);
          setRetry(cooldownSecs);
          if (
            sessionContext.notifications.enabled &&
            sessionContext.notifications.topic
          ) {
            await notifyRetry(
              sessionContext.notifications.topic,
              retryCount,
              cooldownSecs,
            );
          }

          await sleep(cooldown);
          continue; // Don't increment iteration for retry
        }

        // Max retries exceeded or non-retryable error
        log(config, `Error: ${result.error}`);
      }

      // Reset retry count on success
      if (result.success) {
        retryCount = 0;
        if (
          sessionContext.notifications.enabled &&
          sessionContext.notifications.topic
        ) {
          // Get pending stats for notification
          const index = readIndex(config.prdJsonDir);
          const pendingStories = index?.pending?.length ?? 0;
          const story = readStory(config.prdJsonDir, result.storyId);
          const pendingCriteria = story
            ? story.acceptanceCriteria.filter((c) => !c.checked).length
            : 0;

          await notifyIterationComplete(
            sessionContext.notifications.topic,
            iteration,
            result.storyId,
            config.model,
            pendingStories,
            pendingCriteria,
            story?.title,
          );
        }
      }

      // Gap between iterations
      if (iteration < config.iterations && config.gapSeconds > 0) {
        verbose(config, `Waiting ${config.gapSeconds}s before next iteration`);
        await sleep(config.gapSeconds * 1000);
      }

      iteration++;
    }
  } finally {
    // Clean up signal handlers
    process.off("SIGINT", handleSignal);
    process.off("SIGTERM", handleSignal);

    if (interrupted) {
      setInterrupted();
    }
  }
}

// Convenience function to run all iterations and collect results
export async function runAllIterations(
  config: RunnerConfig,
): Promise<IterationResult[]> {
  const results: IterationResult[] = [];

  for await (const result of runIterations(config)) {
    results.push(result);
  }

  return results;
}

// Export types
export type { RunnerConfig, IterationResult, RunnerState, Model };
