/**
 * Cost tracking module for Ralph
 * Tracks API costs per iteration and writes to costs.jsonl
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { mkdirSync } from "fs";
import { homedir } from "os";
import { type Model, type RalphConfig, type TaskType, type ModelPricing } from "./config";

// Cost log entry structure
export interface CostEntry {
  timestamp: string;
  storyId: string;
  model: Model;
  taskType: TaskType;
  durationSeconds: number;
  status: "success" | "blocked" | "error";
  sessionId?: string;
  tokens?: {
    input: number;
    output: number;
    cacheCreate?: number;
    cacheRead?: number;
  };
  estimatedCost?: number;
}

// Costs file structure
export interface CostsData {
  runs: CostEntry[];
  totals: {
    stories: number;
    estimatedCost: number;
    byModel: Record<Model, number>;
  };
  avgTokensObserved: Record<TaskType, {
    input: number;
    output: number;
    samples: number;
  }>;
}

// Default pricing per million tokens
const DEFAULT_PRICING: Record<Model, ModelPricing> = {
  haiku: { input: 1, output: 5 },
  sonnet: { input: 3, output: 15 },
  opus: { input: 15, output: 75 },
  "gemini-flash": { input: 0.075, output: 0.30 },
  "gemini-pro": { input: 1.25, output: 5 },
  kiro: { input: 0, output: 0 }, // Credit-based
};

// Cache pricing (per million tokens)
const CACHE_PRICING: Record<Model, { create: number; read: number }> = {
  haiku: { create: 1.25, read: 0.10 },
  sonnet: { create: 3.75, read: 0.30 },
  opus: { create: 18.75, read: 1.50 },
  "gemini-flash": { create: 0, read: 0 },
  "gemini-pro": { create: 0, read: 0 },
  kiro: { create: 0, read: 0 },
};

// Default costs file path
export const RALPH_COSTS_DIR = join(homedir(), ".config", "ralphtools");
export const RALPH_COSTS_FILE = join(RALPH_COSTS_DIR, "costs.jsonl");

/**
 * Initialize costs tracking file if it doesn't exist
 */
export function initCosts(costsPath?: string): void {
  const filePath = costsPath ?? RALPH_COSTS_FILE;
  const dir = dirname(filePath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(filePath)) {
    // Write empty JSONL file
    writeFileSync(filePath, "");
  }
}

/**
 * Calculate cost for a given token usage
 */
export function calculateCost(
  model: Model,
  tokens: {
    input: number;
    output: number;
    cacheCreate?: number;
    cacheRead?: number;
  },
  config?: RalphConfig
): number {
  // Kiro uses credits, not trackable tokens
  if (model === "kiro") {
    return 0;
  }

  const pricing = config?.pricing?.[model] ?? DEFAULT_PRICING[model] ?? DEFAULT_PRICING.sonnet;
  const cachePricing = CACHE_PRICING[model] ?? CACHE_PRICING.sonnet;

  // Convert from per-million to per-token
  const inputCost = (tokens.input / 1_000_000) * pricing.input;
  const outputCost = (tokens.output / 1_000_000) * pricing.output;
  const cacheCreateCost = ((tokens.cacheCreate ?? 0) / 1_000_000) * cachePricing.create;
  const cacheReadCost = ((tokens.cacheRead ?? 0) / 1_000_000) * cachePricing.read;

  return inputCost + outputCost + cacheCreateCost + cacheReadCost;
}

/**
 * Log a cost entry to the costs file
 */
export function logCost(entry: CostEntry, costsPath?: string): void {
  const filePath = costsPath ?? RALPH_COSTS_FILE;
  initCosts(filePath);

  const line = JSON.stringify(entry) + "\n";
  appendFileSync(filePath, line);
}

/**
 * Read all cost entries from the costs file
 */
export function readCosts(costsPath?: string): CostEntry[] {
  const filePath = costsPath ?? RALPH_COSTS_FILE;

  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());

  return lines.map(line => {
    try {
      return JSON.parse(line) as CostEntry;
    } catch {
      return null;
    }
  }).filter((entry): entry is CostEntry => entry !== null);
}

/**
 * Get total costs summary
 */
export function getCostsSummary(entries: CostEntry[]): CostsData["totals"] {
  const totals: CostsData["totals"] = {
    stories: 0,
    estimatedCost: 0,
    byModel: {},
  };

  for (const entry of entries) {
    if (entry.status === "success") {
      totals.stories++;
    }
    const cost = entry.estimatedCost ?? 0;
    totals.estimatedCost += cost;

    if (entry.model in totals.byModel) {
      totals.byModel[entry.model] += cost;
    } else {
      totals.byModel[entry.model] = cost;
    }
  }

  return totals;
}

/**
 * Get token usage from Claude's JSONL session files
 * @param sessionId - Session UUID to look for
 * @param projectPath - Project path to find the Claude project directory
 */
export function getSessionTokens(
  sessionId: string,
  projectPath: string
): { input: number; output: number; cacheCreate: number; cacheRead: number } {
  // Convert project path to Claude's project directory format
  // e.g., /Users/foo/project -> -Users-foo-project
  const claudeProject = projectPath.replace(/\//g, "-");
  const jsonlDir = join(homedir(), ".claude", "projects", claudeProject);

  if (!existsSync(jsonlDir)) {
    return { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 };
  }

  let input = 0;
  let output = 0;
  let cacheCreate = 0;
  let cacheRead = 0;

  try {
    const files = readdirSync(jsonlDir).filter(f => f.endsWith(".jsonl"));
    for (const file of files) {
      const content = readFileSync(join(jsonlDir, file), "utf-8");
      const lines = content.split("\n").filter(line => line.includes(sessionId) && line.includes('"usage"'));

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const usage = data.message?.usage;
          if (usage) {
            input += usage.input_tokens ?? 0;
            output += usage.output_tokens ?? 0;
            cacheCreate += usage.cache_creation_input_tokens ?? 0;
            cacheRead += usage.cache_read_input_tokens ?? 0;
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
  } catch {
    // Directory read error
  }

  return { input, output, cacheCreate, cacheRead };
}

/**
 * Format cost as a display string (e.g., "$1.50")
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

/**
 * Estimate cost for a story based on average tokens per task type
 * Note: storyId is accepted for future per-task-type estimation
 */
export function estimateStoryCost(
  _storyId: string,
  model: Model,
  config?: RalphConfig
): number {
  // Use config's average tokens or defaults
  const avgTokens = config?.costEstimation?.avgTokensPerStory ?? {
    input: 50000,
    output: 10000,
  };

  return calculateCost(model, {
    input: avgTokens.input ?? 50000,
    output: avgTokens.output ?? 10000,
  }, config);
}
