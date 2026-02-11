/**
 * TellerGolem Composer
 *
 * Telegram commands for financial reports and spending overview.
 * Extracted as part of the v6 Telegram overhaul.
 */

import { Composer } from "grammy";
import { generateMonthlyReport, generateTaxReport } from "./index";
import { formatMonthlyReportText, formatTaxReportText } from "./report";

export const tellerComposer = new Composer();

// /spending command - monthly spending summary
tellerComposer.command("spending", async (ctx) => {
  const arg = ctx.message?.text?.replace("/spending", "").trim();

  try {
    await ctx.replyWithChatAction("typing");

    if (arg === "tax") {
      const report = await generateTaxReport();
      const text = formatTaxReportText(report);
      await ctx.reply(`💰 *Tax Report*\n\n${text}`, { parse_mode: "Markdown" });
      return;
    }

    // Optional month argument (e.g., /spending 2026-01)
    const month = arg && /^\d{4}-\d{2}$/.test(arg) ? arg : undefined;
    const report = await generateMonthlyReport(month);
    const text = formatMonthlyReportText(report);
    await ctx.reply(`💰 *Spending Report*\n\n${text}`, { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply(`❌ Report failed: ${err instanceof Error ? err.message : String(err)}`);
  }
});
