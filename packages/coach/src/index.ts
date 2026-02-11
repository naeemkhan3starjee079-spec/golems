/**
 * CoachGolem — life planner, status aggregator, gentle nudger.
 *
 * Reads state from other golems, integrates with Google Calendar,
 * and helps plan the day/week. Does NOT invoke other golems.
 */

import type { GolemStatus } from "@golems/shared/lib/shared-types";
import { getTodayEvents } from "./calendar-client";
import { generateDailyPlan } from "./schedule-engine";
import { getEcosystemStatus, registerAllGolems, getPendingWork } from "./status-aggregator";
import { sendMorningNudge } from "./nudger";
import { recordDay, getWeeklySummary } from "./tracker";
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

// Re-export types and submodules
export type { DailyPlan, TimeBlock } from "./schedule-engine";
export type { EcosystemStatus, PendingWorkItem } from "./status-aggregator";
export type { CalendarEvent } from "./calendar-client";
export { getEcosystemStatus } from "./status-aggregator";
export { getTodayEvents } from "./calendar-client";
export { generateDailyPlan, formatPlanForTelegram } from "./schedule-engine";
export { getWeeklySummary } from "./tracker";
