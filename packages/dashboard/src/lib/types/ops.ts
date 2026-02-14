export type GolemEvent = {
  actor: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
};

export type ServiceRun = {
  service: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  status: string;
  error: string | null;
};
