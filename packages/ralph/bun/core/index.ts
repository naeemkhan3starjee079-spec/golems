/**
 * Ralph Core - TypeScript modules for Ralph autonomous coding loop
 *
 * This module exports all core functionality that can be used by both
 * the bash wrapper and the React Ink UI.
 */

// Config module
export {
  type Model,
  type TaskType,
  type ModelStrategy,
  type NotificationEvent,
  type ModelPricing,
  type RalphConfig,
  DEFAULT_CONFIG,
  RALPH_CONFIG_DIR,
  RALPH_CONFIG_FILE,
  loadConfig,
  getConfigValue,
  configExists,
} from "./config";

// Models module
export {
  extractTaskType,
  getModelForStory,
  getRoutingTable,
  isGeminiModel,
  isKiroModel,
  getCliForModel,
  getModelColor,
} from "./models";

// Costs module
export {
  type CostEntry,
  type CostsData,
  RALPH_COSTS_DIR,
  RALPH_COSTS_FILE,
  initCosts,
  calculateCost,
  logCost,
  readCosts,
  getCostsSummary,
  getSessionTokens,
  formatCost,
  estimateStoryCost,
} from "./costs";

// Stories module
export {
  type StoryStatus,
  type StoryType,
  type Priority,
  type AcceptanceCriterion,
  type Story,
  type PRDIndex,
  readIndex,
  writeIndex,
  readStory,
  writeStory,
  listStoryIds,
  getNextStory,
  checkCriterion,
  completeStory,
  blockStory,
  getCriteriaProgress,
  hasPartialProgress,
  getUncheckedCriteria,
  getCheckedCriteria,
  areDependenciesSatisfied,
  getUnsatisfiedDependencies,
} from "./stories";

// Claude module
export {
  type ClaudeSpawnOptions,
  type ClaudeResult,
  buildCliArgs,
  spawnClaude,
  loadPromptTemplate,
  buildRalphPrompt,
  parseClaudeOutput,
  hasCompletionSignal,
  hasBlockedSignal,
} from "./claude";
