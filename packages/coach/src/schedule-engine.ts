/**
 * Schedule Engine for CoachGolem
 *
 * Merges calendar events + golem ecosystem state into a daily plan.
 */

import type { CalendarEvent } from "./calendar-client";
import type { EcosystemStatus } from "./status-aggregator";
import { getPendingWork } from "./status-aggregator";

export interface TimeBlock {
  start: string;
  end: string;
  type: "meeting" | "focus" | "break";
  title: string;
  source: "calendar" | "golem" | "habit";
}

export interface DailyPlan {
  date: string;
  greeting: string;
  blocks: TimeBlock[];
  pendingItems: string[];
  summary: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Generate a daily plan from calendar events and ecosystem status.
 */
export function generateDailyPlan(
  events: CalendarEvent[],
  statuses: EcosystemStatus
): DailyPlan {
  const today = new Date();
  const date = today.toISOString().slice(0, 10);

  // Convert non-allDay events to time blocks
  const blocks: TimeBlock[] = events
    .filter((e) => !e.allDay)
    .map((e) => ({
      start: formatTime(e.start),
      end: formatTime(e.end),
      type: "meeting" as const,
      title: e.summary,
      source: "calendar" as const,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));

  // Extract pending items from golem statuses
  const work = getPendingWork(statuses);
  const pendingItems = work.map(
    (w) => `[${w.priority.toUpperCase()}] ${w.item}`
  );

  // Generate summary
  const meetingCount = blocks.length;
  const urgentCount = work.filter((w) => w.priority === "high").length;

  let summary: string;
  if (meetingCount === 0 && urgentCount === 0) {
    summary = `Clear day — ${work.length > 0 ? `${work.length} items to review` : "nothing pending"}`;
  } else {
    const parts: string[] = [];
    if (meetingCount > 0) parts.push(`${meetingCount} meeting${meetingCount > 1 ? "s" : ""}`);
    if (urgentCount > 0) parts.push(`${urgentCount} urgent item${urgentCount > 1 ? "s" : ""}`);
    summary = `Today: ${parts.join(", ")}`;
  }

  return {
    date,
    greeting: getGreeting(),
    blocks,
    pendingItems,
    summary,
  };
}

/**
 * Format a daily plan for Telegram.
 */
export function formatPlanForTelegram(plan: DailyPlan): string {
  const lines: string[] = [];

  lines.push(`${plan.greeting}!`);
  lines.push("");
  lines.push(plan.summary);

  if (plan.blocks.length > 0) {
    lines.push("");
    lines.push("Schedule:");
    for (const block of plan.blocks) {
      lines.push(`  ${block.start}–${block.end}  ${block.title}`);
    }
  }

  if (plan.pendingItems.length > 0) {
    lines.push("");
    lines.push("Pending:");
    for (const item of plan.pendingItems) {
      lines.push(`  ${item}`);
    }
  }

  return lines.join("\n");
}
