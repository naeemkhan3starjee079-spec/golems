/**
 * CoachGolem — life planner, status aggregator, gentle nudger.
 *
 * Reads state from other golems, integrates with Google Calendar,
 * and helps plan the day/week. Does NOT invoke other golems.
 */

import type { GolemStatus } from "@golems/shared/lib/shared-types";
import { getLatestRecovery, getLatestSleep } from "@golems/shared/whoop/client";
import { getTodayEvents } from "./calendar-client";
import { generateDailyPlan } from "./schedule-engine";
import { getEcosystemStatus, registerAllGolems, getPendingWork } from "./status-aggregator";
import { sendMorningNudge } from "./nudger";
import { recordDay, getWeeklySummary } from "./tracker";
import { loadProtocol } from "./protocol";
import { generateCoaching, type CoachingOutput } from "./coaching-engine";
import type { DailyPlan } from "./schedule-engine";

/** Initialize CoachGolem — register all golem status fetchers */
export async function init(): Promise<void> {
  await registerAllGolems();
}

/** Generate today's plan */
export async function planToday(): Promise<DailyPlan> {
  const [events, status] = await Promise.all([
    getTodayEvents(),
    getEcosystemStatus(),
  ]);

  return generateDailyPlan(events, status);
}

/** Run the morning nudge — generates plan + sends to Telegram */
export async function morningNudge(): Promise<DailyPlan> {
  const plan = await planToday();
  await sendMorningNudge(plan);
  return plan;
}

/** Get CoachGolem's own status */
export async function getStatus(): Promise<GolemStatus> {
  const status = await getEcosystemStatus();
  const pending = getPendingWork(status);

  return {
    name: "CoachGolem",
    healthy: true,
    lastRun: null,
    summary: `${status.golems.length} golems tracked, ${pending.length} pending items`,
    details: {
      golemsTracked: status.golems.length,
      healthyGolems: status.healthy,
      pendingItems: pending.length,
    },
  };
}

export interface HealthAwarePlan {
  plan: DailyPlan;
  coaching: CoachingOutput;
}

/** Generate today's plan with Whoop health data + LLM coaching */
export async function planTodayWithHealth(): Promise<HealthAwarePlan> {
  const [events, status, recovery, sleep] = await Promise.all([
    getTodayEvents().catch(() => []),
    getEcosystemStatus(),
    getLatestRecovery().catch(() => null),
    getLatestSleep().catch(() => null),
  ]);

  const protocol = loadProtocol();
  const pending = getPendingWork(status);
  const dayOfWeek = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Asia/Jerusalem",
  });

  const coaching = await generateCoaching({
    recovery,
    sleep,
    protocol,
    calendar: events,
    pending,
    dayOfWeek,
  });

  const plan = generateDailyPlan(events, status);

  return { plan, coaching };
}

// Re-export types and submodules
export type { DailyPlan, TimeBlock } from "./schedule-engine";
export type { EcosystemStatus, PendingWorkItem } from "./status-aggregator";
export type { CalendarEvent } from "./calendar-client";
export type { CoachingOutput } from "./coaching-engine";
export type { CoachProtocol } from "./protocol";
export { getEcosystemStatus } from "./status-aggregator";
export { getTodayEvents } from "./calendar-client";
export { generateDailyPlan, formatPlanForTelegram, formatHealthPlanForTelegram } from "./schedule-engine";
export { getWeeklySummary } from "./tracker";
export { generateCoaching } from "./coaching-engine";
export { loadProtocol, saveProtocol } from "./protocol";
