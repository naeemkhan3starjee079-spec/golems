// EmailGolem Types

// Re-export GmailEmail from gmail-client for convenience
export type { GmailEmail } from "./gmail-client";

/**
 * Email categories for scoring
 */
export type EmailCategory =
  | "interview"       // Score 10 - immediate
  | "urgent"          // Score 10 - payment failed, action required
  | "job"             // Score 7-9 - job updates
  | "subscription"    // Score 5-6 - receipts, new subscriptions
  | "newsletter"      // Score 2 - ignore
  | "promo"           // Score 1 - ignore
  | "other";          // Score 3-4 - log only

/**
 * Scoring result from scorer.ts
 */
export interface ScoredEmail {
  email: import("./gmail-client").GmailEmail;
  score: number;          // 1-10
  category: EmailCategory;
  reasoning?: string;     // AI's explanation
}

export interface Email {
  id?: string;
  gmail_id: string;
  subject: string | null;
  from_address: string | null;
  snippet: string | null;
  score: number | null;
  category: string | null;
  received_at: Date | null;
  scored_at?: Date;
  notified: boolean;
}

export interface Subscription {
  id?: string;
  service_name: string;
  amount: number | null;
  currency: string;
  frequency: 'monthly' | 'yearly' | 'one-time' | null;
  status: 'active' | 'cancelled' | 'paused';
  first_seen?: Date;
  last_payment?: Date | null;
  created_at?: Date;
}

export interface Payment {
  id?: string;
  subscription_id: string | null;
  email_id: string | null;
  amount: number;
  currency: string;
  paid_at: Date;
  created_at?: Date;
}

export interface QueuedItem {
  table: string;
  data: any;
  timestamp: Date;
  id: string;
}

export interface SubscriptionSummary {
  totalMonthly: number;
  services: Array<{
    name: string;
    amount: number;
    currency: string;
    status: string;
  }>;
  newThisMonth: string[];
  cancelledThisMonth: string[];
}

export interface SafeResult {
  success: boolean;
  queued?: boolean;
  data?: any;
  error?: string;
}
