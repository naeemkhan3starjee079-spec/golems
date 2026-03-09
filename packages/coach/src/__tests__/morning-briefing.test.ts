/**
 * Morning Briefing — TDD Tests
 *
 * Tests the pure synthesis and formatting functions.
 * Data gathering is integration-level (tested separately).
 */

import { describe, test, expect } from "bun:test";
import {
  synthesizeBriefing,
  formatForTelegram,
  formatForVoice,
  type MorningBriefingData,
  type MorningBriefing,
} from "../morning-briefing";
import type { WhoopRecovery, WhoopSleep } from "@golems/shared/whoop/types";
import type { CalendarEvent } from "../calendar-client";
import type { EcosystemStatus } from "../status-aggregator";
import type { Email } from "@golems/shared/email/types";

// --- Test Fixtures ---

function makeRecovery(overrides?: Partial<WhoopRecovery>): WhoopRecovery {
  return {
    cycleId: 1,
    score: 72,
    hrvRmssd: 45.3,
    restingHeartRate: 58,
    spo2: 97,
    skinTemp: 33.2,
    scoreState: "SCORED",
    ...overrides,
  };
}

function makeSleep(overrides?: Partial<WhoopSleep>): WhoopSleep {
  return {
    id: "sleep-1",
    start: "2026-03-10T00:30:00Z",
    end: "2026-03-10T08:00:00Z",
    durationMs: 7.5 * 3_600_000, // 7.5h
    qualityDurationMs: 6.5 * 3_600_000,
    remDurationMs: 1.8 * 3_600_000,
    deepDurationMs: 1.5 * 3_600_000,
    lightDurationMs: 3.2 * 3_600_000,
    awakeDurationMs: 1 * 3_600_000,
    sleepPerformance: 85,
    sleepConsistency: 78,
    sleepEfficiency: 87,
    scoreState: "SCORED",
    ...overrides,
  };
}

function makeCalendarEvents(): CalendarEvent[] {
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  const end1 = new Date(today);
  end1.setHours(11, 0, 0, 0);

  const start2 = new Date(today);
  start2.setHours(14, 0, 0, 0);
  const end2 = new Date(today);
  end2.setHours(15, 30, 0, 0);

  return [
    {
      id: "ev1",
      summary: "Team Standup",
      start: today,
      end: end1,
      allDay: false,
      status: "confirmed",
    },
    {
      id: "ev2",
      summary: "Interview Prep",
      start: start2,
      end: end2,
      allDay: false,
      status: "confirmed",
    },
  ];
}

function makeEmails(): Email[] {
  return [
    {
      gmail_id: "e1",
      subject: "Interview scheduled with Acme Corp",
      from_address: "recruiter@acme.com",
      snippet: "We'd like to schedule an interview...",
      score: 10,
      category: "interview",
      received_at: new Date(),
      notified: true,
    },
    {
      gmail_id: "e2",
      subject: "New job match: Senior React Developer",
      from_address: "jobs@linkedin.com",
      snippet: "Based on your profile...",
      score: 7,
      category: "job",
      received_at: new Date(),
      notified: false,
    },
    {
      gmail_id: "e3",
      subject: "Your AWS bill is ready",
      from_address: "billing@aws.amazon.com",
      snippet: "$12.50 for March...",
      score: 5,
      category: "subscription",
      received_at: new Date(),
      notified: false,
    },
  ];
}

function makeEcosystemStatus(): EcosystemStatus {
  return {
    timestamp: new Date().toISOString(),
    golems: [
      {
        name: "JobsGolem",
        healthy: true,
        lastRun: new Date().toISOString(),
        summary: "3 hot matches today",
        details: { pendingMatches: 3 },
      },
      {
        name: "RecruiterGolem",
        healthy: true,
        lastRun: new Date().toISOString(),
        summary: "2 drafts pending",
        details: { draftCount: 2 },
      },
    ],
    healthy: 2,
    unhealthy: 0,
    summary: "2 golems healthy",
  };
}

function makeFullBriefingData(): MorningBriefingData {
  return {
    whoop: {
      recovery: makeRecovery(),
      sleep: makeSleep(),
    },
    calendar: makeCalendarEvents(),
    emails: makeEmails(),
    ecosystem: makeEcosystemStatus(),
  };
}

// --- synthesizeBriefing Tests ---

describe("synthesizeBriefing", () => {
  test("produces a complete briefing from full data", () => {
    const data = makeFullBriefingData();
    const briefing = synthesizeBriefing(data);

    expect(briefing.healthSummary).not.toBeNull();
    expect(briefing.healthSummary!.recoveryScore).toBe(72);
    expect(briefing.healthSummary!.recoveryColor).toBe("green");
    expect(briefing.healthSummary!.sleepHours).toBe(7.5);
    expect(briefing.healthSummary!.sleepPerformance).toBe(85);
    expect(briefing.healthSummary!.hrvRmssd).toBe(45.3);

    expect(briefing.calendarOverview.eventCount).toBe(2);
    expect(briefing.calendarOverview.events).toHaveLength(2);
    expect(briefing.calendarOverview.events[0].summary).toBe("Team Standup");

    expect(briefing.emailTriage).not.toBeNull();
    expect(briefing.emailTriage!.urgent).toHaveLength(1);
    expect(briefing.emailTriage!.jobs).toHaveLength(1);
    expect(briefing.emailTriage!.other).toHaveLength(1);
    expect(briefing.emailTriage!.total).toBe(3);

    expect(briefing.priorities).toBeDefined();
    expect(Array.isArray(briefing.priorities)).toBe(true);
  });

  test("handles missing WHOOP data gracefully", () => {
    const data = makeFullBriefingData();
    data.whoop = { recovery: null, sleep: null };

    const briefing = synthesizeBriefing(data);

    expect(briefing.healthSummary).toBeNull();
    expect(briefing.calendarOverview.eventCount).toBe(2);
    expect(briefing.emailTriage).not.toBeNull();
  });

  test("handles missing email data gracefully", () => {
    const data = makeFullBriefingData();
    data.emails = null;

    const briefing = synthesizeBriefing(data);

    expect(briefing.emailTriage).toBeNull();
    expect(briefing.healthSummary).not.toBeNull();
  });

  test("handles empty calendar", () => {
    const data = makeFullBriefingData();
    data.calendar = [];

    const briefing = synthesizeBriefing(data);

    expect(briefing.calendarOverview.eventCount).toBe(0);
    expect(briefing.calendarOverview.events).toHaveLength(0);
    expect(briefing.calendarOverview.summary).toContain("clear");
  });

  test("filters all-day events from calendar overview", () => {
    const data = makeFullBriefingData();
    data.calendar = [
      ...data.calendar,
      {
        id: "ev-allday",
        summary: "Public Holiday",
        start: new Date(),
        end: new Date(),
        allDay: true,
        status: "confirmed",
      },
    ];

    const briefing = synthesizeBriefing(data);

    // All-day events should be in allDayEvents, not counted in timed events
    expect(briefing.calendarOverview.allDayEvents).toHaveLength(1);
    expect(briefing.calendarOverview.allDayEvents[0]).toBe("Public Holiday");
    expect(briefing.calendarOverview.eventCount).toBe(2); // Only timed events
  });

  test("classifies recovery colors correctly", () => {
    // Green: 67+
    const greenData = makeFullBriefingData();
    greenData.whoop.recovery = makeRecovery({ score: 80 });
    expect(synthesizeBriefing(greenData).healthSummary!.recoveryColor).toBe(
      "green",
    );

    // Yellow: 34-66
    const yellowData = makeFullBriefingData();
    yellowData.whoop.recovery = makeRecovery({ score: 50 });
    expect(synthesizeBriefing(yellowData).healthSummary!.recoveryColor).toBe(
      "yellow",
    );

    // Red: <34
    const redData = makeFullBriefingData();
    redData.whoop.recovery = makeRecovery({ score: 20 });
    expect(synthesizeBriefing(redData).healthSummary!.recoveryColor).toBe(
      "red",
    );
  });

  test("classifies recovery colors at exact boundaries", () => {
    // Boundary: exactly 67 → green
    const b67 = makeFullBriefingData();
    b67.whoop.recovery = makeRecovery({ score: 67 });
    expect(synthesizeBriefing(b67).healthSummary!.recoveryColor).toBe("green");

    // Boundary: exactly 66 → yellow
    const b66 = makeFullBriefingData();
    b66.whoop.recovery = makeRecovery({ score: 66 });
    expect(synthesizeBriefing(b66).healthSummary!.recoveryColor).toBe("yellow");

    // Boundary: exactly 34 → yellow
    const b34 = makeFullBriefingData();
    b34.whoop.recovery = makeRecovery({ score: 34 });
    expect(synthesizeBriefing(b34).healthSummary!.recoveryColor).toBe("yellow");

    // Boundary: exactly 33 → red
    const b33 = makeFullBriefingData();
    b33.whoop.recovery = makeRecovery({ score: 33 });
    expect(synthesizeBriefing(b33).healthSummary!.recoveryColor).toBe("red");
  });

  test("generates priorities from ecosystem pending items", () => {
    const data = makeFullBriefingData();
    const briefing = synthesizeBriefing(data);

    expect(briefing.priorities.length).toBeGreaterThan(0);
  });

  test("handles completely empty data", () => {
    const data: MorningBriefingData = {
      whoop: { recovery: null, sleep: null },
      calendar: [],
      emails: null,
      ecosystem: {
        timestamp: new Date().toISOString(),
        golems: [],
        healthy: 0,
        unhealthy: 0,
        summary: "No golems",
      },
    };

    const briefing = synthesizeBriefing(data);

    expect(briefing.healthSummary).toBeNull();
    expect(briefing.calendarOverview.eventCount).toBe(0);
    expect(briefing.emailTriage).toBeNull();
    expect(briefing.priorities).toHaveLength(0);
  });
});

// --- formatForTelegram Tests ---

describe("formatForTelegram", () => {
  test("formats a full briefing for Telegram", () => {
    const data = makeFullBriefingData();
    const briefing = synthesizeBriefing(data);
    const text = formatForTelegram(briefing);

    // Should include health
    expect(text).toContain("Recovery");
    expect(text).toContain("72%");
    expect(text).toContain("Sleep");
    expect(text).toContain("7.5h");

    // Should include calendar
    expect(text).toContain("Team Standup");
    expect(text).toContain("Interview Prep");

    // Should include email triage
    expect(text).toContain("Interview scheduled");
    expect(text).toContain("job match");

    // Should include priorities
    expect(text).toContain("Priorities");
  });

  test("formats briefing without health data", () => {
    const data = makeFullBriefingData();
    data.whoop = { recovery: null, sleep: null };
    const briefing = synthesizeBriefing(data);
    const text = formatForTelegram(briefing);

    expect(text).not.toContain("Recovery");
    expect(text).toContain("Team Standup");
  });

  test("formats briefing without emails", () => {
    const data = makeFullBriefingData();
    data.emails = null;
    const briefing = synthesizeBriefing(data);
    const text = formatForTelegram(briefing);

    expect(text).not.toContain("Email");
    expect(text).toContain("Recovery");
  });
});

// --- formatForVoice Tests ---

describe("formatForVoice", () => {
  test("produces conversational voice-friendly text", () => {
    const data = makeFullBriefingData();
    const briefing = synthesizeBriefing(data);
    const voice = formatForVoice(briefing);

    // Should be conversational, not markdown
    expect(voice).not.toContain("*");
    expect(voice).not.toContain("```");
    expect(voice).not.toContain("#");

    // Should mention key data points
    expect(voice).toContain("72");
    expect(voice).toContain("green");
    expect(voice).toContain("7.5");
  });

  test("handles missing health data gracefully in voice", () => {
    const data = makeFullBriefingData();
    data.whoop = { recovery: null, sleep: null };
    const briefing = synthesizeBriefing(data);
    const voice = formatForVoice(briefing);

    // Should still work
    expect(voice.length).toBeGreaterThan(0);
    expect(voice).not.toContain("Recovery");
  });

  test("voice text is shorter than telegram text", () => {
    const data = makeFullBriefingData();
    const briefing = synthesizeBriefing(data);
    const telegram = formatForTelegram(briefing);
    const voice = formatForVoice(briefing);

    // Voice should be more concise
    expect(voice.length).toBeLessThanOrEqual(telegram.length);
  });
});
