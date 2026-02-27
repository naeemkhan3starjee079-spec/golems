# @golems/jobs

> Job discovery service — scraping, matching, and state for the recruitment pipeline.

## Role

Jobs is a **service layer**, not an autonomous golem. It provides background job discovery that the RecruiterGolem acts on: scraping job boards on a schedule, matching listings against a profile, and syncing results to Supabase. Think of it as the data pipeline that feeds the recruiter.

## Architecture

```text
packages/jobs/
├── src/
│   ├── index.ts                 # getStatus() + main entry point
│   ├── scraper.ts               # Job board scraper (LinkedIn, Indeed, etc.)
│   ├── matcher.ts               # Job-to-profile matching (LLM-scored)
│   ├── connection-matcher.ts    # Match jobs with network connections
│   ├── watchlist.ts             # Saved searches and company watchlist
│   ├── sync-to-supabase.ts      # Sync scraped jobs to cloud DB
│   ├── mcp-server.ts            # MCP tools: job_getRecent, job_search, etc.
│   └── profile.json             # Job seeker profile for matching
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # This file
└── package.json                 # @golems/jobs
```

## Dependencies

- `@golems/shared` — Supabase factory, event log, LLM, state store

## Relationship to RecruiterGolem

Jobs **discovers**, Recruiter **acts**:
- Jobs scrapes boards → scores matches → syncs to Supabase
- Score 8+ triggers RecruiterGolem auto-outreach pipeline
- Recruiter reads job state via `getStatus()` and MCP tools
- Jobs has no outreach, no contacts, no practice — that's all Recruiter

## Scraping Schedule (Cloud Worker)

- **6am + 9am + 1pm**, Sun-Thu only (Israeli work week)
- Managed by `@golems/services/cloud-worker.ts` on Railway
- Results synced to Supabase via `sync-to-supabase.ts`

## MCP Tools

| Tool | Description |
|------|-------------|
| `job_getRecent` | Recent job matches above score threshold |
| `job_search` | Search jobs by keyword/company |
| `job_stats` | Match statistics by category |

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `golem_seen_jobs` | Deduplication — already-processed listings |
| `golem_jobs` | Full job data with scores |
