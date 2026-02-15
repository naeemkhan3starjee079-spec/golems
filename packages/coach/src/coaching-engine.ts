/**
 * LLM Coaching Engine
 *
 * Synthesizes Whoop data + protocol + calendar into personalized coaching advice.
 * Uses Gemini Flash-Lite (free) via @golems/shared.
 */

import { runCloudFree } from "@golems/shared/lib/vercel-llm";
import type {
  WhoopRecovery,
  WhoopSleep,
  RecoveryColor,
} from "@golems/shared/whoop/types";
import { getRecoveryColor } from "@golems/shared/whoop/types";
import type { CoachProtocol } from "./protocol";
import type { CalendarEvent } from "./calendar-client";
import type { PendingWorkItem } from "./status-aggregator";

export interface CoachingInput {
  recovery: WhoopRecovery | null;
  sleep: WhoopSleep | null;
  protocol: CoachProtocol;
  calendar: CalendarEvent[];
  pending: PendingWorkItem[];
  dayOfWeek: string;
}

export interface CoachingOutput {
  advice: string;
  workout: { type: string; duration: string; notes: string };
  hubermanReminders: string[];
  healthSnapshot: {
    recovery: number;
    recoveryColor: RecoveryColor;
    sleepHours: number;
    sleepPerformance: number;
    hrvRmssd: number;
  };
}

function msToHours(ms: number): number {
  return Math.round((ms / 3_600_000) * 10) / 10;
}

function computeHubermanReminders(
  protocol: CoachProtocol,
  wakeTime: string,
): string[] {
  const reminders: string[] = [];
  const [wakeH, wakeM] = wakeTime.split(":").map(Number);
  const wakeMinutes = wakeH * 60 + wakeM;

  // Caffeine delay
  const coffeeMinutes =
    wakeMinutes + protocol.huberman.caffeineDelay.minutesAfterWake;
  const coffeeH = Math.floor(coffeeMinutes / 60) % 24;
  const coffeeM = coffeeMinutes % 60;
  reminders.push(
    `Coffee OK after ${String(coffeeH).padStart(2, "0")}:${String(coffeeM).padStart(2, "0")}`,
  );

  // NSDR
  reminders.push(`NSDR: 10min at ${protocol.huberman.nsdr.idealTime}`);

  // Afternoon light
  reminders.push(
    `Sunlight: 10min at ${protocol.huberman.afternoonLight.idealTime}`,
  );

  // Last caffeine
  const [bedH, bedM] = protocol.sleep.targetBed.split(":").map(Number);
  const bedMinutes = (bedH < 12 ? bedH + 24 : bedH) * 60 + bedM;
  const lastCafMinutes =
    bedMinutes - protocol.huberman.lastCaffeine.hoursBeforeBed * 60;
  const lcH = Math.floor(lastCafMinutes / 60) % 24;
  const lcM = lastCafMinutes % 60;
  reminders.push(
    `Last caffeine by ${String(lcH).padStart(2, "0")}:${String(lcM).padStart(2, "0")}`,
  );

  // Supplements
  for (const supp of protocol.huberman.supplements.preSleep) {
    const suppMinutes = bedMinutes - supp.minutesBeforeBed;
    const sH = Math.floor(suppMinutes / 60) % 24;
    const sM = suppMinutes % 60;
    reminders.push(
      `${supp.name} (${supp.dose}) at ${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`,
    );
  }

  // Coding stop
  reminders.push(`Hard coding stop: ${protocol.sleep.hardCodingStop}`);

  return reminders;
}

function pickWorkout(
  recoveryColor: RecoveryColor,
  protocol: CoachProtocol,
  dayOfWeek: string,
): { type: string; duration: string; notes: string } {
  const injuries = protocol.body.injuries
    .map((i) => `${i.area}: avoid ${i.avoidMovements.join(", ")}`)
    .join(". ");

  if (recoveryColor === "red") {
    return {
      type: "walk + stretching",
      duration: "20-30 min",
      notes: `Recovery day. Light walk only. ${injuries}`,
    };
  }

  if (recoveryColor === "yellow") {
    return {
      type: "walk + light bodyweight",
      duration: "30-40 min",
      notes: `Moderate day. Easy movement. ${injuries}`,
    };
  }

  // Green -- alternate run/strength based on day
  const isRunDay = ["Sunday", "Monday", "Wednesday", "Friday"].includes(
    dayOfWeek,
  );
  if (isRunDay) {
    return {
      type: "walk + easy run",
      duration: "40-45 min",
      notes: `Green day! 10min walk + 20-25min easy jog. ${injuries}`,
    };
  }

  return {
    type: "walk + bodyweight strength",
    duration: "35-40 min",
    notes: `Green day! 10min walk + squats, lunges, glute bridges, dead bugs. ${injuries}`,
  };
}

/** Generate rule-based fallback (no LLM needed) */
function generateFallbackAdvice(
  input: CoachingInput,
  healthSnapshot: CoachingOutput["healthSnapshot"],
): string {
  const color = healthSnapshot.recoveryColor;
  const sleepH = healthSnapshot.sleepHours;

  if (color === "red") {
    return `Recovery ${healthSnapshot.recovery}% (red). Take it easy today -- walk only, shorter focus blocks. Get to bed on time tonight.`;
  }
  if (color === "yellow") {
    if (sleepH < 6) {
      return `Recovery ${healthSnapshot.recovery}% (yellow), only ${sleepH}h sleep. Light day -- moderate workout, keep coding stop strict at ${input.protocol.sleep.hardCodingStop}.`;
    }
    return `Recovery ${healthSnapshot.recovery}% (yellow). Normal day -- moderate effort. Interview prep: ${input.protocol.career.interviewPrepRotation[input.dayOfWeek] || "flex day"}.`;
  }
  return `Recovery ${healthSnapshot.recovery}% (green)! Push day. Go for a run, deep work marathon, knock out applications. You've got the energy.`;
}

/** Generate coaching advice using LLM */
export async function generateCoaching(
  input: CoachingInput,
): Promise<CoachingOutput> {
  const recovery = input.recovery;
  const sleep = input.sleep;
  const recoveryScore =
    recovery?.scoreState === "SCORED" ? recovery.score : 50;
  const recoveryColor = getRecoveryColor(recoveryScore);
  const sleepHours = sleep ? msToHours(sleep.durationMs) : 0;
  const sleepPerf = sleep?.sleepPerformance ?? 0;
  const hrv = recovery?.hrvRmssd ?? 0;

  const healthSnapshot: CoachingOutput["healthSnapshot"] = {
    recovery: recoveryScore,
    recoveryColor,
    sleepHours,
    sleepPerformance: sleepPerf,
    hrvRmssd: hrv,
  };

  const workout = pickWorkout(recoveryColor, input.protocol, input.dayOfWeek);
  const hubermanReminders = computeHubermanReminders(
    input.protocol,
    input.protocol.sleep.targetWake,
  );

  // Try LLM for natural coaching advice
  let advice: string;
  try {
    const prompt = buildCoachingPrompt(input, healthSnapshot, workout);
    const llmResult = await runCloudFree(prompt, "coach");
    advice = llmResult || generateFallbackAdvice(input, healthSnapshot);
  } catch {
    advice = generateFallbackAdvice(input, healthSnapshot);
  }

  return { advice, workout, hubermanReminders, healthSnapshot };
}

function buildCoachingPrompt(
  input: CoachingInput,
  health: CoachingOutput["healthSnapshot"],
  workout: CoachingOutput["workout"],
): string {
  const p = input.protocol;
  const meetings =
    input.calendar
      .filter((e) => !e.allDay)
      .map(
        (e) =>
          `${e.summary} (${e.start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })})`,
      )
      .join(", ") || "none";
  const pendingStr =
    input.pending
      .slice(0, 5)
      .map((w) => `[${w.priority}] ${w.item}`)
      .join("; ") || "none";

  const interviewFocus =
    p.career.interviewPrepRotation[input.dayOfWeek] || "flex day";
  const isShabbat =
    input.dayOfWeek === "Friday" || input.dayOfWeek === "Saturday";

  return `You are a personal coach for a software developer. Be direct, casual, no fluff. Under 120 words.

HEALTH:
- Recovery: ${health.recovery}% (${health.recoveryColor}) | HRV: ${health.hrvRmssd.toFixed(0)}ms
- Sleep: ${health.sleepHours}h (${health.sleepPerformance}% quality)

CONTEXT:
- Day: ${input.dayOfWeek}${isShabbat ? " (Shabbat)" : ""}
- Injuries: left shoulder tear (no heavy pressing/overhead)
- Career: active job search, interview prep focus today: ${interviewFocus}
- Sleep target: bed ${p.sleep.targetBed}, wake ${p.sleep.targetWake}
- Coding stop: ${p.sleep.hardCodingStop}
- Meetings: ${meetings}
- Pending golem tasks: ${pendingStr}

WORKOUT PLAN: ${workout.type} (${workout.duration})

Generate a brief, personalized daily coaching message. Include:
1. How to use today's energy based on recovery color
2. One specific tip about sleep/recovery/focus
3. If anything needs adjusting based on the data

Keep it motivating but real. No generic advice.`;
}
