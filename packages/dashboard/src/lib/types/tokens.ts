export type DayStats = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
};

export type ModelStats = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  sources: string[];
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
};

export type SourceStats = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
};

export type TokenStats = {
  days: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_calls: number;
  unique_sources: number;
  entry_count: number;
  total_cache_read_tokens?: number;
  total_cache_creation_tokens?: number;
  by_model?: Record<string, ModelStats>;
  by_source?: Record<string, SourceStats>;
  by_day?: Record<string, DayStats>;
};
