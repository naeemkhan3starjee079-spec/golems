/**
 * Bedtime Guardian
 *
 * Sends a Telegram wind-down reminder at the target bedtime.
 * Runs via launchd at the configured time (e.g., 2:30 AM).
 *
 * The idea: Claude tells you to stop coding, and you need to
 * justify yourself if you want to override it.
 */

import "./lib/load-env";
import { sendNotification } from "./lib/telegram-direct";
import { logEvent } from "./event-log";

const WIND_DOWN_MESSAGES = [
  "Time to wind down. Close the laptop, you'll thank yourself tomorrow.",
  "Hey. It's late. Whatever you're building can wait until tomorrow.",
  "Wind-down time. The code will still be there in the morning.",
  "Your future self wants you to go to sleep. Trust them.",
  "Bedtime. Step away from the terminal.",
];

function pickMessage(): string {
  return WIND_DOWN_MESSAGES[Math.floor(Math.random() * WIND_DOWN_MESSAGES.length)];
}

async function main() {
  const now = new Date();
  const hour = now.getHours();
  const timeStr = now.toLocaleTimeString("en-IL", { hour: "2-digit", minute: "2-digit", hour12: false });

  console.log(`[BedtimeGuardian] Running at ${timeStr}`);

  await sendNotification({
    title: "Bedtime Guardian",
    body: pickMessage(),
    source: "nightshift",
    priority: "high",
  });

  await logEvent("bedtime_reminder", {
    time: timeStr,
    hour,
  }, "bedtimeguardian");

  console.log("[BedtimeGuardian] Reminder sent.");
}

main().catch((err) => {
  console.error("[BedtimeGuardian] Error:", err);
  process.exit(1);
});
