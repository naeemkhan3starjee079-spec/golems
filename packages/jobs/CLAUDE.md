# JobGolem

> Job board scraping, matching, ATS integration, and application tracking.

## Role

JobGolem handles **passive job discovery**: scraping job boards, matching listings against a profile, syncing to Supabase, and providing an MCP server for querying matches.

## Architecture

```text
packages/jobs/
├── src/
│   ├── composer.ts              # Grammy Composer: /jobs, /jobq, jobs:* pagination
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

## Key Patterns

### Scraping Schedule (Cloud Worker)
- **6am + 9am + 1pm**, Sun-Thu only (Israeli work week)
- Managed by `@golems/services/cloud-worker.ts` on Railway
- Results synced to Supabase via `sync-to-supabase.ts`

### Job Matching
- Profile in `profile.json` — skills, preferences, location, salary range
- LLM scores each job 1-10 based on profile fit
- Score 8+ triggers RecruiterGolem auto-outreach pipeline

### MCP Tools

| Tool | Description |
|------|-------------|
| `job_getRecent` | Recent job matches above score threshold |
| `job_search` | Search jobs by keyword/company |
| `job_stats` | Match statistics by category |

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/jobs` | Show recent high-score matches |
| `/jobq` | Quick job summary |
| `jobs:*` | Pagination callbacks for job lists |

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `golem_seen_jobs` | Deduplication — already-processed listings |
| Jobs stored via `sync-to-supabase.ts` | Full job data with scores |
