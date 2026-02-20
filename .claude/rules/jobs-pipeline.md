# Jobs Pipeline Rules

> Jobs discovers, Recruiter acts. Clear boundary between the two packages.

## Boundary

| Concern | Package | What |
|---------|---------|------|
| Scraping | `@golems/jobs` | Scrape boards, parse listings |
| Matching | `@golems/jobs` | Score against profile (1-10) |
| Dedup | `@golems/jobs` | Prevent duplicate listings in Supabase |
| Sync | `@golems/jobs` | Push to `golem_jobs` table |
| Outreach | `@golems/recruiter` | Contact finding, message drafting |
| Practice | `@golems/recruiter` | Interview prep with Elo tracking |
| Connections | `@golems/jobs` | LinkedIn connection matching |

**Rule:** Jobs NEVER sends messages or creates contacts. Recruiter NEVER scrapes boards.

## Scoring

- Scale: 1-10 (LLM-scored against `profile.json`)
- **8+** = hot match — triggers auto-outreach pipeline in Recruiter
- **5-7** = warm — shown in daily digest
- **1-4** = cold — archived

## Scraping Schedule (Cloud Worker)

| Time | Days | What |
|------|------|------|
| 6am | Sun-Thu | First morning scrape |
| 9am | Sun-Thu | Mid-morning refresh |
| 1pm | Sun-Thu | Afternoon check |

Managed by `@golems/services/cloud-worker.ts` on Railway.

## Supabase Tables

| Table | What |
|-------|------|
| `golem_jobs` | Scraped + scored job listings |
| `golem_seen_jobs` | Dedup tracking (hash-based) |
| `linkedin_connections` | Imported connections for warm intros |
| `outreach_contacts` | Contact pipeline (Recruiter-owned) |
| `outreach_drafts` | Draft messages (Recruiter-owned) |

## MCP Tools

**golems-jobs server:**
- `jobs_getHot` — Score 8+ matches
- `jobs_getRecent` — Latest batch
- `jobs_search` — Keyword search
- `jobs_stats` — Pipeline stats
- `jobs_dailyDigest` — Morning check-in
- `jobs_connectionMatches` — Warm leads
- `jobs_updateStatus` — Pipeline tracking
- `jobs_draftCoverLetter` — AI cover letter
- `outreach_draftForMatch` — Personalized outreach
