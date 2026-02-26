# Phase 8 Research: Israeli Job Board Expansion

> Research via Exa web search (2026-02-09)

---

## Current Sources

| Source | Format | Jobs/run | Notes |
|--------|--------|----------|-------|
| SecretTLV | HTML scrape | ~20-50 | Curated Israeli tech |
| Drushim | HTML scrape | ~100+ | Major Israeli board |
| Indeed Israel | HTML scrape | ~200+ | Global aggregator |

---

## Evaluated Sources

### 1. Greenhouse/Lever ATS Boards (RECOMMENDED #1)

**Effort: 3/10** | **Worth: YES** | **Format: FREE JSON API**

- `https://boards-api.greenhouse.io/v1/boards/{company}/jobs` returns clean JSON
- No auth, no rate limits, no anti-bot
- 8,000+ companies use Greenhouse globally (Cloudflare, Spotify, Stripe, Wix, Monday.com)
- Many Israeli startups use Greenhouse/Lever for hiring
- Fields: title, location, departments, description HTML, updated_at, URL
- Strategy: Build a list of Israeli company board tokens, scrape all in batch
- Known Israeli companies on Greenhouse: Wix, Monday.com, Fiverr, AppsFlyer, ironSource
- Lever has similar public API: `https://api.lever.co/v0/postings/{company}`

### 2. LinkedIn Guest API (RECOMMENDED #2)

**Effort: 5/10** | **Worth: YES** | **Format: HTML (structured)**

- Endpoint: `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search`
- No OAuth needed, just real User-Agent header
- Params: keywords, location (Israel), start (pagination), f_TP=1 (last 24h)
- Returns HTML cards with: title, company, location, posting date, job URL
- Risk: Rate limiting, IP blocking if aggressive. Need rotating delays.
- ToS: Grey area, guest endpoint is not officially documented API
- Biggest dataset of all sources, every company posts on LinkedIn

### 3. AllJobs.co.il (RECOMMENDED #3)

**Effort: 6/10** | **Worth: YES** | **Format: HTML scrape**

- Largest Israeli job board: 35,000+ listings, 1.5M CVs/month, 40K employers
- Founded 2004, aggregates from 3,000+ sources
- Cloudflare protected, needs proper headers/cookies
- Hebrew-primary site (titles/descriptions in Hebrew)
- Apify has a pre-built scraper (commercial, but architecture is documented)
- Strategy: Use puppeteer/playwright for Cloudflare bypass, or find API endpoints via network inspection

### 4. Jobmaster.co.il

**Effort: 5/10** | **Worth: MAYBE** | **Format: HTML scrape**

- Top 3 Israeli job board (30K+ listings, 1.14M visits/month)
- Founded 1998 (one of the oldest)
- Has English interface (unlike AllJobs which is Hebrew-only)
- Less anti-bot protection than AllJobs
- Smaller than AllJobs but still significant
- Risk: Significant overlap with AllJobs listings

### 5. Google Jobs (via SerpApi)

**Effort: 4/10** | **Worth: MAYBE** | **Format: JSON via SerpApi**

- Google aggregates from ALL job boards automatically
- SerpApi provides structured API for Google Jobs results
- Returns: title, company, description, salary, location, posting date
- Cost: SerpApi is paid ($50/mo for 5K searches). Free tier: 100 searches/month.
- Would catch jobs from smaller sites we don't directly scrape
- Might duplicate our existing sources (Indeed, Drushim already indexed by Google)

### 6. Glassdoor Israel

**Effort: 8/10** | **Worth: NO** | **Format: HTML behind auth**

- Requires login for most content
- Heavy anti-scraping (Cloudflare Enterprise, fingerprinting)
- Limited Israeli listings compared to AllJobs/LinkedIn

### 7. Wellfound (AngelList)

**Effort: 5/10** | **Worth: MAYBE** | **Format: GraphQL API**

- Has Israeli startups but much smaller than LinkedIn
- GraphQL API available (undocumented but discoverable)
- Good for early-stage startup jobs
- Risk: Low volume of Israeli-specific jobs

### 8. Facebook Groups

**Effort: 9/10** | **Worth: NO**

- Several active Israeli tech job groups exist
- Scraping Facebook is extremely difficult (anti-bot, login required, dynamic content)
- Not worth the engineering effort for unstructured group posts

---

## Top 3 Recommendation

| Priority | Source | Effort | Why |
|----------|--------|--------|-----|
| 1 | Greenhouse/Lever ATS | 3/10 | FREE JSON API, no auth, clean data. Build Israeli company list then scrape all boards. |
| 2 | LinkedIn Guest API | 5/10 | Massive dataset, no auth. Rate limit risk but manageable with delays. |
| 3 | AllJobs.co.il | 6/10 | Biggest Israeli board. Cloudflare hurdle but feasible. Hebrew content. |

### Implementation Order

1. Greenhouse/Lever first (lowest effort, highest quality, ~2 hours)
2. LinkedIn second (highest volume, moderate effort)
3. AllJobs third (if 1+2 don't cover enough)

### Dedup Strategy

- Match on: normalized company name + job title + city (fuzzy)
- When same job on multiple sources: keep the one with most detail (description length)
- Track source per job for quality metrics
