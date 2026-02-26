/**
 * Configuration utilities for Ralph UI
 * This file provides config loading/saving for the UI components.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Types
export type Model = 'haiku' | 'sonnet' | 'opus' | 'gemini-flash' | 'gemini-pro' | 'kiro' | string;
export type UiMode = 'live' | 'iteration' | 'startup';

export interface RalphConfig {
  $schema?: string;
  schemaVersion?: string;
  lastRalphVersion?: string;
  runtime?: 'bash' | 'bun';
  uiMode?: UiMode;
  modelStrategy?: 'single' | 'smart';
  defaultModel?: Model;
  unknownTaskType?: Model;
  models?: Record<string, Model>;
  parallelVerification?: boolean;
  parallelAgents?: number;
  notifications?: {
    enabled?: boolean;
    ntfyTopic?: string;
    events?: string[];
  };
  defaults?: {
    maxIterations?: number;
    sleepSeconds?: number;
  };
  secrets?: {
    provider?: 'file' | '1password';
    vault?: string;
  };
  pricing?: Record<string, { input: number; output: number }>;
  costEstimation?: {
    enabled?: boolean;
    avgTokensPerStory?: { input?: number; output?: number };
    warnThreshold?: number;
  };
  errorHandling?: {
    maxRetries?: number;
    noMessagesMaxRetries?: number;
    generalCooldownSeconds?: number;
    noMessagesCooldownSeconds?: number;
  };
  colorScheme?: string;
  contexts?: {
    directory?: string;
    additional?: string[];
  };
}

// Default config values
const DEFAULT_CONFIG: Partial<RalphConfig> = {
  runtime: 'bun',
  uiMode: 'live',
  modelStrategy: 'smart',
  defaultModel: 'opus',
  unknownTaskType: 'sonnet',
  notifications: {
    enabled: false,
    events: ['all_complete', 'error', 'blocked'],
  },
};

// Config paths
const RALPH_CONFIG_DIR = join(homedir(), '.config', 'ralphtools');
const RALPH_CONFIG_FILE = join(RALPH_CONFIG_DIR, 'config.json');

/**
 * Load config from config.json with defaults
 */
export function loadConfig(configPath?: string): RalphConfig {
  const filePath = configPath ?? RALPH_CONFIG_FILE;

  if (!existsSync(filePath)) {
    return { ...DEFAULT_CONFIG } as RalphConfig;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const userConfig: Partial<RalphConfig> = JSON.parse(content);

    // Merge with defaults
    return { ...DEFAULT_CONFIG, ...userConfig } as RalphConfig;
  } catch {
    return { ...DEFAULT_CONFIG } as RalphConfig;
  }
}

/**
 * Save config to config.json
 */
export function saveConfig(config: Partial<RalphConfig>, configPath?: string): void {
  const filePath = configPath ?? RALPH_CONFIG_FILE;

  // Ensure directory exists
  if (!existsSync(RALPH_CONFIG_DIR)) {
    mkdirSync(RALPH_CONFIG_DIR, { recursive: true });
  }

  // Write config with pretty printing
  writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}
