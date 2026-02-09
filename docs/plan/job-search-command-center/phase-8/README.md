# Phase 8: Job Board Expansion

> [Back to main plan](../README.md)

## Goal

Expand beyond SecretTLV + Drushim + Indeed. Add best Israeli tech job sources. Better matching for "anywhere in Israel if match > 8."

## Tools

- **Research:** Gemini (free) — Israeli job board landscape
- **Code:** Opus direct for scrapers

## Steps

### 1. Research Phase (CLI helper, background)

```bash
gemini -p "Research Israeli tech job boards and aggregators in 2026:

Already scraping: SecretTLV, Drushim, Indeed Israel

Evaluate these potential additions:
1. AllJobs.co.il — scraping feasibility, data quality, anti-bot measures
2. LinkedIn Jobs (without API) — can you scrape job listings? legal/ToS considerations?
3. Google Jobs aggregator — does it aggregate Israeli tech jobs? API available?
4. Glassdoor Israel — scraping feasibility, data format
5. StartupNation Central job board — data quality, API?
6. Comeet / Lever / Greenhouse job boards used by Israeli startups
7. HackerRank / AngelList (now Wellfound) — Israeli jobs available?
8. Facebook/Meta groups for Israeli tech jobs

For each source evaluate:
- Data format (JSON-LD, HTML tables, API)
- Anti-scraping measures (Cloudflare, rate limits, login required)
- Job freshness (how often new jobs appear)
- Data quality (full description, company info, salary range?)
- Effort to add scraper (1-10 scale)
- Worth adding? (yes/maybe/no with reason)

Output as comparison table + top 3 recommendation." > docs/plan/job-search-command-center/phase-8/findings.md 2>&1
```

### 2. Review Findings + Pick Top 2-3

Based on research:
- Best effort/value ratio
- Don't add sources that duplicate existing (same jobs from multiple boards)
- Prefer sources with structured data (JSON-LD, APIs) over raw HTML

### 3. Implement New Scrapers

For each new source:
- Add to `src/job-golem/scraper.ts` (or create source-specific scrapers)
- Follow existing pattern: `scrapeSource() → Job[]`
- Handle: pagination, rate limiting, error recovery
- Store source name for dedup

### 4. Cross-Source Dedup

Create `src/job-golem/dedup.ts`:
- Match on: company name + job title + location (fuzzy)
- When same job found on multiple sources: keep the one with most detail
- Mark source on each job for quality tracking

### 5. Location Flexibility

Update `src/job-golem/matcher.ts`:
- Current: strict location filter
- New: if match score > 8, include jobs anywhere in Israel
- Add `location_flexible` field to match output
- Dashboard shows: "This job is in Haifa — outside your usual area, but it's a 9.2 match"

### 6. Source Quality Dashboard

Track per-source:
- Jobs found per run
- Match rate (% scoring 5+)
- Unique jobs (not found on other sources)
- Average match score
- Show on Activity/Alerts page

## Depends On

- None (independent, but benefits from Phase 3 dashboard improvements)

## Status

- [ ] Run Gemini research (background)
- [ ] Review findings, pick top sources
- [ ] Implement scrapers (2-3 new sources)
- [ ] Cross-source dedup
- [ ] Location flexibility in matcher
- [ ] Source quality tracking
- [ ] Tests pass
- [ ] Committed
