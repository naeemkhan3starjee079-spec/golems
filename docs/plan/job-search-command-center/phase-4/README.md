# Phase 4: LinkedIn Connections Pipeline

> [Back to main plan](../README.md)

## Goal

Import 843 LinkedIn connections. Match them against companies with open jobs. Surface warm intros. This is the highest-value feature — "your connection Z works at company X which is hiring for position Y."

## Tools

- **Research:** Gemini (free) — LinkedIn data format, warm intro best practices
- **Code:** Opus direct for backend, delegated Claude for dashboard

## Data Available

LinkedIn export at `docs.local/Basic_LinkedInDataExport_02-09-2026.zip/`:
- `Connections.csv` — 843 rows: `First Name,Last Name,URL,Email Address,Company,Position,Connected On`
- `messages.csv` — 815KB of LinkedIn messages (could be useful for relationship strength)
- `Company Follows.csv` — companies you follow
- `Endorsement_Given_Info.csv` / `Endorsement_Received_Info.csv` — endorsement relationships
- `Jobs/` directory — saved/applied jobs data

## Steps

### 1. Research Phase (CLI helper, background)

```bash
gemini -p "Research the following about LinkedIn connection data for job searching:
1. LinkedIn CSV export: what fields are available in Connections.csv? (we have: First Name, Last Name, URL, Email, Company, Position, Connected On)
2. Company name matching challenges: how to match 'Google' vs 'Alphabet' vs 'Google Israel'?
3. Warm intro best practices: when reaching out to a connection about a job at their company, what works better — a direct referral request message, or a multi-step strategy (engage with posts first, then DM)?
4. What's the conversion rate difference between cold application vs warm referral?
5. How to rank connection strength: recent connection vs old, have messages vs never talked, endorsed vs not?
Output structured findings with sources." > docs/plan/job-search-command-center/phase-4/findings.md 2>&1
```

### 2. Supabase Migration

```sql
CREATE TABLE linkedin_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  linkedin_url TEXT UNIQUE,
  email TEXT,
  company TEXT,
  position TEXT,
  connected_on DATE,
  relationship_strength TEXT DEFAULT 'unknown', -- strong/medium/weak/unknown
  imported_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES golem_jobs(id),
  connection_id UUID REFERENCES linkedin_connections(id),
  company_match_type TEXT, -- exact/fuzzy/parent_company
  notified BOOLEAN DEFAULT false,
  outreach_status TEXT DEFAULT 'none', -- none/drafted/sent/replied
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_connections_company ON linkedin_connections(company);
CREATE INDEX idx_job_connections_job ON job_connections(job_id);
```

### 3. Import Script

Create `scripts/import-linkedin-connections.ts`:
- Parse `Connections.csv` (handle Hebrew names, empty emails)
- Upsert into `linkedin_connections` table
- Optional: parse `messages.csv` to determine relationship strength (has messages = stronger)
- Optional: parse endorsements for additional signal

### 4. Connection Matcher

Create `src/job-golem/connection-matcher.ts`:
- On each job scrape run, after scoring: check if any connection's company matches the job's company
- Company matching: normalize names, handle "Ltd", "Inc", Hebrew company names
- Fuzzy matching: Levenshtein distance < 3, or substring match
- When match found: insert into `job_connections` table

### 5. Notification Flow

In `src/job-golem/index.ts`, after finding a connection match:
```
Telegram: "Found job: Senior Fullstack at CompanyX (score: 8.5)
Your connection: Moshe Cohen works there as Team Lead.
Reply 'draft' for RecruiterGolem to create an outreach strategy."
```

### 6. MCP Tools

- `job_connectionMatches` — list jobs with warm leads
- `linkedin_connections` — search/filter connections
- `linkedin_importStatus` — import stats (total, matched, etc.)

### 7. Dashboard Integration

Show on job cards:
- "Warm lead" badge when connection exists
- Connection name + position in job detail view
- "Draft outreach" button (triggers Phase 5 RecruiterGolem)

## Depends On

- Phase 0 (service status — same branch works)
- LinkedIn CSV data (READY: 843 connections)

## Status

- [ ] Run research (Gemini background)
- [ ] Review research findings
- [ ] Supabase migration
- [ ] Import script + run it
- [ ] Connection matcher in job-golem
- [ ] Telegram notification flow
- [ ] MCP tools
- [ ] Dashboard integration (delegated)
- [ ] Tests pass
- [ ] Committed
