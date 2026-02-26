-- Job Search Command Center: Phase 3 enhancements
-- Adds status history tracking, match reasons, and cover letter storage

-- 1. Status history for tracking transitions (new→viewed→applied→interviewing→offer→rejected)
ALTER TABLE golem_jobs ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]';

-- 2. Structured match reasons (["React: 5yr match", "TypeScript: exact", "Gap: leadership"])
ALTER TABLE golem_jobs ADD COLUMN IF NOT EXISTS match_reasons TEXT[] DEFAULT '{}';

-- 3. Applied date for tracking application timeline
ALTER TABLE golem_jobs ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

-- 4. Cover letters table (one job can have multiple drafts)
CREATE TABLE IF NOT EXISTS job_cover_letters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES golem_jobs(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  content TEXT NOT NULL,
  style TEXT DEFAULT 'professional', -- professional, casual, technical
  generated_by TEXT DEFAULT 'haiku', -- haiku, cursor, manual
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE job_cover_letters ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on job_cover_letters"
  ON job_cover_letters
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_cover_letters_job_id ON job_cover_letters(job_id);
CREATE INDEX IF NOT EXISTS idx_golem_jobs_status ON golem_jobs(status);
CREATE INDEX IF NOT EXISTS idx_golem_jobs_match_score ON golem_jobs(match_score);
CREATE INDEX IF NOT EXISTS idx_golem_jobs_scraped_at ON golem_jobs(scraped_at);
