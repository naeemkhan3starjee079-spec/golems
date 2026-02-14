export type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  status: string | null;
  match_score: number | null;
  tags: string[] | null;
  match_reasons: string[] | null;
  scraped_at: string;
  applied_at: string | null;
  created_at: string;
};

export type ScrapeRun = {
  id: string;
  source: string;
  run_at: string;
  total_found: number;
  new_saved: number;
  duplicates_skipped: number;
  errors: number;
  duration_ms: number | null;
};

export type JobStats = {
  total: number;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
  avg_score: number | null;
};
