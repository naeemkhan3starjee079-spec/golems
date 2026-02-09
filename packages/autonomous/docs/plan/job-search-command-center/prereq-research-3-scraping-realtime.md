Here are my structured findings, recommendations, and prioritized list of changes for your job scraping project.

### Research Findings & Recommendations

---

### 1. Scraper Resilience

#### 1.1. Breakage Detection
*   **Finding:** Silent failures due to HTML changes are the biggest threat. The best practice is proactive monitoring, not waiting for an error.
*   **Recommendation:**
    1.  **Schema Validation:** After a successful scrape, validate the extracted data against a predefined schema (e.g., using Zod). An invalid structure points to a site change.
    2.  **Canary Queries:** Create a simple, static "canary" test for each job board. This test scrapes a known, stable part of the page (like the site's footer copyright year). If the canary fails, it's a strong signal of a major layout change, even if the main scraper doesn't error out.
    3.  **Field-level Monitoring:** Track the fill rate of each field (e.g., `title`, `company`, `location`). A sudden drop in the fill rate for a specific field (e.g., `location` goes from 95% to 5%) indicates a targeted HTML change.
*   **Effort:** Medium

#### 1.2. Structured Data on Israeli Job Boards
*   **Finding:** Support for structured data is inconsistent and often incomplete.
    *   **Indeed:** Generally has good support for `JobPosting` schema.org markup, as it's an international platform. This should be your primary structured data source.
    *   **Drushim & SecretTLV:** Based on analysis, their adoption of `JobPosting` schema is minimal or non-existent. You cannot rely on it. Sitemap analysis shows standard page links, not dedicated job data feeds.
*   **Recommendation:** Prioritize extracting from Indeed's `JSON-LD/Schema.org` data. For other sites, you'll have to rely on HTML scraping.
*   **Effort:** Low (to implement for Indeed)

#### 1.3. Fallback Strategy
*   **Finding:** A fallback chain dramatically increases resilience.
*   **Recommendation:** Implement the following fallback chain for each scraper run:
    1.  **Attempt to find `JSON-LD` (`application/ld+json`) script tag** containing `JobPosting` schema. This is the most reliable.
    2.  If not found, **fall back to HTML scraping** with `cheerio`.
    3.  If HTML scraping yields zero results or fails schema validation, **trigger an immediate alert**.
    4.  Consider a "nuclear option": if HTML fails, re-run the single failed board with Playwright as a last resort, as it's slower but more robust against JS-heavy sites. This adds complexity.
*   **Effort:** Medium

#### 1.4. Anti-Bot & Polite Scraping
*   **Finding:** Aggressive scraping leads to IP bans. Cloudflare is common and effective. Politeness is key.
*   **Recommendation:**
    *   **Use `got-scraping`:** It's designed for this. It automatically handles things like rotating user-agents, managing sessions, and mimicking browser headers (`HTTP2`, header order). It's superior to a basic `fetch`.
    *   **Rate Limiting:** Scrape one page at a time per site. Introduce random delays (2-5 seconds) between requests. Do not run scrapers for different sites in parallel if they share an IP.
    *   **`robots.txt`:** Respect it. It's the first thing sites check.
    *   **Headless Browser (Playwright):** Use it as a last resort. It has a high detection footprint. If you must use it, use the `puppeteer-extra-plugin-stealth` package (works with Playwright too) to evade detection.
*   **Effort:** Medium

#### 1.5. Tooling: `fetch` vs. Headless
*   **Finding:** `fetch` with `cheerio` is fast but brittle. Playwright is powerful but slow and resource-intensive. `got-scraping` is the sweet spot.
*   **Recommendation:**
    1.  **Primary Tool:** Use **`got-scraping` with `cheerio`**. It gives you the benefits of intelligent header management with the speed of static HTML parsing.
    2.  **Fallback/Complex JS sites:** Keep **Playwright** in your toolbox for sites that heavily rely on client-side JavaScript to render job postings, but don't use it as your default.
*   **Effort:** Medium (to migrate from `fetch`)

#### 1.6. "Zero Results" Detection
*   **Finding:** A scraper can "succeed" but find nothing, which is a failure state.
*   **Recommendation:**
    *   **Historical Baselines:** Store the number of jobs found per run for each source. If a new run finds `0` jobs, check the historical average. If the average is > 0, this is a "zero result" anomaly.
    *   **Alerting Threshold:** Trigger an alert if `jobs_found < (average_last_10_runs * 0.3)`. A 70% drop is a strong signal that something is broken.
*   **Effort:** Medium

---

### 2. Data Freshness

#### 2.1. Scrape & Email Frequency
*   **Finding:** For a personal job search, your frequency is likely too high and risks getting blocked.
*   **Recommendation:**
    *   **Scraping:** Reduce to **every 2-4 hours**. New jobs aren't posted frequently enough on these sites to justify a 30-minute interval. This lowers your risk profile.
    *   **Email:** Polling every 10 minutes is fine, but inefficient.
*   **Effort:** Low

#### 2.2. Gmail Push Notifications
*   **Finding:** Polling is inefficient. Gmail's Pub/Sub API is the correct, event-driven approach.
*   **Recommendation:** Switch from polling to **Gmail Push Notifications**. You set up a watch on your inbox, and Google notifies your app via a webhook when a new email arrives. This is more efficient and provides true real-time updates.
*   **Effort:** Medium

#### 2.3. Job Board Webhooks/RSS
*   **Finding:** Niche/regional job boards like SecretTLV and Drushim rarely offer modern data-access methods like webhooks or comprehensive RSS feeds. Indeed has some RSS capabilities, but they aren't always reliable for exhaustive job listings.
*   **Recommendation:** Don't spend time looking for these. Focus on making your scrapers resilient.
*   **Effort:** N/A

---

### 3. Dashboard Real-Time

#### 3.1. Real-Time Technology
*   **Finding:** For a single-user dashboard, simplicity is paramount.
*   **Recommendation:** **Use Supabase Realtime.** It's built for this exact use case. It pushes Postgres changes directly to your client over a websocket. It's dramatically simpler to implement than managing SSE or polling logic in Next.js. Your Next.js app would just subscribe to database changes and update the UI.
*   **Effort:** Medium

---

### 4. Supabase Patterns

#### 4.1. RLS for Single-User
*   **Finding:** RLS (Row-Level Security) can feel like overkill for a single user, but it's a critical security best practice.
*   **Recommendation:** **Use RLS correctly.** Create a policy that checks `auth.uid() = 'your_user_id'`. This prevents any possibility of data exposure, even with your `anon` key, and is good practice for any future projects.
*   **Effort:** Low

#### 4.2. DB Functions vs. App Logic
*   **Finding:** Moving logic to the database can simplify your application code.
*   **Recommendation:** Use Postgres functions (`CREATE FUNCTION`) for data-centric tasks. A great candidate is the "idempotent upsert". You can create a function `insert_job(job_data)` that handles the `INSERT ... ON CONFLICT UPDATE` logic, making your application code cleaner.
*   **Effort:** Medium

#### 4.3. Edge Functions vs. Railway
*   **Finding:** Consolidating services reduces complexity.
*   **Recommendation:** **Migrate your scrapers to Supabase Edge Functions.** They are geographically close to your database, reducing latency. This unifies your stack, simplifies secrets management, and allows you to get rid of the Railway deployment. Your scrapers are I/O bound, which is a perfect fit for Edge Functions.
*   **Effort:** High

#### 4.4. `pg_cron` vs. `launchd`
*   **Finding:** `launchd` is a client-side dependency. `pg_cron` is a database-native scheduler.
*   **Recommendation:** **Use `pg_cron`**. It's managed within Supabase and is more reliable for a production system. You can schedule your Edge Function scrapers directly from the database (e.g., `SELECT cron.schedule('scrape-jobs', '0 * * * *', 'SELECT net.http_post(...)')`). This removes the dependency on your local machine being online.
*   **Effort:** Medium

---

### 5. Error Recovery

#### 5.1. Resuming Failed Runs
*   **Finding:** If a scraper fails halfway through pagination, you don't want to re-scrape everything.
*   **Recommendation:** Before a scraper run, log the `board_name` and total pages to be scraped. After each page, update a `pages_completed` counter. If the run fails, the next run can check this log and decide whether to resume from the last completed page or start over. For simplicity, given your new lower scrape frequency, just re-running from the beginning is an acceptable first implementation.
*   **Effort:** High (for full-featured resume logic)

#### 5.2. Idempotent Upserts
*   **Finding:** Re-running a scraper should not create duplicate jobs.
*   **Recommendation:** **This is critical.** Use `INSERT ... ON CONFLICT DO UPDATE` for every job. The conflict target should be a unique identifier, like a `(source, source_job_id)` composite key. This ensures that new jobs are created and existing jobs are updated without duplication. As mentioned, this is a great candidate for a Postgres function.
*   **Effort:** Medium

#### 5.3. Circuit Breaker
*   **Finding:** Repeatedly hitting a failing external service can waste resources and trigger blocks.
*   **Recommendation:** Implement a simple circuit breaker. If a scraper for a specific board fails, say, 3 times in a row, disable that scraper for a cool-down period (e.g., 1 hour) before trying again. Store the state (failure count, disabled status) in your Supabase database.
*   **Effort:** Medium

---

### Top 5 Prioritized Changes

1.  **Consolidate Scrapers to Supabase (`pg_cron` + Edge Functions):**
    *   **Why:** This is the highest-impact change. It unifies your architecture, removes the fragile `launchd` dependency, and makes your scraping infrastructure robust and serverless. It's the foundation for all other improvements.

2.  **Implement Idempotent Upserts with a Unique Constraint:**
    *   **Why:** This prevents data corruption. Without it, you will get duplicate jobs, making your dashboard unreliable. This is a non-negotiable for data integrity.

3.  **Switch to `got-scraping` and Add Breakage Detection:**
    *   **Why:** Your scrapers are your data source; their health is paramount. `got-scraping` provides immediate resilience gains. Adding schema validation and "zero result" detection will catch 90% of silent failures.

4.  **Adopt Supabase Realtime for the Dashboard:**
    *   **Why:** This directly addresses your "real-time" goal in the simplest, most effective way for your stack. It will make your dashboard feel alive and instantly responsive to new data.

5.  **Reduce Scraping Frequency and Implement a Circuit Breaker:**
    *   **Why:** This reduces the operational risk of your system. Scraping less often makes you a "polite" user and lowers the chance of being blocked. The circuit breaker adds a layer of self-healing, preventing you from hammering a broken or changed site.
