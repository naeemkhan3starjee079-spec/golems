import { createClient } from "./client";
import type { TokenStats } from "../types/tokens";

// --- Ops ---

export async function fetchRecentEvents(limit = 30) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("golem_events")
    .select("actor, type, data, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchServiceRuns(limit = 15, sinceDays?: number) {
  const supabase = createClient();
  let query = supabase
    .from("service_runs")
    .select("service, started_at, ended_at, duration_ms, status, error")
    .order("started_at", { ascending: false });
  if (sinceDays) {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    query = query.gte("started_at", since.toISOString());
  }
  if (!sinceDays) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchServiceHeartbeats() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_heartbeats")
    .select("service, status, metadata, checked_at")
    .order("checked_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// --- Tokens ---

export async function fetchTokenStats(days: number) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_token_stats", { p_days: days });
  if (error) throw error;
  return data as TokenStats;
}

// --- Night Shift ---

export async function fetchGolemState() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("golem_state")
    .select("key, value, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchNightShiftEvents(limit = 50) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("golem_events")
    .select("id, actor, type, data, created_at")
    .eq("actor", "nightshift")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// --- Notifications ---

const NOTIFICATION_TYPES = [
  "job_match", "job_applied",
  "email_routed", "email_urgent", "email_triaged",
  "telegram_message_in", "telegram_message_out", "golem_telegram_chat",
  "nightshift_started", "nightshift_completed", "nightshift_pr",
  "briefing_sent", "alert",
  "service_error", "service_recovered",
  "draft_approved", "soltome_post",
  "pipeline_draft_ready", "pipeline_draft_rejected",
];

export async function fetchNotificationEvents(
  limit = 200,
  cursor?: { created_at: string; id: string },
  types?: string[],
) {
  const supabase = createClient();
  const filterTypes = types && types.length > 0 ? types : NOTIFICATION_TYPES;
  let query = supabase
    .from("golem_events")
    .select("id, actor, type, data, created_at")
    .in("type", filterTypes)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (cursor) {
    // Compound cursor: events older than cursor, OR same timestamp but earlier id
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// --- Enrichment ---

export async function fetchEnrichmentStats() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("enrichment_stats")
    .select("total_chunks, embedded, tagged, summarized, importance_scored, intent_classified, projects, by_intent, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;

  const total = data.total_chunks || 1;
  return {
    total_chunks: data.total_chunks,
    embeddings: { count: data.embedded, pct: Math.round(data.embedded * 100 / total * 10) / 10 },
    tags: { count: data.tagged, pct: Math.round(data.tagged * 100 / total * 10) / 10 },
    summaries: { count: data.summarized, pct: Math.round(data.summarized * 100 / total * 10) / 10 },
    importance: { count: data.importance_scored, pct: Math.round(data.importance_scored * 100 / total * 10) / 10 },
    intent: { count: data.intent_classified, pct: Math.round(data.intent_classified * 100 / total * 10) / 10 },
    projects: (data.projects as { project: string; chunks: number }[]) ?? [],
    by_intent: data.by_intent as Record<string, number>,
    updated_at: data.updated_at,
  };
}

// --- Backlog ---

export async function fetchBacklogItems(project?: string, planName?: string) {
  const supabase = createClient();
  let query = supabase
    .from("backlog_items")
    .select("id, project, title, description, status, priority, tags, created_by, created_at, updated_at, plan_name, phase")
    .order("updated_at", { ascending: false });

  if (project) {
    query = query.eq("project", project);
  }
  if (planName) {
    query = query.eq("plan_name", planName);
  }

  query = query.limit(500);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createBacklogItem(item: {
  title: string;
  project: string;
  priority: string;
  status?: string;
  plan_name?: string;
  phase?: string;
}) {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("backlog_items")
    .insert({ ...item, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBacklogItem(id: string, updates: Record<string, unknown>) {
  const supabase = createClient();
  const { error } = await supabase
    .from("backlog_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBacklogItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("backlog_items").delete().eq("id", id);
  if (error) throw error;
}

// --- Content / Pipeline ---

export async function fetchPipelineRuns(limit = 30) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pipeline_runs")
    .select("id, pipeline_id, idea, idea_type, success, duration_ms, quality_score, user_feedback, output_format, error, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPipelineStats() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_pipeline_stats");
  if (error) throw error;
  return data as {
    stats: Array<{
      pipeline_id: string;
      total_runs: number;
      successful_runs: number;
      success_rate: number;
      avg_quality: number | null;
      avg_duration_ms: number;
      top_idea_types: string[];
    }>;
    total_runs: number;
  };
}

// --- Jobs ---

export async function fetchJobs(limit = 100, status?: string, source?: string, search?: string) {
  const supabase = createClient();
  let query = supabase
    .from("golem_jobs")
    .select("id, title, company, location, url, source, status, match_score, tags, match_reasons, scraped_at, applied_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) {
    query = query.eq("status", status);
  }
  if (source) {
    query = query.eq("source", source);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchJobStats() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_job_stats");
  if (error) throw error;
  return data as {
    total: number;
    by_status: Record<string, number>;
    by_source: Record<string, number>;
    avg_score: number | null;
  };
}

export async function fetchScrapeActivity(limit = 30) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scrape_activity")
    .select("id, source, run_at, total_found, new_saved, duplicates_skipped, errors, duration_ms")
    .order("run_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// --- Emails ---

export async function fetchEmails(limit = 50, category?: string, search?: string) {
  const supabase = createClient();
  let query = supabase
    .from("emails")
    .select("id, subject, from_address, snippet, score, category, received_at, human_score, human_category")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (category) {
    query = query.or(`category.eq.${category},human_category.eq.${category}`);
  }
  if (search) {
    query = query.or(`subject.ilike.%${search}%,from_address.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchEmailStats() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_email_stats");
  if (error) throw error;
  return data as {
    total: number;
    by_category: Record<string, number>;
    last_24h: number;
    urgent: number;
  };
}

export async function fetchEmailSenders(limit = 50) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("email_senders")
    .select("email_address, display_name, domain, category, total_emails, avg_score, user_action, last_email_at")
    .order("total_emails", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// --- Recruiter ---

export async function fetchOutreachContacts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("outreach_contacts")
    .select("id, name, email, linkedin_url, company, role, source, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function fetchOutreachMessages() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("outreach_messages")
    .select("id, contact_id, message_type, status, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function fetchLinkedInStats() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_linkedin_stats");
  if (error) throw error;
  return data as {
    total: number;
    top_companies: Array<{ company: string; count: number }>;
    by_strength: Record<string, number>;
  };
}

// --- Teller ---

export async function fetchSubscriptions() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, service_name, amount, currency, frequency, status, first_seen, last_payment, created_at")
    .order("service_name")
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPayments(limit = 20) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, currency, paid_at, subscription_id")
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// --- Coach / Whoop ---

export async function fetchWhoopSnapshots(days = 7) {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("whoop_snapshots")
    .select("id, snapshot_date, recovery_score, recovery_state, hrv_rmssd, resting_heart_rate, spo2, skin_temp, sleep_duration_ms, sleep_quality_ms, rem_ms, deep_ms, light_ms, awake_ms, sleep_performance, sleep_consistency, sleep_efficiency, sleep_start, sleep_end, strain, kilojoule, avg_heart_rate, max_heart_rate, created_at")
    .gte("snapshot_date", since.toISOString().slice(0, 10))
    .order("snapshot_date", { ascending: false })
    .limit(365);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTodayActivity() {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ data: events }, { data: runs }] = await Promise.all([
    supabase
      .from("golem_events")
      .select("type, actor, data, created_at")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("service_runs")
      .select("service, started_at, ended_at, duration_ms, status")
      .gte("started_at", today.toISOString())
      .order("started_at", { ascending: false })
      .limit(20),
  ]);
  return { events: events ?? [], runs: runs ?? [] };
}

export async function fetchTodayCalendarEvents() {
  const supabase = createClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

  const { data, error } = await supabase
    .from("calendar_events")
    .select("event_id, summary, start_time, end_time, all_day, location, event_date")
    .eq("event_date", today)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchLatestWhoopSnapshot() {
  const supabase = createClient();
  // Prefer snapshots with actual recovery data (skip partial syncs with null values)
  const { data, error } = await supabase
    .from("whoop_snapshots")
    .select("id, snapshot_date, recovery_score, recovery_state, hrv_rmssd, resting_heart_rate, spo2, skin_temp, sleep_duration_ms, sleep_quality_ms, rem_ms, deep_ms, light_ms, awake_ms, sleep_performance, sleep_consistency, sleep_efficiency, sleep_start, sleep_end, strain, kilojoule, avg_heart_rate, max_heart_rate, created_at")
    .not("recovery_score", "is", null)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
