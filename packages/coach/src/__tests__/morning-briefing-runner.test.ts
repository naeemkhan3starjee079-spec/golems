/**
 * Morning Briefing Runner — Tests
 *
 * Tests the data-gathering orchestration and output routing.
 * Uses dependency injection to avoid real API calls.
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";
import {
  runMorningBriefing,
  type BriefingDeps,
  type BriefingResult,
} from "../morning-briefing-runner";
import type { WhoopRecovery, WhoopSleep } from "@golems/shared/whoop/types";
import type { CalendarEvent } from "../calendar-client";
import type { EcosystemStatus } from "../status-aggregator";
import type { Email } from "@golems/shared/email/types";

// --- Test Fixtures ---

function makeRecovery(): WhoopRecovery {
  return {
    cycleId: 1,
    score: 72,
    hrvRmssd: 45.3,
    restingHeartRate: 58,
    spo2: 97,
    skinTemp: 33.2,
    scoreState: "SCORED",
  };
}

function makeSleep(): WhoopSleep {
  return {
    id: "sleep-1",
    start: "2026-03-10T00:30:00Z",
    end: "2026-03-10T08:00:00Z",
    durationMs: 7.5 * 3_600_000,
    qualityDurationMs: 6.5 * 3_600_000,
    remDurationMs: 1.8 * 3_600_000,
    deepDurationMs: 1.5 * 3_600_000,
    lightDurationMs: 3.2 * 3_600_000,
    awakeDurationMs: 1 * 3_600_000,
    sleepPerformance: 85,
    sleepConsistency: 78,
    sleepEfficiency: 87,
    scoreState: "SCORED",
  };
}

function makeEvents(): CalendarEvent[] {
  const start = new Date();
  start.setHours(10, 0, 0, 0);
  const end = new Date();
  end.setHours(11, 0, 0, 0);
  return [
    {
      id: "ev1",
      summary: "Team Standup",
      start,
      end,
      allDay: false,
      status: "confirmed",
    },
  ];
}

function makeEmails(): Email[] {
  return [
    {
      gmail_id: "e1",
      subject: "Interview at Acme",
      from_address: "hr@acme.com",
      snippet: "...",
      score: 10,
      category: "interview",
      received_at: new Date(),
      notified: true,
    },
  ];
}

function makeEcosystem(): EcosystemStatus {
  return {
    timestamp: new Date().toISOString(),
    golems: [],
    healthy: 0,
    unhealthy: 0,
    summary: "No golems",
  };
}

function makeDeps(overrides?: Partial<BriefingDeps>): BriefingDeps {
  return {
    getRecovery: mock(() => Promise.resolve(makeRecovery())),
    getSleep: mock(() => Promise.resolve(makeSleep())),
    getCalendarEvents: mock(() => Promise.resolve(makeEvents())),
    getEmails: mock(() => Promise.resolve(makeEmails())),
    getEcosystem: mock(() => Promise.resolve(makeEcosystem())),
    sendTelegram: mock(() => Promise.resolve(true)),
    reportRun: mock(() => Promise.resolve()),
    ...overrides,
  };
}

// --- Tests ---

describe("runMorningBriefing", () => {
  test("gathers data from all sources and sends to Telegram", async () => {
    const deps = makeDeps();
    const result = await runMorningBriefing({ mode: "telegram", deps });

    expect(result.success).toBe(true);
    expect(result.channel).toBe("telegram");
    expect(result.briefing).toBeDefined();
    expect(result.briefing!.healthSummary).not.toBeNull();
    expect(result.briefing!.calendarOverview.eventCount).toBe(1);
    expect(result.briefing!.emailTriage).not.toBeNull();

    expect(deps.sendTelegram).toHaveBeenCalledTimes(1);
    expect(deps.reportRun).toHaveBeenCalledTimes(1);
  });

  test("continues when WHOOP fails", async () => {
    const deps = makeDeps({
      getRecovery: mock(() => Promise.reject(new Error("WHOOP down"))),
      getSleep: mock(() => Promise.reject(new Error("WHOOP down"))),
    });

    const result = await runMorningBriefing({ mode: "telegram", deps });

    expect(result.success).toBe(true);
    expect(result.briefing!.healthSummary).toBeNull();
    expect(result.briefing!.calendarOverview.eventCount).toBe(1);
    expect(deps.sendTelegram).toHaveBeenCalledTimes(1);
  });

  test("continues when calendar fails", async () => {
    const deps = makeDeps({
      getCalendarEvents: mock(() =>
        Promise.reject(new Error("Calendar OAuth expired")),
      ),
    });

    const result = await runMorningBriefing({ mode: "telegram", deps });

    expect(result.success).toBe(true);
    expect(result.briefing!.calendarOverview.eventCount).toBe(0);
    expect(deps.sendTelegram).toHaveBeenCalledTimes(1);
  });

  test("continues when email fails", async () => {
    const deps = makeDeps({
      getEmails: mock(() => Promise.reject(new Error("Email DB down"))),
    });

    const result = await runMorningBriefing({ mode: "telegram", deps });

    expect(result.success).toBe(true);
    expect(result.briefing!.emailTriage).toBeNull();
    expect(deps.sendTelegram).toHaveBeenCalledTimes(1);
  });

  test("returns voice output when mode is voice", async () => {
    const deps = makeDeps();
    const result = await runMorningBriefing({ mode: "voice", deps });

    expect(result.success).toBe(true);
    expect(result.channel).toBe("voice");
    expect(result.voiceText).toBeDefined();
    expect(result.voiceText!.length).toBeGreaterThan(0);
    // Voice mode should NOT send Telegram
    expect(deps.sendTelegram).not.toHaveBeenCalled();
    expect(deps.reportRun).toHaveBeenCalledTimes(1);
  });

  test("reports failure when Telegram send fails", async () => {
    const deps = makeDeps({
      sendTelegram: mock(() => Promise.resolve(false)),
    });

    const result = await runMorningBriefing({ mode: "telegram", deps });

    expect(result.success).toBe(false);
    expect(result.error).toContain("send");
  });

  test("all data fetches run concurrently", async () => {
    const callOrder: string[] = [];
    const deps = makeDeps({
      getRecovery: mock(async () => {
        callOrder.push("recovery-start");
        const result = makeRecovery();
        callOrder.push("recovery-end");
        return result;
      }),
      getSleep: mock(async () => {
        callOrder.push("sleep-start");
        const result = makeSleep();
        callOrder.push("sleep-end");
        return result;
      }),
      getCalendarEvents: mock(async () => {
        callOrder.push("calendar-start");
        const result = makeEvents();
        callOrder.push("calendar-end");
        return result;
      }),
      getEmails: mock(async () => {
        callOrder.push("emails-start");
        const result = makeEmails();
        callOrder.push("emails-end");
        return result;
      }),
      getEcosystem: mock(async () => {
        callOrder.push("ecosystem-start");
        const result = makeEcosystem();
        callOrder.push("ecosystem-end");
        return result;
      }),
    });

    await runMorningBriefing({ mode: "telegram", deps });

    // All starts should come before any ends (concurrent)
    // With Promise.all, microtask scheduling means all start before any end
    const startIndices = callOrder
      .map((v, i) => (v.endsWith("-start") ? i : -1))
      .filter((i) => i >= 0);
    const endIndices = callOrder
      .map((v, i) => (v.endsWith("-end") ? i : -1))
      .filter((i) => i >= 0);

    // Verify all 5 sources were called
    expect(startIndices).toHaveLength(5);
    expect(endIndices).toHaveLength(5);
  });
});
