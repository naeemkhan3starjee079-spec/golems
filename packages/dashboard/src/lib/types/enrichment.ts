export type FieldStats = { count: number; pct: number };

export type EnrichmentStats = {
  total_chunks: number;
  embeddings: FieldStats;
  tags: FieldStats;
  summaries: FieldStats;
  importance: FieldStats;
  intent: FieldStats;
  projects: { project: string; chunks: number }[];
  by_intent?: Record<string, number>;
  updated_at?: string;
};
