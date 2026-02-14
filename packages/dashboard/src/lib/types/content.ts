export type PipelineRun = {
  id: string;
  pipeline_id: string;
  idea: string;
  idea_type: string;
  success: boolean;
  duration_ms: number;
  quality_score: number | null;
  user_feedback: number | null;
  output_format: string | null;
  error: string | null;
  created_at: string;
};

export type PipelineStat = {
  pipeline_id: string;
  total_runs: number;
  successful_runs: number;
  success_rate: number;
  avg_quality: number | null;
  avg_duration_ms: number;
  top_idea_types: string[];
};

export type RoutingResult = {
  success: boolean;
  steps: {
    pipelineId: string;
    reason: string;
    outputFormat: string;
    params: Record<string, unknown>;
  }[];
  reasoning: string;
  confidence: number;
  isMultiPipeline: boolean;
};

export type FlowStep = {
  label: string;
  detail: string;
  type: "input" | "brain" | "tool" | "gate" | "output";
};
