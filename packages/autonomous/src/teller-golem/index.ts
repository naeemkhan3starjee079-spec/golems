#!/usr/bin/env bun
/**
 * TellerGolem - Financial domain expert
 *
 * Processes subscription emails routed from email-golem, categorizes expenses
 * for tax purposes (IRS Schedule C), detects payment failures, and generates
 * financial reports.
 *
 * Called from email-golem router when category="subscription"
 * CLI: bun run src/teller-golem/index.ts --report [--month YYYY-MM] [--tax --year YYYY]
 */

import "../lib/load-env";
import { createDbClient, recordPayment, trackSubscription } from "../email-golem/db-client";
import { logEvent } from "../event-log";
import { categorizeExpense } from "./categorizer";
import { detectPaymentFailure, sendPaymentAlert } from "./alerts";
import type { ScoredEmail, MonthlyReport, TaxReport } from "./types";
import type { ScoredEmail as EmailGolemScoredEmail } from "../email-golem/types";

/**
 * Generate a monthly financial report
 *
 * @param month - Month in YYYY-MM format (defaults to current month)
 * @returns Monthly report data
 */
export async function generateMonthlyReport(
  month?: string
): Promise<MonthlyReport> {
  const reportMonth = month || new Date().toISOString().slice(0, 7);

  // In a real implementation, this would query the database
  // For now, return a stub
  return {
    month: reportMonth,
    totalSpend: 0,
    byCategory: {},
    byVendor: {},
    subscriptionCount: 0,
  };
}

/**
 * Generate a tax report for a year
 *
 * @param year - Year for report (defaults to current year)
 * @returns Tax report data
 */
export async function generateTaxReport(year?: number): Promise<TaxReport> {
  const reportYear = year || new Date().getFullYear();

  // In a real implementation, this would query the database
  // For now, return a stub
  return {
    year: reportYear,
    totalDeductible: 0,
    byCategory: {
      advertising: { total: 0, items: [] },
      insurance: { total: 0, items: [] },
      office: { total: 0, items: [] },
      software: { total: 0, items: [] },
      education: { total: 0, items: [] },
      travel: { total: 0, items: [] },
      meals: { total: 0, items: [] },
      "professional-services": { total: 0, items: [] },
      other: { total: 0, items: [] },
    },
  };
}

/**
 * Format monthly report as text
 *
 * @param report - The monthly report to format
 * @returns Formatted text
 */
export function formatMonthlyReportText(report: MonthlyReport): string {
  let output = `\n📊 Monthly Financial Report: ${report.month}\n`;
  output += `${"=".repeat(50)}\n\n`;
  output += `Total Spent: $${report.totalSpend.toFixed(2)}\n`;
  output += `Active Subscriptions: ${report.subscriptionCount}\n\n`;

  if (Object.keys(report.byCategory).length > 0) {
    output += "By IRS Category:\n";
    for (const [category, amount] of Object.entries(report.byCategory)) {
      if (amount > 0) {
        output += `  ${category}: $${amount.toFixed(2)}\n`;
      }
    }
    output += "\n";
  }

  if (Object.keys(report.byVendor).length > 0) {
    output += "By Vendor:\n";
    const vendors = Object.entries(report.byVendor).sort(
      ([, a], [, b]) => b - a
    );
    vendors.slice(0, 10).forEach(([vendor, amount]) => {
      output += `  ${vendor}: $${amount.toFixed(2)}\n`;
    });
  }

  output += `${"=".repeat(50)}\n`;
  return output;
}

/**
 * Format tax report as text
 *
 * @param report - The tax report to format
 * @returns Formatted text
 */
export function formatTaxReportText(report: TaxReport): string {
  let output = `\n💰 Tax Deduction Report (Schedule C): ${report.year}\n`;
  output += `${"=".repeat(50)}\n\n`;
  output += `Total Deductible Expenses: $${report.totalDeductible.toFixed(2)}\n\n`;

  output += "By IRS Category:\n";
  for (const [category, data] of Object.entries(report.byCategory)) {
    if (data.total > 0) {
      output += `  ${category}: $${data.total.toFixed(2)}\n`;
      if (data.items.length > 0) {
        data.items.slice(0, 3).forEach(({ vendor, amount }) => {
          output += `    - ${vendor}: $${amount.toFixed(2)}\n`;
        });
        if (data.items.length > 3) {
          output += `    ... and ${data.items.length - 3} more\n`;
        }
      }
    }
  }

  output += `${"=".repeat(50)}\n`;
  return output;
}

/**
 * Process a subscription email routed from EmailGolem
 *
 * Handles:
 * 1. Payment failure detection and alerting
 * 2. Expense categorization into IRS Schedule C categories
 * 3. Payment recording
 * 4. Subscription tracking
 * 5. Event logging
 *
 * @param emailGolemEmail - The scored email from email-golem router
 */
export async function processSubscriptionEmail(
  emailGolemEmail: EmailGolemScoredEmail
): Promise<void> {
  const db = createDbClient();

  // Convert email-golem ScoredEmail to teller-golem ScoredEmail format
  const email: ScoredEmail = {
    id: emailGolemEmail.email.id,
    from: emailGolemEmail.email.from,
    subject: emailGolemEmail.email.subject,
    snippet: emailGolemEmail.email.snippet,
    category: emailGolemEmail.category,
    score: emailGolemEmail.score,
    receivedAt: new Date(emailGolemEmail.email.internalDate || Date.now()).toISOString(),
  };

  // 1. Check for payment failures first (high priority)
  const failure = await detectPaymentFailure(email);
  if (failure) {
    await sendPaymentAlert(failure);
    return; // Don't categorize payment failures as expenses
  }

  // 2. Categorize the expense into IRS Schedule C category
  const expense = await categorizeExpense(email);

  // 3. Record payment if amount detected
  if (expense.amount) {
    const result = await recordPayment(db, {
      subscription_id: null,
      email_id: emailGolemEmail.email.id,
      amount: expense.amount,
      currency: "USD",
      paid_at: new Date(emailGolemEmail.email.internalDate || Date.now()),
    });

    if (!result.success && !result.queued) {
      console.error(
        `[teller-golem] Failed to record payment: ${result.error}`
      );
    }
  }

  // 4. Track subscription
  if (expense.vendor) {
    const result = await trackSubscription(db, {
      service_name: expense.vendor,
      amount: expense.amount || 0,
      currency: "USD",
      frequency: "monthly",
      status: "active",
      first_seen: new Date(emailGolemEmail.email.internalDate || Date.now()),
    });

    if (!result.success && !result.queued) {
      console.error(
        `[teller-golem] Failed to track subscription: ${result.error}`
      );
    }
  }

  // 5. Log event
  await logEvent(
    "email_routed",
    {
      vendor: expense.vendor,
      category: expense.category,
      confidence: expense.confidence,
      amount: expense.amount,
      emailId: emailGolemEmail.email.id,
      subject: emailGolemEmail.email.subject,
    },
    "tellergolem"
  );

  console.log(
    `[teller-golem] Processed: ${expense.vendor} (${expense.category}${expense.amount ? ` - $${expense.amount.toFixed(2)}` : ""})`
  );
}

// CLI mode
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes("--report")) {
    const monthIdx = args.indexOf("--month");
    const yearIdx = args.indexOf("--year");
    const isTax = args.includes("--tax");

    if (isTax) {
      const year = yearIdx >= 0 ? parseInt(args[yearIdx + 1]) : undefined;
      generateTaxReport(year)
        .then((report) => {
          console.log(formatTaxReportText(report));
        })
        .catch((err) => {
          console.error("Failed to generate tax report:", err);
          process.exit(1);
        });
    } else {
      const month = monthIdx >= 0 ? args[monthIdx + 1] : undefined;
      generateMonthlyReport(month)
        .then((report) => {
          console.log(formatMonthlyReportText(report));
        })
        .catch((err) => {
          console.error("Failed to generate monthly report:", err);
          process.exit(1);
        });
    }
  } else {
    console.log("TellerGolem - Financial Domain Expert\n");
    console.log("Usage:");
    console.log(
      "  bun run src/teller-golem/index.ts --report [--month YYYY-MM]"
    );
    console.log(
      "  bun run src/teller-golem/index.ts --report --tax [--year YYYY]"
    );
    console.log("\nExamples:");
    console.log("  bun run src/teller-golem/index.ts --report");
    console.log("  bun run src/teller-golem/index.ts --report --month 2026-02");
    console.log("  bun run src/teller-golem/index.ts --report --tax");
    console.log("  bun run src/teller-golem/index.ts --report --tax --year 2025");
  }
}
