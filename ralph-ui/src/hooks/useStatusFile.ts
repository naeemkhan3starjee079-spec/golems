import { useState, useEffect, useRef, useCallback } from 'react';
import { readFileSync, existsSync, watch, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { RalphStatus } from '../types.js';

interface UseStatusFileOptions {
  enabled?: boolean;
  pollIntervalMs?: number;
  batchMs?: number; // Batch updates within this window (default: 100ms per research)
}

/**
 * Hook to watch ralph status file at /tmp/ralph-status-*.json
 * The file is written by ralph.zsh during execution.
 *
 * Implements batching pattern from research: 100ms batching window to reduce flicker.
 *
 * Returns null if no status file exists (Ralph not running).
 */
export function useStatusFile({
  enabled = true,
  pollIntervalMs = 1000,
  batchMs = 100, // Default 100ms batching per research synthesis
}: UseStatusFileOptions = {}): RalphStatus | null {
  const [status, setStatus] = useState<RalphStatus | null>(null);
  const pendingUpdateRef = useRef<RalphStatus | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');

  // Batched state update - waits batchMs before applying
  const scheduleUpdate = useCallback((newStatus: RalphStatus | null) => {
    pendingUpdateRef.current = newStatus;

    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Schedule update after batch window
    batchTimeoutRef.current = setTimeout(() => {
      const pending = pendingUpdateRef.current;
      setStatus(prev => {
        if (!prev && !pending) return null;
        if (!prev) return pending;
        if (!pending) return null;
        // Compare by content to avoid unnecessary updates
        if (JSON.stringify(prev) === JSON.stringify(pending)) return prev;
        return pending;
      });
    }, batchMs);
  }, [batchMs]);

  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      return;
    }

    // Find the most recent ralph status file
    const findStatusFile = (): string | null => {
      try {
        const files = readdirSync('/tmp')
          .filter(f => f.startsWith('ralph-status-') && f.endsWith('.json'));

        if (files.length === 0) return null;

        // Get the most recent file by modification time
        let latestFile = files[0];
        let latestMtime = 0;

        for (const file of files) {
          const path = join('/tmp', file);
          try {
            const stats = statSync(path);
            if (stats.mtimeMs > latestMtime) {
              latestMtime = stats.mtimeMs;
              latestFile = file;
            }
          } catch {
            // Ignore errors, try next file
          }
        }

        return join('/tmp', latestFile);
      } catch {
        return null;
      }
    };

    const loadStatus = () => {
      const statusFile = findStatusFile();
      if (!statusFile || !existsSync(statusFile)) {
        scheduleUpdate(null);
        return;
      }

      try {
        const content = readFileSync(statusFile, 'utf-8');
        // Skip if content hasn't changed (fast path, avoids JSON parse)
        if (content === lastContentRef.current) {
          return;
        }
        lastContentRef.current = content;

        const parsed = JSON.parse(content) as RalphStatus;
        scheduleUpdate(parsed);
      } catch {
        // Invalid JSON or read error - status might be mid-write
        // Keep previous status
      }
    };

    // Initial load (immediate, no batching for first load)
    const statusFile = findStatusFile();
    if (statusFile && existsSync(statusFile)) {
      try {
        const content = readFileSync(statusFile, 'utf-8');
        lastContentRef.current = content;
        setStatus(JSON.parse(content) as RalphStatus);
      } catch {
        // Ignore initial load errors
      }
    }

    // Poll for changes (more reliable than fs.watch for /tmp)
    const interval = setInterval(loadStatus, pollIntervalMs);

    // Also try fs.watch for faster updates (with debouncing via batch)
    let watcher: ReturnType<typeof watch> | null = null;
    if (statusFile && existsSync(statusFile)) {
      try {
        watcher = watch(statusFile, () => {
          loadStatus();
        });
      } catch {
        // Watch might fail on some systems, fallback to polling
      }
    }

    return () => {
      clearInterval(interval);
      if (watcher) {
        watcher.close();
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [enabled, pollIntervalMs, scheduleUpdate]);

  return status;
}
