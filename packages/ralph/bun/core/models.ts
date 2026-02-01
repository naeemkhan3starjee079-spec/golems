/**
 * Model routing module for Ralph
 * Determines which AI model to use based on task type and configuration
 */

import { type RalphConfig, type Model, type TaskType } from "./config";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Default model assignments per task type
const DEFAULT_TASK_MODELS: Record<TaskType, Model> = {
  US: "sonnet",
  V: "haiku",
  TEST: "haiku",
  BUG: "sonnet",
  AUDIT: "opus",
  MP: "opus",
};

// Extract task type prefix from story ID (e.g., "US-001" -> "US")
export function extractTaskType(storyId: string): TaskType {
  const match = storyId.match(/^([A-Z]+)-/);
  return match ? match[1] : "US";
}

/**
 * Get the model to use for a specific story
 *
 * Priority order:
 * 1. Story-level model override (in story JSON)
 * 2. CLI override flags
 * 3. Config-based smart routing
 * 4. Default model
 */
export function getModelForStory(
  storyId: string,
  config: RalphConfig,
  options?: {
    cliPrimaryModel?: Model;
    cliVerifyModel?: Model;
    prdJsonDir?: string;
  }
): Model {
  const taskType = extractTaskType(storyId);

  // 1. Check story-level override
  if (options?.prdJsonDir) {
    const storyPath = join(options.prdJsonDir, "stories", `${storyId}.json`);
    if (existsSync(storyPath)) {
      try {
        const content = readFileSync(storyPath, "utf-8");
        const story = JSON.parse(content);
        if (story.model) {
          return story.model;
        }
      } catch {
        // Ignore parse errors, fall through to other options
      }
    }
  }

  // 2. CLI override flags
  if (options?.cliPrimaryModel || options?.cliVerifyModel) {
    if (taskType === "V") {
      return options.cliVerifyModel ?? options.cliPrimaryModel ?? "haiku";
    }
    return options.cliPrimaryModel ?? "opus";
  }

  // 3. Config-based routing
  if (config.modelStrategy === "smart") {
    // Check config models first
    const configModel = config.models?.[taskType];
    if (configModel) {
      return configModel;
    }
    // Fall back to defaults for known task types
    if (taskType in DEFAULT_TASK_MODELS) {
      return DEFAULT_TASK_MODELS[taskType as keyof typeof DEFAULT_TASK_MODELS];
    }
    // Unknown task type - use config fallback or default
    return config.unknownTaskType ?? "sonnet";
  }

  // 4. Single model strategy - use default for everything
  return config.defaultModel ?? "opus";
}

/**
 * Get the routing table showing all model assignments
 */
export function getRoutingTable(config: RalphConfig): Record<TaskType, Model> {
  if (config.modelStrategy !== "smart") {
    const model = config.defaultModel ?? "opus";
    return {
      US: model,
      V: model,
      TEST: model,
      BUG: model,
      AUDIT: model,
      MP: model,
    };
  }

  return {
    US: config.models?.US ?? DEFAULT_TASK_MODELS.US,
    V: config.models?.V ?? DEFAULT_TASK_MODELS.V,
    TEST: config.models?.TEST ?? DEFAULT_TASK_MODELS.TEST,
    BUG: config.models?.BUG ?? DEFAULT_TASK_MODELS.BUG,
    AUDIT: config.models?.AUDIT ?? DEFAULT_TASK_MODELS.AUDIT,
    MP: config.models?.MP ?? DEFAULT_TASK_MODELS.MP,
  };
}

/**
 * Check if a model is a Gemini model
 */
export function isGeminiModel(model: Model): boolean {
  return model.startsWith("gemini");
}

/**
 * Check if a model is a Kiro model
 */
export function isKiroModel(model: Model): boolean {
  return model === "kiro";
}

/**
 * Get the CLI command for a specific model
 */
export function getCliForModel(model: Model): string {
  if (isGeminiModel(model)) {
    return "gemini";
  }
  if (isKiroModel(model)) {
    return "kiro-cli";
  }
  return "claude";
}

/**
 * Get display color for a model (ANSI escape codes)
 */
export function getModelColor(model: Model): string {
  switch (model) {
    case "opus":
      return "\x1b[38;5;93m"; // Purple
    case "sonnet":
      return "\x1b[38;5;33m"; // Blue
    case "haiku":
      return "\x1b[38;5;76m"; // Green
    case "gemini-flash":
    case "gemini-pro":
      return "\x1b[38;5;226m"; // Yellow
    case "kiro":
      return "\x1b[38;5;214m"; // Orange
    default:
      return "\x1b[0m"; // Reset
  }
}
