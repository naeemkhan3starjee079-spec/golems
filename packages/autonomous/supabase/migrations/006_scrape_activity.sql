CREATE TABLE IF NOT EXISTS scrape_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  total_found integer NOT NULL DEFAULT 0,
  new_saved integer NOT NULL DEFAULT 0,
  duplicates_skipped integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  avg_description_length integer DEFAULT 0,
  no_description_count integer DEFAULT 0,
  id_like_title_count integer DEFAULT 0,
  no_company_count integer DEFAULT 0,
  duration_ms integer DEFAULT 0,
  notes text
);

ALTER TABLE scrape_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on scrape_activity"
  ON scrape_activity
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_scrape_activity_source ON scrape_activity(source);
CREATE INDEX idx_scrape_activity_run_at ON scrape_activity(run_at DESC);
