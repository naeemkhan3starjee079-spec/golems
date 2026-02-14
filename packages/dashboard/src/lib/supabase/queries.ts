import { createClient } from "./client";

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

type LlmRow = {
  model: string;
  source: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  created_at: string;
};

export async function fetchTokenStats(days: number) {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("llm_usage")
    .select("model, source, input_tokens, output_tokens, cost_usd, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as LlmRow[];

  // Aggregate by model+source
  const byModel: Record<string, { calls: number; input_tokens: number; output_tokens: number; cost_usd: number; sources: Set<string> }> = {};
  // Aggregate by day
  const byDay: Record<string, { calls: number; input_tokens: number; output_tokens: number; cost_usd: number }> = {};
  // Aggregate by source
  const bySource: Record<string, { calls: number; input_tokens: number; output_tokens: number; cost_usd: number }> = {};

  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;

  for (const row of rows) {
    totalCost += Number(row.cost_usd);
    totalInput += row.input_tokens;
    totalOutput += row.output_tokens;

    // By model
    if (!byModel[row.model]) {
      byModel[row.model] = { calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0, sources: new Set() };
    }
    byModel[row.model].calls++;
    byModel[row.model].input_tokens += row.input_tokens;
    byModel[row.model].output_tokens += row.output_tokens;
    byModel[row.model].cost_usd += Number(row.cost_usd);
    byModel[row.model].sources.add(row.source);

    // By source
    if (!bySource[row.source]) {
      bySource[row.source] = { calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
    }
    bySource[row.source].calls++;
    bySource[row.source].input_tokens += row.input_tokens;
    bySource[row.source].output_tokens += row.output_tokens;
    bySource[row.source].cost_usd += Number(row.cost_usd);

    // By day
    const day = row.created_at.slice(0, 10);
    if (!byDay[day]) {
      byDay[day] = { calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
    }
    byDay[day].calls++;
    byDay[day].input_tokens += row.input_tokens;
    byDay[day].output_tokens += row.output_tokens;
    byDay[day].cost_usd += Number(row.cost_usd);
  }

  // Convert Set to array for serialization
  const byModelSerialized: Record<string, { calls: number; input_tokens: number; output_tokens: number; cost_usd: number; sources: string[] }> = {};
  for (const [model, stats] of Object.entries(byModel)) {
    byModelSerialized[model] = { ...stats, sources: [...stats.sources] };
  }

  return {
    days,
    total_cost_usd: totalCost,
    total_input_tokens: totalInput,
    total_output_tokens: totalOutput,
    total_calls: rows.length,
    unique_sources: Object.keys(bySource).length,
    entry_count: rows.length,
    by_model: byModelSerialized,
    by_source: bySource,
    by_day: byDay,
  };
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

export async function fetchBacklogItems(project?: string) {
  const supabase = createClient();
  let query = supabase
    .from("backlog_items")
    .select("id, project, title, description, status, priority, tags, created_by, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (project) {
    query = query.eq("project", project);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createBacklogItem(item: { title: string; project: string; priority: string }) {
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
  const { data, error } = await supabase
    .from("pipeline_runs")
    .select("pipeline_id, success, duration_ms, quality_score, idea_type");
  if (error) throw error;

  const rows = data ?? [];
  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!grouped[row.pipeline_id]) grouped[row.pipeline_id] = [];
    grouped[row.pipeline_id].push(row);
  }

  const stats = Object.entries(grouped).map(([pipeline_id, runs]) => {
    const successful = runs.filter((r) => r.success);
    const qualities = runs.map((r) => r.quality_score).filter((q): q is number => q != null);
    const ideaTypes = [...new Set(runs.map((r) => r.idea_type))];

    return {
      pipeline_id,
      total_runs: runs.length,
      successful_runs: successful.length,
      success_rate: runs.length > 0 ? successful.length / runs.length : 0,
      avg_quality: qualities.length > 0 ? qualities.reduce((a, b) => a + b, 0) / qualities.length : null,
      avg_duration_ms: runs.length > 0 ? runs.reduce((a, r) => a + (r.duration_ms ?? 0), 0) / runs.length : 0,
      top_idea_types: ideaTypes.slice(0, 5),
    };
  });

  return {
    stats,
    total_runs: rows.length,
  };
}
