/**
 * Status File Management - Communication between runner and UI
 * Part of MP-006: Move iteration loop from zsh to TypeScript
 */

import { existsSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import type { RalphStatus } from "./types";

// AIDEV-NOTE: Status file path follows zsh convention of /tmp/ralph-status-$$.json
// The $$ is replaced with actual PID in getStatusFilePath()

export function getStatusFilePath(pid?: number): string {
  const processId = pid ?? process.pid;
  return `/tmp/ralph-status-${processId}.json`;
}

export function writeStatus(status: Partial<RalphStatus>): void {
  const filePath = getStatusFilePath();

  // Read existing status to merge, or create new
  let current: Partial<RalphStatus> = {};
  if (existsSync(filePath)) {
    try {
      current = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      // Ignore parse errors, start fresh
    }
  }

  const updated: RalphStatus = {
    state: status.state ?? current.state ?? "running",
    iteration: status.iteration ?? current.iteration ?? 0,
    storyId: status.storyId ?? current.storyId ?? "",
    model: status.model ?? current.model,
    startTime: status.startTime ?? current.startTime,
    lastActivity: Math.floor(Date.now() / 1000),
    error: status.error ?? null,
    retryIn: status.retryIn ?? 0,
    pid: process.pid,
  };

  writeFileSync(filePath, JSON.stringify(updated, null, 2));
}

export function readStatus(pid?: number): RalphStatus | null {
  const filePath = getStatusFilePath(pid);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as RalphStatus;
  } catch {
    return null;
  }
}

export function cleanupStatus(): void {
  const filePath = getStatusFilePath();

  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Helper to update just the last activity timestamp
export function touchStatus(): void {
  writeStatus({});
}

// State transition helpers
export function setRunning(
  iteration: number,
  storyId: string,
  options?: { model?: string; startTime?: number }
): void {
  writeStatus({
    state: "running",
    iteration,
    storyId,
    model: options?.model,
    startTime: options?.startTime,
    error: null,
    retryIn: 0,
  });
}

export function setCodeRabbit(iteration: number, storyId: string): void {
  writeStatus({
    state: "cr_review",
    iteration,
    storyId,
  });
}

export function setError(error: string): void {
  writeStatus({
    state: "error",
    error,
  });
}

export function setRetry(retryInSeconds: number): void {
  writeStatus({
    state: "retry",
    retryIn: retryInSeconds,
  });
}

export function setComplete(): void {
  writeStatus({
    state: "complete",
    error: null,
    retryIn: 0,
  });
}

export function setInterrupted(): void {
  writeStatus({ state: "interrupted" });
}

export function setTerminated(): void {
  writeStatus({ state: "terminated" });
}
