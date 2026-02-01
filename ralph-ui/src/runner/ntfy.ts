/**
 * Ntfy Notification Sending
 * Sends rich notifications to ntfy.sh for iteration events
 * Format matches the zsh version (_ralph_ntfy in ralph-models.zsh)
 */

import { basename } from "path";

export interface NtfyOptions {
  topic: string;
  title: string;
  message: string;
  priority?: "min" | "low" | "default" | "high" | "urgent";
  tags?: string[];
}

export interface RichNtfyOptions {
  topic: string;
  event: "complete" | "blocked" | "error" | "iteration" | "max_iterations" | "retry";
  storyId?: string;
  storyTitle?: string;
  model?: string;
  iteration?: number;
  pendingStories?: number;
  pendingCriteria?: number;
  cost?: number;
  projectName?: string;
  message?: string; // For error/retry messages
}

/**
 * Send a notification via local Telegram bot (replaces ntfy.sh)
 */
export async function sendNtfy(options: NtfyOptions): Promise<boolean> {
  console.log(`[Notify] Sending: ${options.title}`);

  try {
    const response = await fetch("http://localhost:3847/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: options.title,
        body: options.message,
        priority: options.priority || "default",
      }),
    });

    return response.ok;
  } catch {
    // Silently fail - notifications are non-critical
    return false;
  }
}

/**
 * Build rich notification body
 * Line 1: project name
 * Line 2: story ID + title (truncated)
 * Line 3: iteration, model, remaining stats
 */
function buildRichBody(options: RichNtfyOptions): string {
  const lines: string[] = [];

  // Line 1: project name
  const projectName = options.projectName || basename(process.cwd());
  lines.push(`📦 ${projectName}`);

  // Line 2: story ID + title
  if (options.storyId) {
    let storyLine = `✅ ${options.storyId}`;
    if (options.storyTitle) {
      // Truncate title if too long
      const maxTitleLen = 40;
      const title = options.storyTitle.length > maxTitleLen
        ? options.storyTitle.slice(0, maxTitleLen) + "..."
        : options.storyTitle;
      storyLine += `: ${title}`;
    }
    lines.push(storyLine);
  }

  // Line 3: iteration, model, stats (or error message)
  if (options.message) {
    lines.push(options.message);
  } else {
    const statsParts: string[] = [];
    if (options.iteration !== undefined) statsParts.push(`#${options.iteration}`);
    if (options.model) statsParts.push(options.model);
    if (options.pendingStories !== undefined) statsParts.push(`${options.pendingStories} left`);
    if (options.pendingCriteria !== undefined && options.pendingCriteria > 0) {
      statsParts.push(`${options.pendingCriteria} criteria`);
    }
    if (options.cost !== undefined) statsParts.push(`$${options.cost.toFixed(2)}`);
    if (statsParts.length > 0) lines.push(statsParts.join(" · "));
  }

  return lines.join("\n");
}

/**
 * Get title and tags for event type
 */
function getEventConfig(event: RichNtfyOptions["event"]): {
  title: string;
  tags: string[];
  priority: NtfyOptions["priority"];
} {
  switch (event) {
    case "complete":
      return { title: "[Ralph] Complete", tags: ["white_check_mark", "robot"], priority: "high" };
    case "blocked":
      return { title: "[Ralph] Blocked", tags: ["stop_button", "warning"], priority: "urgent" };
    case "error":
      return { title: "[Ralph] Error", tags: ["x", "fire"], priority: "urgent" };
    case "iteration":
      return { title: "[Ralph] Progress", tags: ["arrows_counterclockwise"], priority: "low" };
    case "max_iterations":
      return { title: "[Ralph] Limit Hit", tags: ["warning", "hourglass"], priority: "high" };
    case "retry":
      return { title: "[Ralph] Retry", tags: ["hourglass"], priority: "low" };
    default:
      return { title: "[Ralph]", tags: ["robot"], priority: "default" };
  }
}

/**
 * Send rich notification with full context
 */
export async function sendRichNtfy(options: RichNtfyOptions): Promise<boolean> {
  const { title, tags, priority } = getEventConfig(options.event);
  const body = buildRichBody(options);

  return sendNtfy({
    topic: options.topic,
    title,
    message: body,
    priority,
    tags,
  });
}

/**
 * Send iteration complete notification
 */
export async function notifyIterationComplete(
  topic: string,
  iteration: number,
  storyId: string,
  model?: string,
  pendingStories?: number,
  pendingCriteria?: number,
  storyTitle?: string
): Promise<void> {
  await sendRichNtfy({
    topic,
    event: "iteration",
    iteration,
    storyId,
    storyTitle,
    model,
    pendingStories,
    pendingCriteria,
  });
}

/**
 * Send story complete notification
 */
export async function notifyStoryComplete(
  topic: string,
  storyId: string,
  model?: string,
  pendingStories?: number,
  pendingCriteria?: number
): Promise<void> {
  await sendRichNtfy({
    topic,
    event: "complete",
    storyId,
    model,
    pendingStories,
    pendingCriteria,
  });
}

/**
 * Send PRD complete notification
 */
export async function notifyPRDComplete(topic: string): Promise<void> {
  await sendRichNtfy({
    topic,
    event: "complete",
    message: "All stories completed!",
  });
}

/**
 * Send error notification
 */
export async function notifyError(
  topic: string,
  error: string,
  storyId?: string,
  model?: string
): Promise<void> {
  await sendRichNtfy({
    topic,
    event: "error",
    storyId,
    model,
    message: error,
  });
}

/**
 * Send retry notification
 */
export async function notifyRetry(
  topic: string,
  retryCount: number,
  cooldownSecs: number,
  storyId?: string
): Promise<void> {
  await sendRichNtfy({
    topic,
    event: "retry",
    storyId,
    message: `Retry ${retryCount} - waiting ${cooldownSecs}s`,
  });
}

/**
 * Send blocked notification
 */
export async function notifyBlocked(
  topic: string,
  storyId?: string,
  reason?: string
): Promise<void> {
  await sendRichNtfy({
    topic,
    event: "blocked",
    storyId,
    message: reason || "Story blocked",
  });
}

/**
 * Send max iterations notification
 */
export async function notifyMaxIterations(
  topic: string,
  iterations: number,
  storyId?: string
): Promise<void> {
  await sendRichNtfy({
    topic,
    event: "max_iterations",
    storyId,
    message: `Reached ${iterations} iterations limit`,
  });
}
