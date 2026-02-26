# RecruiterGolem

> Job outreach pipeline — contact finding, style-adapted messaging, interview practice, and Elo-rated skill tracking.

## Role

RecruiterGolem handles the **active job search** side: finding contacts at companies, drafting personalized outreach messages, tracking conversations, and running interview practice sessions with Elo ratings.

## Architecture

```text
packages/recruiter/
├── src/
│   ├── composer.ts              # Grammy Composer: /practice, /stats, /outreach, /followup + callbacks
│   ├── index.ts                 # getStatus() for CoachGolem reads
│   ├── contact-finder.ts        # Find hiring managers via web search
│   ├── draft-outreach.ts        # Style-adapted outreach messages
│   ├── style-adapter.ts         # Match communication style to recipient
│   ├── auto-outreach.ts         # Automated outreach pipeline
│   ├── outreach.ts              # Outreach orchestration
│   ├── outreach-db.ts           # SQLite outreach storage (local)
│   ├── outreach-db-cloud.ts     # Supabase outreach storage (cloud)
│   ├── practice-db.ts           # SQLite practice storage (local)
│   ├── practice-db-cloud.ts     # Supabase practice storage (cloud)
│   ├── elo.ts                   # Elo rating system for interview skills
│   ├── company-research.ts      # Company research for outreach context
│   ├── obsidian-export.ts       # Export outreach data to Obsidian vault
│   └── __tests__/               # Recruiter-specific tests
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # This file
└── package.json                 # @golems/recruiter
```

## Dependencies

- `@golems/shared` — Supabase factory, event log, LLM, state store

## Key Patterns

### Outreach Pipeline (E1-E6)
1. **E1: Contact Finder** — Web search for hiring managers at target companies
2. **E2: Outreach DB** — Track contacts, messages, response status
3. **E3: Style Adapter** — Match tone/formality to recipient profile
4. **E4: Auto-Outreach** — Automated pipeline for high-score (8+) job matches
5. **E5: Company Research** — Enrich outreach with company context
6. **E6: Obsidian Export** — Export pipeline data for review

### Dual Storage
- `outreach-db.ts` / `practice-db.ts` — SQLite for local development
- `outreach-db-cloud.ts` / `practice-db-cloud.ts` — Supabase for cloud (Railway)
- Switch via `STATE_BACKEND=file|supabase` env var

### Interview Practice
- 7 interview modes (behavioral, technical, system design, etc.)
- Elo rating tracks skill progression per category
- Practice sessions stored in Supabase for cross-device continuity

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/practice` | Start interview practice session |
| `/stats` | Show Elo ratings and practice history |
| `/outreach` | View/manage outreach pipeline |
| `/followup` | Check overdue follow-ups |

## LinkedIn Connections (Supabase)

**823 connections** are imported in the `linkedin_connections` table. Use these for warm intros when reviewing job matches.

### Quick Queries (via Supabase MCP)

```sql
-- Find connections at a specific company
SELECT first_name, last_name, position, company
FROM linkedin_connections
WHERE company_normalized ILIKE '%odigos%';

-- Find all connections matching current hot jobs
SELECT DISTINCT lc.first_name, lc.last_name, lc.position, lc.company, gj.title as job_title
FROM linkedin_connections lc
JOIN golem_jobs gj ON LOWER(lc.company_normalized) = LOWER(gj.company)
WHERE gj.match_score >= 8;

-- Search by name
SELECT first_name, last_name, company, position, linkedin_url
FROM linkedin_connections
WHERE first_name ILIKE '%name%' OR last_name ILIKE '%name%';
```

### Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `first_name` | text | First name |
| `last_name` | text | Last name |
| `full_name` | text | Generated: first + last |
| `company` | text | Company as listed on LinkedIn |
| `company_normalized` | text | Lowercase, stripped suffixes |
| `position` | text | Current role |
| `linkedin_url` | text | Profile URL |
| `email` | text | Email (if available) |
| `connected_on` | date | Connection date |

### Connection Matching

`packages/jobs/src/connection-matcher.ts` can match jobs to connections by company name (exact, fuzzy, substring). The `job_connections` table stores matches. Run matching via:

```sql
-- Check existing matches
SELECT jc.*, lc.first_name, lc.last_name, lc.position, gj.title
FROM job_connections jc
JOIN linkedin_connections lc ON jc.connection_id = lc.id
JOIN golem_jobs gj ON jc.job_id = gj.id
ORDER BY jc.created_at DESC;
```

**ALWAYS check LinkedIn connections when discussing job applications.** Before suggesting "check LinkedIn manually", query the table first — you already have the data.

## Email Routing

Emails categorized as `job` or `interview` are routed to RecruiterGolem by the email router (`@golems/shared/email/router`).
