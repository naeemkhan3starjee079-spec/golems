#!/usr/bin/env bun
/**
 * Email Golem - Scorer
 *
 * Uses Ollama to score emails for urgency and categorize them.
 * Handles subscription/payment tracking.
 *
 * Score ranges:
 * - 10: IMMEDIATE (interview, payment failed, urgent deadline)
 * - 7-9: BRIEFING (job updates, important but not urgent)
 * - 5-6: TRACK (subscription receipts, for monthly digest)
 * - 1-4: IGNORE (newsletters, promos, spam)
 */

import { runOllamaJSON } from "../ollama-wrapper";

// Types
export interface EmailInput {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: string;
}

export interface SubscriptionInfo {
  serviceName: string;
  amount: number | null;
  frequency: "monthly" | "yearly" | "one-time" | "unknown";
}

export interface ScoredEmail {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: string;
  score: number;
  category: string;
  reason: string;
  subscription: SubscriptionInfo | null;
  scoredAt: string;
}

interface OllamaScoreResult {
  score: number;
  category: string;
  reason: string;
  subscription: SubscriptionInfo | null;
}

// Score thresholds
export const SCORE_THRESHOLDS = {
  IMMEDIATE: 10,
  BRIEFING_MIN: 7,
  TRACK_MIN: 5,
  IGNORE_MAX: 4,
} as const;

// Known subscription services for quick extraction
const KNOWN_SERVICES: Record<string, string> = {
  "netflix.com": "Netflix",
  "spotify.com": "Spotify",
  "apple.com": "Apple",
  "email.apple.com": "Apple",
  "google.com": "Google",
  "microsoft.com": "Microsoft",
  "adobe.com": "Adobe",
  "github.com": "GitHub",
  "dropbox.com": "Dropbox",
  "icloud.com": "iCloud",
  "anthropic.com": "Claude Pro",
  "openai.com": "ChatGPT Plus",
};

/**
 * Extract subscription info from email using regex patterns
 * (Quick heuristic before/instead of Ollama)
 */
export function extractSubscriptionInfo(
  subject: string,
  snippet: string,
  from: string
): SubscriptionInfo | null {
  const text = `${subject} ${snippet}`.toLowerCase();

  // Check if this looks like a subscription/payment email
  const subscriptionKeywords = [
    "receipt",
    "invoice",
    "payment",
    "charged",
    "subscription",
    "renewed",
    "billing",
    "your plan",
  ];

  const isSubscriptionEmail = subscriptionKeywords.some((kw) => text.includes(kw));
  if (!isSubscriptionEmail) return null;

  // Extract service name
  let serviceName = "Unknown";
  const fromDomain = from.split("@")[1]?.toLowerCase() || "";

  for (const [domain, name] of Object.entries(KNOWN_SERVICES)) {
    if (fromDomain.includes(domain)) {
      serviceName = name;
      break;
    }
  }

  // If not in known services, try to extract from subject
  if (serviceName === "Unknown") {
    const subjectMatch = subject.match(/^(your\s+)?(\w+)\s+(receipt|invoice|subscription|payment)/i);
    if (subjectMatch) {
      serviceName = subjectMatch[2];
    }
  }

  // Extract amount
  let amount: number | null = null;
  const amountMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);
  }

  // Determine frequency
  let frequency: SubscriptionInfo["frequency"] = "unknown";
  if (text.includes("monthly") || text.includes("month")) {
    frequency = "monthly";
  } else if (text.includes("yearly") || text.includes("annual") || text.includes("year")) {
    frequency = "yearly";
  } else if (text.includes("one-time") || text.includes("one time")) {
    frequency = "one-time";
  }

  return { serviceName, amount, frequency };
}

/**
 * Build the scoring prompt for Ollama
 */
function buildScoringPrompt(email: EmailInput): string {
  return `You are an email triage assistant. Score this email for urgency and categorize it.

EMAIL:
- Subject: ${email.subject}
- From: ${email.from}
- Preview: ${email.snippet}
- Received: ${email.receivedAt}

SCORING CRITERIA:
- Score 10 (IMMEDIATE ALERT):
  * Interview invites/scheduled
  * "Payment due", "action required", "expires today"
  * Payment FAILED / card declined
  * Direct message needing urgent reply
  * Offer letters, contracts to sign

- Score 7-9 (Include in daily briefing):
  * Job application status updates
  * Recruiter viewed profile
  * Important but not time-sensitive

- Score 5-6 (Track for monthly report):
  * Subscription payment receipts
  * Successful recurring payments
  * New subscription confirmations

- Score 3-4 (Log only):
  * Job alert digests ("15 jobs match")
  * Rejection emails
  * Automated confirmations

- Score 1-2 (Ignore):
  * Newsletters
  * Promos/marketing
  * Social notifications
  * Spam

CATEGORIES: interview, urgent, job, subscription, newsletter, promo, social, other

For subscription emails, also extract:
- serviceName: Name of the service (Netflix, Spotify, etc.)
- amount: Dollar amount if mentioned
- frequency: monthly, yearly, one-time, or unknown

Respond with ONLY a JSON object:
{"score": 1-10, "category": "string", "reason": "brief explanation", "subscription": {"serviceName": "...", "amount": 15.99, "frequency": "monthly"} or null}`;
}

/**
 * Score a single email using Ollama
 */
export async function scoreEmail(email: EmailInput): Promise<ScoredEmail> {
  const prompt = buildScoringPrompt(email);

  const result = await runOllamaJSON<OllamaScoreResult>(prompt, "email-golem");

  if (result) {
    // Try to extract subscription info locally if Ollama didn't
    let subscription = result.subscription;
    if (!subscription && result.category === "subscription") {
      subscription = extractSubscriptionInfo(email.subject, email.snippet, email.from);
    }

    return {
      ...email,
      score: result.score ?? 5,
      category: result.category ?? "unknown",
      reason: result.reason ?? "No reason provided",
      subscription,
      scoredAt: new Date().toISOString(),
    };
  }

  // Fallback when Ollama fails
  const localSubscription = extractSubscriptionInfo(email.subject, email.snippet, email.from);

  return {
    ...email,
    score: 5,
    category: localSubscription ? "subscription" : "unknown",
    reason: "Scoring unavailable - Ollama failed",
    subscription: localSubscription,
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Score multiple emails with optional filtering
 */
export async function scoreEmails(
  emails: EmailInput[],
  options: { minScore?: number; delayMs?: number } = {}
): Promise<ScoredEmail[]> {
  const { minScore = 0, delayMs = 500 } = options;

  console.log(`[Scorer] Scoring ${emails.length} emails with Ollama...`);

  const results: ScoredEmail[] = [];

  for (const email of emails) {
    console.log(`  • Scoring: ${email.subject.slice(0, 50)}...`);
    const result = await scoreEmail(email);
    results.push(result);

    // Rate limit Ollama calls
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  // Filter by minimum score if specified
  const filtered = minScore > 0 ? results.filter((r) => r.score >= minScore) : results;

  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);

  console.log(
    `[Scorer] ${filtered.length}/${emails.length} emails scored ${minScore > 0 ? `${minScore}+` : ""}`
  );

  return filtered;
}

/**
 * Check if an email should trigger immediate notification
 */
export function shouldNotifyImmediately(scoredEmail: ScoredEmail): boolean {
  return scoredEmail.score >= SCORE_THRESHOLDS.IMMEDIATE;
}

/**
 * Check if an email should be included in daily briefing
 */
export function shouldIncludeInBriefing(scoredEmail: ScoredEmail): boolean {
  return scoredEmail.score >= SCORE_THRESHOLDS.BRIEFING_MIN;
}

/**
 * Check if an email should be tracked for monthly subscription report
 */
export function shouldTrackSubscription(scoredEmail: ScoredEmail): boolean {
  return (
    scoredEmail.category === "subscription" &&
    scoredEmail.score >= SCORE_THRESHOLDS.TRACK_MIN &&
    scoredEmail.subscription !== null
  );
}

// CLI for testing
if (import.meta.main) {
  console.log("📧 Email Golem Scorer Test\n");

  const testEmail: EmailInput = {
    id: "test-1",
    subject: "Interview Scheduled: Senior SWE at Microsoft",
    from: "recruiting@microsoft.com",
    snippet: "Please use this link to schedule your technical interview...",
    receivedAt: new Date().toISOString(),
  };

  const result = await scoreEmail(testEmail);
  console.log(`\nScore: ${result.score}/10`);
  console.log(`Category: ${result.category}`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Subscription: ${JSON.stringify(result.subscription)}`);
  console.log(`Should notify: ${shouldNotifyImmediately(result)}`);
}
