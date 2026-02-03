/**
 * Event Log System for ClaudeGolem
 *
 * Gives ClaudeGolem memory of actions taken while "asleep".
 * Events are injected into Claude's context at spawn time.
 *
 * Storage: ~/.golems-zikaron/event-log.json (max 100 events)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { homedir } from "os";

// Default event log path
const DEFAULT_EVENT_LOG_PATH = join(homedir(), ".golems-zikaron", "event-log.json");

// Maximum events to keep
const MAX_EVENTS = 100;

// Golem actors
export type GolemActor =
  | "claudegolem"
  | "ollamagolem"
  | "nightshift"
  | "jobgolem"
  | "emailgolem";

// Event types
export type EventType =
  | "soltome_post"
  | "draft_approved"
  | "draft_rejected"
  | "draft_scored"
  | "pattern_extracted"
  | "email_alert"
  | "nightshift_pr"
  | "job_match";

// Event structure
export interface GolemEvent {
  id: string;
  timestamp: string;
  actor: GolemActor;
  type: EventType;
  data: Record<string, any>;
}

/**
 * Log an event to the event log
 */
export async function logEvent(
  type: EventType,
  data: Record<string, any>,
  actor: GolemActor = "claudegolem",
  logPath: string = DEFAULT_EVENT_LOG_PATH
): Promise<void> {
  // Ensure directory exists
  const dir = dirname(logPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Read existing events
  let events: GolemEvent[] = [];
  if (existsSync(logPath)) {
    try {
      const content = readFileSync(logPath, "utf-8");
      events = JSON.parse(content);
    } catch {
      // If corrupted, start fresh
      events = [];
    }
  }

  // Create new event
  const event: GolemEvent = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    actor,
    type,
    data,
  };

  // Append event
  events.push(event);

  // Rotate if exceeding max
  if (events.length > MAX_EVENTS) {
    events = events.slice(-MAX_EVENTS);
  }

  // Write back
  writeFileSync(logPath, JSON.stringify(events, null, 2));
}

/**
 * Get events from the last N hours
 */
export async function getRecentEvents(
  hours: number = 24,
  logPath: string = DEFAULT_EVENT_LOG_PATH
): Promise<GolemEvent[]> {
  if (!existsSync(logPath)) {
    return [];
  }

  let events: GolemEvent[] = [];
  try {
    const content = readFileSync(logPath, "utf-8");
    events = JSON.parse(content);
  } catch {
    // If corrupted, return empty
    return [];
  }

  // Filter by time
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return events.filter((event) => new Date(event.timestamp).getTime() > cutoff);
}

/**
 * Format events for Claude's context injection
 *
 * ClaudeGolem actions are prefixed with "YOU" to give ownership feeling.
 * Other golems are named directly.
 */
export function formatEventsForClaude(events: GolemEvent[]): string {
  if (events.length === 0) {
    return "No recent events.";
  }

  // Sort by timestamp descending (most recent first)
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const lines = sorted.map((event) => {
    const timeAgo = formatTimeAgo(event.timestamp);
    const actor = formatActor(event.actor);
    const action = formatAction(event);

    return `- ${timeAgo}: ${actor} ${action}`;
  });

  return lines.join("\n");
}

/**
 * Format timestamp as relative time (e.g., "2h ago", "30m ago")
 */
function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

  if (diffHours >= 1) {
    return `${diffHours}h ago`;
  }
  return `${diffMins}m ago`;
}

/**
 * Format actor name for display
 * ClaudeGolem = "YOU" (gives ownership feeling)
 */
function formatActor(actor: GolemActor): string {
  switch (actor) {
    case "claudegolem":
      return "YOU";
    case "ollamagolem":
      return "OllamaGolem";
    case "nightshift":
      return "NightShift";
    case "jobgolem":
      return "JobGolem";
    case "emailgolem":
      return "EmailGolem";
    default:
      return actor;
  }
}

/**
 * Format action based on event type
 */
function formatAction(event: GolemEvent): string {
  const { type, data } = event;

  switch (type) {
    case "soltome_post": {
      const title = data.title || "(untitled)";
      const credits = data.creditsRemaining ? ` (${data.creditsRemaining} credits left)` : "";
      return `posted to Soltome: "${title}"${credits}`;
    }

    case "draft_approved": {
      const title = data.title || "(untitled)";
      return `approved draft: "${title}"`;
    }

    case "draft_rejected": {
      const title = data.title || "(untitled)";
      const reason = data.reason ? ` - ${data.reason}` : "";
      return `rejected draft: "${title}"${reason}`;
    }

    case "draft_scored": {
      const count = data.count || 1;
      const avg = data.avgScore ? ` (avg: ${data.avgScore})` : "";
      return `scored ${count} draft${count !== 1 ? "s" : ""}${avg}`;
    }

    case "pattern_extracted": {
      const count = data.patternCount || "several";
      return `extracted ${count} patterns from posts`;
    }

    case "email_alert": {
      const subject = data.subject || "(no subject)";
      return `sent alert: "${subject}"`;
    }

    case "nightshift_pr": {
      const repo = data.repo || "unknown";
      const pr = data.prNumber ? `#${data.prNumber}` : "";
      return `created PR: ${repo}${pr}`;
    }

    case "job_match": {
      const company = data.company || "a company";
      const role = data.role || "a role";
      return `found job match: ${role} at ${company}`;
    }

    default:
      return `performed ${type}`;
  }
}
