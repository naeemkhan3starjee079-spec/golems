/**
 * Morning Briefing — Synthesis and formatting for the proactive coach.
 *
 * Pure functions that take gathered data and produce structured briefings.
 * Supports dual output: Telegram (markdown) and Voice (conversational).
 */

import type {
  WhoopRecovery,
  WhoopSleep,
  RecoveryColor,
} from "@golems/shared/whoop/types";
import { getRecoveryColor } from "@golems/shared/whoop/types";
import type { CalendarEvent } from "./calendar-client";
import type { EcosystemStatus } from "./status-aggregator";
import { getPendingWork } from "./status-aggregator";
import type { Email } from "@golems/shared/email/types";
import { getGreeting } from "./schedule-engine";

// --- Types ---

export interface MorningBriefingData {
  whoop: {
    recovery: WhoopRecovery | null;
    sleep: WhoopSleep | null;
  };
  calendar: CalendarEvent[];
  emails: Email[] | null;
  ecosystem: EcosystemStatus;
}

export interface HealthSummary {
  recoveryScore: number;
  recoveryColor: RecoveryColor;
  sleepHours: number;
  sleepPerformance: number;
  hrvRmssd: number;
  restingHeartRate: number;
  spo2: number | null;
}

export interface CalendarOverview {
  eventCount: number;
  events: Array<{ summary: string; start: string; end: string }>;
  allDayEvents: string[];
  summary: string;
}

export interface EmailTriage {
  urgent: Email[];
  jobs: Email[];
  other: Email[];
  total: number;
}

export interface MorningBriefing {
  greeting: string;
  healthSummary: HealthSummary | null;
  calendarOverview: CalendarOverview;
  emailTriage: EmailTriage | null;
  priorities: string[];
}

// --- Helpers ---

function msToHours(ms: number): number {
  return Math.round((ms / 3_600_000) * 10) / 10;
}

function formatEventTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  });
}

// --- Core Functions ---

/**
 * Synthesize a morning briefing from raw data sources.
 * Pure function — no side effects.
 */
export function synthesizeBriefing(data: MorningBriefingData): MorningBriefing {
  const { whoop, calendar, emails, ecosystem } = data;

  // Health summary
  let healthSummary: HealthSummary | null = null;
  if (whoop.recovery && whoop.sleep) {
    healthSummary = {
      recoveryScore: whoop.recovery.score,
      recoveryColor: getRecoveryColor(whoop.recovery.score),
      sleepHours: msToHours(whoop.sleep.durationMs),
      sleepPerformance: whoop.sleep.sleepPerformance,
      hrvRmssd: whoop.recovery.hrvRmssd,
      restingHeartRate: whoop.recovery.restingHeartRate,
      spo2: whoop.recovery.spo2,
    };
  }

  // Calendar overview
  const timedEvents = calendar.filter((e) => !e.allDay);
  const allDayEvents = calendar.filter((e) => e.allDay).map((e) => e.summary);

  const calendarOverview: CalendarOverview = {
    eventCount: timedEvents.length,
    events: timedEvents.map((e) => ({
      summary: e.summary,
      start: formatEventTime(e.start),
      end: formatEventTime(e.end),
    })),
    allDayEvents,
    summary:
      timedEvents.length === 0
        ? "Schedule is clear today"
        : `${timedEvents.length} event${timedEvents.length > 1 ? "s" : ""} today`,
  };

  // Email triage — single-pass classification
  let emailTriage: EmailTriage | null = null;
  if (emails && emails.length > 0) {
    const urgent: Email[] = [];
    const jobs: Email[] = [];
    const other: Email[] = [];
    for (const e of emails) {
      const score = e.score ?? 0;
      if (score >= 10) {
        urgent.push(e);
      } else if (e.category === "job" && score >= 7) {
        jobs.push(e);
      } else {
        other.push(e);
      }
    }
    emailTriage = { urgent, jobs, other, total: emails.length };
  }

  // Priorities from pending work
  const pendingWork = getPendingWork(ecosystem);
  const priorities = pendingWork.map(
    (w) => `[${w.priority.toUpperCase()}] ${w.item}`,
  );

  return {
    greeting: getGreeting(),
    healthSummary,
    calendarOverview,
    emailTriage,
    priorities,
  };
}

/**
 * Format a morning briefing for Telegram (markdown).
 */
export function formatForTelegram(briefing: MorningBriefing): string {
  const lines: string[] = [];
  const sep = "\n━━━━━━━━━━━━━━━━━━━━━\n";

  lines.push(`*${briefing.greeting}!*`);

  // Health section
  if (briefing.healthSummary) {
    const h = briefing.healthSummary;
    const emoji =
      h.recoveryColor === "green"
        ? "🟢"
        : h.recoveryColor === "yellow"
          ? "🟡"
          : "🔴";
    lines.push(sep);
    lines.push(
      `${emoji} *Recovery:* ${h.recoveryScore}% | *HRV:* ${h.hrvRmssd.toFixed(0)}ms | *RHR:* ${h.restingHeartRate}bpm`,
    );
    lines.push(`*Sleep:* ${h.sleepHours}h (${h.sleepPerformance}% quality)`);
  }

  // Calendar section
  lines.push(sep);
  lines.push(`🗓 *Schedule* — ${briefing.calendarOverview.summary}`);
  if (briefing.calendarOverview.allDayEvents.length > 0) {
    for (const ev of briefing.calendarOverview.allDayEvents) {
      lines.push(`   📌 ${ev}`);
    }
  }
  for (const ev of briefing.calendarOverview.events) {
    lines.push(`   ${ev.start}–${ev.end}  ${ev.summary}`);
  }

  // Email section
  if (briefing.emailTriage) {
    const et = briefing.emailTriage;
    lines.push(sep);
    lines.push(`📧 *Email Triage* (${et.total} notable)`);
    if (et.urgent.length > 0) {
      lines.push("🔴 *Urgent:*");
      for (const e of et.urgent.slice(0, 3)) {
        lines.push(`   → ${e.subject?.slice(0, 50) || "No subject"}`);
      }
    }
    if (et.jobs.length > 0) {
      lines.push("💼 *Jobs:*");
      for (const e of et.jobs.slice(0, 3)) {
        lines.push(`   → ${e.subject?.slice(0, 50) || "No subject"}`);
      }
    }
  }

  // Priorities section
  if (briefing.priorities.length > 0) {
    lines.push(sep);
    lines.push("🎯 *Priorities*");
    for (const p of briefing.priorities.slice(0, 5)) {
      lines.push(`   ${p}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a morning briefing for voice output (conversational, no markdown).
 */
export function formatForVoice(briefing: MorningBriefing): string {
  const parts: string[] = [];

  parts.push(`${briefing.greeting}.`);

  // Health
  if (briefing.healthSummary) {
    const h = briefing.healthSummary;
    parts.push(
      `Your recovery is ${h.recoveryScore}%, which is ${h.recoveryColor}. You slept ${h.sleepHours} hours with ${h.sleepPerformance}% quality.`,
    );
  }

  // Calendar
  const cal = briefing.calendarOverview;
  if (cal.eventCount === 0) {
    parts.push("Your schedule is clear today.");
  } else {
    const eventNames = cal.events.map((e) => e.summary).join(", ");
    parts.push(
      `You have ${cal.eventCount} event${cal.eventCount > 1 ? "s" : ""} today: ${eventNames}.`,
    );
  }

  // Email
  if (briefing.emailTriage) {
    const et = briefing.emailTriage;
    if (et.urgent.length > 0) {
      parts.push(
        `There ${et.urgent.length === 1 ? "is" : "are"} ${et.urgent.length} urgent email${et.urgent.length > 1 ? "s" : ""} needing attention.`,
      );
    }
    if (et.jobs.length > 0) {
      parts.push(
        `${et.jobs.length} new job update${et.jobs.length > 1 ? "s" : ""}.`,
      );
    }
  }

  // Priorities
  if (briefing.priorities.length > 0) {
    parts.push(
      `Top priority: ${briefing.priorities[0].replace(/^\[.*?\]\s*/, "")}.`,
    );
  }

  return parts.join(" ");
}
