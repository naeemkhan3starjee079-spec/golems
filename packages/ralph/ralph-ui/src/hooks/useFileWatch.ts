import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { existsSync } from 'fs';
import { join } from 'path';
import type { PRDStats } from '../types.js';
import { createStatsLoader } from './usePRDStats.js';

interface UseFileWatchOptions {
  prdPath: string;
  enabled?: boolean;
}

interface UsePollingWatchOptions extends UseFileWatchOptions {
  intervalMs?: number;
  batchMs?: number; // Batch updates within this window (default: 100ms per research)
}

/**
 * Poll for file changes (fs.watch is unreliable on macOS)
 * Default interval: 1000ms
 *
 * Implements batching pattern from research: 100ms batching window to reduce flicker.
 */
export function usePollingWatch({
  prdPath,
  enabled = true,
  intervalMs = 1000,
  batchMs = 100, // Default 100ms batching per research synthesis
}: UsePollingWatchOptions): PRDStats | null {
  const [stats, setStats] = useState<PRDStats | null>(null);
  const pendingUpdateRef = useRef<PRDStats | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatsJsonRef = useRef<string>('');

  // Memoize the loader so it doesn't change on every render
  const loadStats = useMemo(() => createStatsLoader(prdPath), [prdPath]);

  // Batched state update - waits batchMs before applying
  const scheduleUpdate = useCallback((newStats: PRDStats | null) => {
    pendingUpdateRef.current = newStats;

    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Schedule update after batch window
    batchTimeoutRef.current = setTimeout(() => {
      const pending = pendingUpdateRef.current;
      setStats(prev => {
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
    // Initial load (immediate, no batching for first load)
    const initialStats = loadStats();
    if (initialStats) {
      lastStatsJsonRef.current = JSON.stringify(initialStats);
      setStats(initialStats);
    }

    if (!enabled) {
      return;
    }

    // Poll at regular intervals with batching
    const interval = setInterval(() => {
      const newStats = loadStats();
      if (newStats) {
        // Fast path: skip if content hasn't changed
        const newJson = JSON.stringify(newStats);
        if (newJson === lastStatsJsonRef.current) {
          return;
        }
        lastStatsJsonRef.current = newJson;
        scheduleUpdate(newStats);
      }
    }, intervalMs);

    return () => {
      clearInterval(interval);
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [prdPath, enabled, intervalMs, loadStats, scheduleUpdate]);

  return stats;
}

// Alias for backwards compatibility
export const useFileWatch = usePollingWatch;
