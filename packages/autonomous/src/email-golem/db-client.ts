/**
 * EmailGolem DB Client
 *
 * Supabase wrapper with offline resilience.
 * All operations queue locally when offline and sync when reconnected.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Email, Subscription, Payment, QueuedItem, SubscriptionSummary, SafeResult } from './types';

// Offline queue path - in golems state directory
export const OFFLINE_QUEUE_PATH = process.env.HOME + '/.golems-zikaron/offline-queue.json';

/**
 * Create Supabase client with credentials from env or custom config
 */
export function createDbClient(config?: { url: string; key: string }): SupabaseClient {
  const url = config?.url || process.env.SUPABASE_URL;
  const key = config?.key || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
  }

  return createClient(url, key);
}

/**
 * Load the offline queue from disk
 */
export function loadLocalQueue(): QueuedItem[] {
  try {
    if (existsSync(OFFLINE_QUEUE_PATH)) {
      const content = readFileSync(OFFLINE_QUEUE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[db-client] Failed to load offline queue:', err);
  }
  return [];
}

/**
 * Save the offline queue to disk
 */
function saveLocalQueue(queue: QueuedItem[]): void {
  try {
    const dir = dirname(OFFLINE_QUEUE_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(OFFLINE_QUEUE_PATH, JSON.stringify(queue, null, 2));
  } catch (err) {
    console.error('[db-client] Failed to save offline queue:', err);
  }
}

/**
 * Append an item to the offline queue
 */
function appendToLocalQueue(item: Omit<QueuedItem, 'id'>): void {
  const queue = loadLocalQueue();
  const queuedItem: QueuedItem = {
    ...item,
    id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  };
  queue.push(queuedItem);
  saveLocalQueue(queue);
}

/**
 * Remove an item from the offline queue by ID
 */
function removeFromQueue(id: string): void {
  const queue = loadLocalQueue();
  const filtered = queue.filter(item => item.id !== id);
  saveLocalQueue(filtered);
}

/**
 * Clear the entire offline queue
 */
export function clearLocalQueue(): void {
  saveLocalQueue([]);
}

/**
 * Safe insert with offline queue fallback
 *
 * @param client - Supabase client
 * @param table - Table name
 * @param data - Data to insert
 * @returns Result with success/queued status
 */
export async function safeInsert(
  client: SupabaseClient,
  table: string,
  data: any
): Promise<SafeResult> {
  try {
    const { error, data: result } = await client.from(table).insert(data);

    if (error) {
      // Queue for later sync
      appendToLocalQueue({ table, data, timestamp: new Date() });
      console.log(`[db-client] Offline: Queued ${table} insert for later sync`);
      return { success: false, queued: true, error: error.message };
    }

    return { success: true, data: result };
  } catch (err: any) {
    // Network error - queue for later
    appendToLocalQueue({ table, data, timestamp: new Date() });
    console.log(`[db-client] Network error: Queued ${table} insert for later sync`);
    return { success: false, queued: true, error: err.message };
  }
}

/**
 * Safe upsert with offline queue fallback
 *
 * @param client - Supabase client
 * @param table - Table name
 * @param data - Data to upsert
 * @param conflictColumn - Column to check for conflicts
 * @returns Result with success/queued status
 */
export async function safeUpsert(
  client: SupabaseClient,
  table: string,
  data: any,
  conflictColumn: string
): Promise<SafeResult> {
  try {
    const { error, data: result } = await client
      .from(table)
      .upsert(data, { onConflict: conflictColumn });

    if (error) {
      appendToLocalQueue({ table, data, timestamp: new Date() });
      return { success: false, queued: true, error: error.message };
    }

    return { success: true, data: result };
  } catch (err: any) {
    appendToLocalQueue({ table, data, timestamp: new Date() });
    return { success: false, queued: true, error: err.message };
  }
}

/**
 * Sync offline queue items when back online
 *
 * @param client - Supabase client
 * @returns Sync results
 */
export async function syncOfflineQueue(
  client: SupabaseClient
): Promise<{ synced: number; failed: number }> {
  const queue = loadLocalQueue();
  let synced = 0;
  let failed = 0;

  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  console.log(`[db-client] Syncing ${queue.length} queued items...`);

  for (const item of queue) {
    try {
      const { error } = await client.from(item.table).insert(item.data);

      if (error) {
        console.error(`[db-client] Failed to sync item ${item.id}:`, error.message);
        failed++;
      } else {
        console.log(`[db-client] Synced item ${item.id} to ${item.table}`);
        removeFromQueue(item.id);
        synced++;
      }
    } catch (err) {
      console.error(`[db-client] Network error syncing item ${item.id}`);
      failed++;
    }
  }

  console.log(`[db-client] Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}

/**
 * Get subscription summary for monthly report
 *
 * @param client - Supabase client
 * @returns Subscription summary
 */
export async function getSubscriptionSummary(
  client: SupabaseClient
): Promise<SubscriptionSummary> {
  const emptyResult: SubscriptionSummary = {
    totalMonthly: 0,
    services: [],
    newThisMonth: [],
    cancelledThisMonth: []
  };

  // Get active subscriptions
  let subs: any[] = [];
  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('[db-client] Failed to get subscriptions:', error?.message);
      return emptyResult;
    }

    subs = data || [];
  } catch (err) {
    console.error('[db-client] Error fetching subscriptions:', err);
    return emptyResult;
  }

  // Calculate monthly total (convert yearly to monthly)
  let totalMonthly = 0;
  const services = subs.map((sub: any) => {
    let monthlyAmount = sub.amount || 0;

    if (sub.frequency === 'yearly') {
      monthlyAmount = monthlyAmount / 12;
    }

    totalMonthly += monthlyAmount;

    return {
      name: sub.service_name,
      amount: sub.amount,
      currency: sub.currency || 'USD',
      status: sub.status
    };
  });

  // Get new subscriptions this month (separate try/catch so main result still works)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let newThisMonth: string[] = [];
  try {
    const { data: newSubs } = await client
      .from('subscriptions')
      .select('service_name')
      .gte('first_seen', startOfMonth.toISOString());

    newThisMonth = (newSubs || []).map((s: any) => s.service_name);
  } catch (err) {
    // Ignore - optional data
  }

  // Get cancelled this month (separate try/catch)
  let cancelledThisMonth: string[] = [];
  try {
    const { data: cancelledSubs } = await client
      .from('subscriptions')
      .select('service_name')
      .eq('status', 'cancelled')
      .gte('created_at', startOfMonth.toISOString());

    cancelledThisMonth = (cancelledSubs || []).map((s: any) => s.service_name);
  } catch (err) {
    // Ignore - optional data
  }

  return {
    totalMonthly,
    services,
    newThisMonth,
    cancelledThisMonth
  };
}

/**
 * Get recent emails for briefing
 *
 * @param client - Supabase client
 * @param hours - How many hours back to look (default 24)
 * @param minScore - Minimum score to include (default 0)
 * @returns Array of emails
 */
export async function getRecentEmails(
  client: SupabaseClient,
  hours: number = 24,
  minScore: number = 0
): Promise<Email[]> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    let query = client
      .from('emails')
      .select('*')
      .gte('received_at', since.toISOString());

    if (minScore > 0) {
      query = query.gte('score', minScore);
    }

    const { data, error } = await query.order('score', { ascending: false });

    if (error || !data) {
      console.error('[db-client] Failed to get recent emails:', error?.message);
      return [];
    }

    return data as Email[];
  } catch (err) {
    console.error('[db-client] Error getting recent emails:', err);
    return [];
  }
}

/**
 * Save scored email to database
 */
export async function saveEmail(
  client: SupabaseClient,
  email: Email
): Promise<SafeResult> {
  return safeUpsert(client, 'emails', email, 'gmail_id');
}

/**
 * Track or update a subscription
 */
export async function trackSubscription(
  client: SupabaseClient,
  subscription: Subscription
): Promise<SafeResult> {
  return safeUpsert(client, 'subscriptions', subscription, 'service_name');
}

/**
 * Record a payment
 */
export async function recordPayment(
  client: SupabaseClient,
  payment: Payment
): Promise<SafeResult> {
  return safeInsert(client, 'payments', payment);
}

/**
 * Mark email as notified
 */
export async function markNotified(
  client: SupabaseClient,
  emailId: string
): Promise<SafeResult> {
  try {
    const { error } = await client
      .from('emails')
      .update({ notified: true })
      .eq('id', emailId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get emails that need notification (score >= 10, not yet notified)
 */
export async function getUnnotifiedUrgentEmails(
  client: SupabaseClient
): Promise<Email[]> {
  try {
    const { data, error } = await client
      .from('emails')
      .select('*')
      .gte('score', 10)
      .eq('notified', false)
      .order('received_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data as Email[];
  } catch (err) {
    return [];
  }
}

// Default export for convenience
export default {
  createDbClient,
  safeInsert,
  safeUpsert,
  syncOfflineQueue,
  getSubscriptionSummary,
  getRecentEmails,
  saveEmail,
  trackSubscription,
  recordPayment,
  markNotified,
  getUnnotifiedUrgentEmails,
  loadLocalQueue,
  clearLocalQueue
};
