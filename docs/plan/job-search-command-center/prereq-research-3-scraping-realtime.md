# Prereq Research 3: Scraping Resilience, Data Freshness & Dashboard Real-Time

> Research conducted via Gemini CLI (2026-02-09). Gemini hit rate limits during this session, so only partial findings were captured. The scraper resilience section is complete; data freshness and dashboard real-time sections were answered inline but not fully structured.

---

### 1. Scraper Resilience

#### Recommendation & Reasoning

The current scraping setup is brittle and lacks feedback mechanisms. To make it more resilient, the focus should be on proactive failure detection, building a fallback chain, and scraping politely to avoid getting blocked.

1.  **Implement a Multi-Layered Monitoring and Alerting System:**
    *   **Structural Change Detection:** For each target site, store a "fingerprint" of the expected HTML structure for the results area (e.g., a hash of the selector path `div.job-list > a.job-item > h2.title`). During each run, compare the current structure to the fingerprint. If it differs, the layout has likely changed, and an alert should be sent.
    *   **Zero Results Anomaly Detection:** Track the number of jobs found per run in your `scrape_activity` table. If the count is zero for, say, 3 consecutive runs, trigger an alert. This catches cases where the scraper runs "successfully" but finds no data due to a subtle HTML change or the job board being empty.
    *   **Selector Validation:** At the start of each scrape, verify that your core CSS selectors (e.g., for the job container, title, link) still exist on the page. If not, fail fast and send an alert. This is cheaper than running a full scrape that returns empty data.

2.  **Adopt a Fallback Chain for Data Extraction:**
    *   **Attempt 1: Structured Data (JSON-LD / Schema.org):** Check for `JobPosting` schema in `<head>` or `<body>`. If it exists, it's the most reliable source.
    *   **Attempt 2: Hidden APIs:** Use browser dev tools (Network tab) to see if job listings are loaded from a backend API (XHR/Fetch). Hitting this API directly is far more stable than parsing HTML.
    *   **Attempt 3: HTML Scraping (as a last resort):** If the above fail, fall back to HTML scraping.

3.  **Upgrade Tooling and Scraping Etiquette:**
    *   **Use a Headless Browser (Playwright):** Switch from `fetch`/`cheerio`-style scraping to a headless browser like Playwright. Many modern sites use JavaScript to render content, which basic fetchers miss.
    *   **Scrape Politely:** Use residential proxies, realistic User-Agent strings, random delays (2-5s), and respect `robots.txt`.

#### Effort Level

*   **Monitoring & Alerting:** **Medium**. Requires adding new tables/columns to Supabase, building alerting logic into `job-golem`.
*   **Fallback Chain & API Discovery:** **Medium**. Requires manual investigation per job board but simplifies scraper code if an API is found.
*   **Upgrading to Playwright & Proxies:** **High**. Significant architecture change, rewriting core scraping logic + third-party proxy costs.

---

### 2. Data Freshness (Summary)

*   **Gmail Push vs Polling:** Gmail Push Notifications are efficient but overly complex for a single-user case. Polling every 10 minutes is sufficient.
*   **Job Board Polling:** 30-minute intervals are a good balance. Israeli job boards don't offer RSS or webhooks, so scraping is unavoidable.

---

### 3. Dashboard Real-Time (Summary)

*   **Supabase Realtime** is the obvious choice — efficient, real-time, already in the stack.
*   **SSE** is a decent alternative but requires more backend work.
*   **Polling and ISR** are non-starters for live data.

---

### 4. Supabase Patterns (Summary)

*   **RLS:** Solid practice even for single-user dashboard. Use `is_admin` flag in `profiles` table.
*   **Database triggers vs application logic:** Hybrid approach is best for Golems. Simple transforms in DB triggers, complex logic in application code.
*   **Edge Functions vs Railway:** Deno runtime (Edge Functions) vs Bun (Railway). Railway preferred for existing Bun codebase compatibility.
