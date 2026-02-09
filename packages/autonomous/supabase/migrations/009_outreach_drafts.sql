-- Phase 5: Outreach drafts for connection-job matches
-- Stores AI-generated outreach strategies for LinkedIn connections at matching companies

CREATE TABLE IF NOT EXISTS outreach_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES golem_jobs(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES linkedin_connections(id) ON DELETE CASCADE,
  approach_angle TEXT NOT NULL,       -- "You both worked at X" or "Shared React stack"
  message_draft TEXT NOT NULL,        -- The actual message to send
  followup_plan TEXT,                 -- "Wait 5 days, then send follow-up"
  notes TEXT,                         -- What to mention/avoid
  status TEXT DEFAULT 'pending',      -- pending/approved/sent/replied/skipped
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE outreach_drafts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on outreach_drafts"
  ON outreach_drafts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_drafts_job_id ON outreach_drafts(job_id);
CREATE INDEX IF NOT EXISTS idx_outreach_drafts_connection_id ON outreach_drafts(connection_id);
CREATE INDEX IF NOT EXISTS idx_outreach_drafts_status ON outreach_drafts(status);

-- Unique constraint: one draft per job-connection pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_drafts_unique
  ON outreach_drafts(job_id, connection_id);
