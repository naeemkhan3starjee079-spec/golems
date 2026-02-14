export type DayStats = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
};

export type ModelStats = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  sources: string[];
};

export type SourceStats = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
};

export type TokenStats = {
  days: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_calls: number;
  unique_sources: number;
  entry_count: number;
  by_model?: Record<string, ModelStats>;
  by_source?: Record<string, SourceStats>;
  by_day?: Record<string, DayStats>;
};
