/**
 * Session Fork Utilities
 *
 * Manages session forking for complex tasks in Telegram bot.
 * Complex tasks get their own Claude session instead of polluting the main chat.
 */

export interface ForkSessionMetadata {
  sessionId: string;
  taskName: string;
  prompt: string;
  createdAt: string;
  chatId: number;
  completedAt?: string;
  result?: string;
}

/**
 * Keywords that suggest a task should be forked to its own session.
 */
const FORK_KEYWORDS = [
  "research",
  "analyze",
  "analyse",
  "build",
  "create",
  "investigate",
  "debug",
  "implement",
  "refactor",
  "optimize",
  "design",
];

/**
 * Common stop words to remove when extracting task names.
 */
const STOP_WORDS = [
  "the",
  "a",
  "an",
  "this",
  "that",
  "these",
  "those",
  "can",
  "you",
  "please",
  "i",
  "want",
  "to",
  "need",
  "help",
  "me",
];

/**
 * Generate a unique session ID for a forked task.
 *
 * @param taskName - Name/description of the task
 * @returns Session ID in format: telegram-fork-{taskName}-{timestamp}
 */
export function generateForkSessionId(taskName: string): string {
  const sanitized = taskName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50); // Truncate to reasonable length

  const timestamp = Date.now();
  return `telegram-fork-${sanitized}-${timestamp}`;
}

/**
 * Check if a message should trigger a session fork suggestion.
 *
 * @param message - The user's message
 * @returns True if message contains fork-worthy keywords
 */
export function shouldSuggestForking(message: string): boolean {
  const normalized = message.toLowerCase();

  // Skip very short messages
  if (normalized.length < 10) {
    return false;
  }

  // Check for fork keywords
  return FORK_KEYWORDS.some(keyword => normalized.includes(keyword));
}

/**
 * Extract a task name from a prompt.
 *
 * @param prompt - The full prompt/message
 * @returns Sanitized task name suitable for session ID
 */
export function extractTaskName(prompt: string): string {
  const normalized = prompt.toLowerCase();

  // Find the fork keyword
  const keyword = FORK_KEYWORDS.find(k => normalized.includes(k));
  if (!keyword) {
    return "task";
  }

  // Extract everything after the keyword
  const keywordIndex = normalized.indexOf(keyword);
  let afterKeyword = prompt.slice(keywordIndex + keyword.length).trim();

  // Remove common prefixes
  afterKeyword = afterKeyword.replace(/^(the|this|that|a|an)\s+/i, "");

  // Tokenize and remove stop words
  const tokens = afterKeyword
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.includes(word));

  // Take first 5-6 words max
  const taskWords = tokens.slice(0, 6);

  if (taskWords.length === 0) {
    return "task";
  }

  // Join with hyphens and truncate
  return taskWords.join("-").slice(0, 50);
}

/**
 * Fork a task to its own Claude session.
 *
 * @param taskName - Name of the task
 * @param prompt - The full prompt to send to Claude
 * @param chatId - Telegram chat ID for tracking
 * @returns Session metadata
 */
export function createForkSession(
  taskName: string,
  prompt: string,
  chatId: number
): ForkSessionMetadata {
  const sessionId = generateForkSessionId(taskName);

  return {
    sessionId,
    taskName,
    prompt,
    chatId,
    createdAt: new Date().toISOString(),
  };
}
