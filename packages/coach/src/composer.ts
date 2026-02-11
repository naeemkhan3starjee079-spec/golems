/**
 * CoachGolem Composer
 *
 * Telegram commands for daily planning and ecosystem overview.
 * Extracted as part of the v6 Telegram overhaul.
 */

import { Composer } from "grammy";
import { planToday } from "./index";
import { formatPlanForTelegram } from "./schedule-engine";
import { getEcosystemStatus } from "./status-aggregator";

export const coachComposer = new Composer();

// /plan command - show today's plan
coachComposer.command("plan", async (ctx) => {
  try {
    await ctx.replyWithChatAction("typing");
    const plan = await planToday();
    const text = formatPlanForTelegram(plan);
    await ctx.reply(`📋 *Today's Plan*\n\n${text}`, { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply(`❌ Plan failed: ${err instanceof Error ? err.message : String(err)}`);
  }
});

// /golems command - all golem statuses
coachComposer.command("golems", async (ctx) => {
  try {
    await ctx.replyWithChatAction("typing");
    const status = await getEcosystemStatus();

    let msg = `🤖 *Golem Ecosystem*\n\n`;
    msg += `Healthy: ${status.healthy}/${status.golems.length}\n\n`;

    for (const golem of status.golems) {
      const icon = golem.healthy ? "✅" : "❌";
      msg += `${icon} *${golem.name}*\n`;
      msg += `  ${golem.summary}\n`;
      if (golem.lastRun) {
        const ago = Math.round((Date.now() - new Date(golem.lastRun).getTime()) / 60000);
        const agoStr = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
        msg += `  Last run: ${agoStr}\n`;
      }
      msg += "\n";
    }

    await ctx.reply(msg, { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply(`❌ Status check failed: ${err instanceof Error ? err.message : String(err)}`);
  }
});
