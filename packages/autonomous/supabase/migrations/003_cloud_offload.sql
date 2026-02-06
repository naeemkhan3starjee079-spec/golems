-- Phase 2: Cloud Offload Tables
-- Run via Supabase Dashboard SQL Editor
-- These tables replace local JSON/SQLite files for cloud deployment.

-- ═══════════════════════════════════════════════════════
-- golem_state: Replaces ~/.golems-zikaron/state.json
-- Key-value store for golem runtime state
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS golem_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- golem_events: Replaces ~/.golems-zikaron/event-log.json
-- Activity log for golem actions ("While You Were Down")
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS golem_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS golem_events_created_idx ON golem_events(created_at DESC);
CREATE INDEX IF NOT EXISTS golem_events_actor_idx ON golem_events(actor);

-- ═══════════════════════════════════════════════════════
-- golem_seen_jobs: Replaces ~/.golems-zikaron/job-golem/seen-jobs.json
-- Tracks which jobs have already been processed
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS golem_seen_jobs (
  job_id TEXT PRIMARY KEY,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- outreach_contacts: Replaces outreach.db contacts table
-- Recruiter golem contact database
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  linkedin_url TEXT,
  company TEXT,
  role TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_contacts_company_idx ON outreach_contacts(company);

-- ═══════════════════════════════════════════════════════
-- outreach_messages: Replaces outreach.db outreach table
-- Outreach message tracking
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT,
  contact_id UUID REFERENCES outreach_contacts(id),
  message_type TEXT NOT NULL,
  message_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_messages_status_idx ON outreach_messages(status);
CREATE INDEX IF NOT EXISTS outreach_messages_job_idx ON outreach_messages(job_id);

-- ═══════════════════════════════════════════════════════
-- outreach_companies: Replaces outreach.db company_research table
-- Company research cache
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS outreach_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  researched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- practice_sessions: Replaces practice.db sessions table
-- Interview practice session tracking
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  passed BOOLEAN,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  rating_before REAL,
  rating_after REAL
);

CREATE INDEX IF NOT EXISTS practice_sessions_mode_idx ON practice_sessions(mode);

-- ═══════════════════════════════════════════════════════
-- practice_questions: Replaces practice.db questions table
-- Questions asked during practice sessions
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS practice_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES practice_sessions(id),
  difficulty TEXT NOT NULL,
  topic TEXT,
  asked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practice_questions_session_idx ON practice_questions(session_id);

-- ═══════════════════════════════════════════════════════
-- RLS: Enable on all new tables
-- service_role bypasses RLS, anon key is blocked
-- ═══════════════════════════════════════════════════════

ALTER TABLE golem_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE golem_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE golem_seen_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_questions ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
