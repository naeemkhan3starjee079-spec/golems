export type SessionChunk = {
  id: string;
  content_type: string;
  project: string;
  position: number | null;
  importance: number | null;
  tags: string | null;
  summary: string | null;
  intent: string | null;
  content: string | null;
  source_file: string | null;
};

export type SessionContext = {
  session_id: string;
  project: string;
  branch: string;
  pr_number: number | null;
  commit_shas: string | null;
  files_changed: string | null;
  started_at: string | null;
  ended_at: string | null;
  plan_name: string | null;
  plan_phase: string | null;
};

export type SessionData = {
  session_id: string;
  total_chunks: number;
  page: number;
  per_page: number;
  chunks: SessionChunk[];
  context: SessionContext | null;
  files: string[];
  type_distribution: Record<string, number>;
};
