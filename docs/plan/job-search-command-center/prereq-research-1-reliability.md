# Prereq Research 1: Reliability & Observability

Here is a structured research report on improving the reliability and observability of your macOS background service ecosystem.

### Executive Summary

The current `launchd`-based system is functional but brittle, lacking essential reliability and observability features. The highest-impact, lowest-effort path forward is to adopt a hybrid `launchd` + `pm2` model. `launchd` will ensure `pm2` is always running, and `pm2` will manage the Bun/TypeScript services, providing built-in logging, restarts, and monitoring that directly address the majority of your current pain points. This, combined with centralized status tracking in Supabase and secure secret management via the 1Password CLI, will create a robust, low-maintenance, and easily observable system.

---

### 1. `launchd` Best Practices in 2026

*   **Recommendation:** Use `launchd` for one thing only: to keep the `pm2` process manager running. Let `pm2` handle the individual Bun services. This gives you the rock-solid, system-level persistence of `launchd` with the application-specific management features of `pm2`.

*   **Reasoning:**
    *   `launchd` is still the most efficient, native way to run persistent daemons on macOS. However, it's a low-level tool. It is notoriously difficult to debug and lacks modern process management features like easy log access, restart strategies, and health checks.
    *   `pm2` is a mature process manager for Node.js/Bun applications that provides these missing features out of the box (`pm2 logs`, `pm2 restart`, `pm2 monit`).
    *   A single `launchd` plist to manage `pm2` (`KeepAlive: true`) is simple to write and debug. The complexity of managing individual services (intervals, paths, arguments) is moved into a `pm2` `ecosystem.config.js` file, which is more portable, easier to read, and version-controllable.
    *   This hybrid model is the best of both worlds and directly solves the problems of crash loops (`ThrottleInterval`), retries, and dependency checking by moving them into a more capable tool.

*   **Effort:** Medium. Requires installing `pm2` and refactoring the individual `launchd` plists into a single `ecosystem.config.js` file.

---

### 2. Health Checking Patterns

*   **Recommendation:** Implement pre-flight health checks inside your application startup logic. Before starting its main task, each service should verify its dependencies (e.g., attempt to connect to Supabase, `curl http://localhost:11434` for Ollama). If a check fails, the service should log the error and exit gracefully (`process.exit(1)`).

*   **Reasoning:**
    *   Wrapper scripts add another layer of shell scripting to maintain and debug. In-process checks are written in TypeScript, keeping your logic in one language and making them easier to test.
    *   When combined with `pm2`, this pattern is very powerful. `pm2` will see the non-zero exit code, mark the process as `errored`, and attempt a restart according to your configured policy. This prevents services from running with broken dependencies.
    *   For hung processes, `pm2` has a built-in watchdog feature via the `pm2-watcher` or by using `vitals` that can restart a process that hasn't responded in a certain amount of time, though this is often more complex than needed for this setup. A simple "fail fast" on startup is more effective.

*   **Effort:** Low. Add a small async `runHealthChecks()` function to the start of each service's entry point.

---

### 3. Alerting & Observability

*   **Recommendation:**
    1.  **Logging:** Use `pino` for structured (JSON) logging in all Bun services. Let `pm2` handle log file rotation and management.
    2.  **Alerting:** In your main application logic, wrap the core work in a `try...catch` block. In the `catch` block, `curl` your Telegram bot's notification endpoint with the error details before re-throwing the error.
    3.  **Status Tracking:** Create a new table in Supabase called `service_runs`. On every execution, the service should write a record for `start`, `success`, or `failure`, including the duration, status, and a reference to the logs (or the last few lines of the error).

*   **Reasoning:**
    *   Structured logs are machine-readable, making them easy to query and parse. `pino` is extremely lightweight and fast, making it a perfect fit for Bun. `pm2`'s built-in log management (`pm2 logs --json`) is simpler than configuring macOS's `newsyslog`.
    *   Integrating alerting directly into the application's error handling ensures you capture application-level exceptions, not just process crashes.
    *   A `service_runs` table in Supabase becomes the single source of truth for your system's health. It's durable, queryable, and the perfect backend for a monitoring dashboard. This replaces unreliable file-based status checks.

*   **Effort:** Medium. Requires adding `pino`, a `try/catch` block for alerting, and Supabase client logic to each service.

---

### 4. Local vs. Cloud Split

*   **Recommendation:** Adopt a clear hybrid pattern. The Railway cloud-worker is for **high-availability data acquisition** (scraping jobs, polling emails). The local services are for **local-resource-intensive processing** (Ollama scoring). Eliminate the duplication.

*   **Reasoning:**
    *   This plays to the strengths of each environment. Railway is always on, unaffected by your Mac sleeping. Your local machine has the powerful M1 Pro GPU needed for fast Ollama inference.
    *   The workflow should be:
        1.  **Cloud:** `railway-job-scraper` runs 24/7, fetching new job postings and inserting them into a `raw_jobs` table in Supabase with a status of `pending_scoring`.
        2.  **Local:** `local-job-scorer` wakes up periodically, queries for jobs with `pending_scoring`, runs them through Ollama, and updates their status to `scored`.
    *   This resolves the latency issue of cloud-to-local Ollama calls and the reliability issue of running scrapers on a personal machine that may sleep.

*   **Effort:** High. This is an architectural change and requires refactoring the `email-golem` and `job-golem` services to separate data acquisition from data processing.

---

### 5. Secrets Management

*   **Recommendation:** Use the 1Password CLI (`op run`). Store all secrets in 1Password and prepend your `pm2` execution commands with `op run --`.

*   **Reasoning:**
    *   Hardcoding secrets in plaintext `.plist` files is a major security risk.
    *   `.env` files are better, but they are still plaintext on disk.
    *   The `op run` command injects secrets as environment variables directly into the process at runtime. The secrets are never written to disk, providing the best combination of security and convenience for this stack. It integrates perfectly with `pm2`'s `ecosystem.config.js`.

    ```javascript
    // ecosystem.config.js
    module.exports = {
      apps: [
        {
          name: 'email-golem',
          script: 'src/email-golem/index.ts',
          interpreter: 'bun',
          // Prepend the execution with 1Password CLI
          command_prefix: 'op run --env-file=.env.1password --'
        },
      ],
    };
    ```

*   **Effort:** Low. Install the `op` CLI, create a vault for your project, and update the `pm2` config file.

---

### 6. Process Management Alternatives

*   **Recommendation:** As outlined in Q1, `pm2` is the ideal choice. It is not an alternative to `launchd` but a complementary layer that sits on top.

*   **Reasoning:**
    *   **vs. Docker:** Docker adds significant overhead (disk space, memory, complexity) and is overkill for managing a few TypeScript processes on a personal development machine.
    *   **vs. tmux:** `tmux` is for managing interactive sessions, not for running persistent, reliable background daemons. It lacks automatic restarts, logging, and monitoring.
    *   **pm2's advantages are a perfect match for your needs:**
        *   Natively understands the Node/Bun ecosystem.
        *   Simple `ecosystem.config.js` for declarative management.
        *   Built-in log rotation, monitoring, and restart strategies.
        *   Zero-downtime reloads.

*   **Effort:** N/A (Covered by Q1).

---

### 7. Monitoring Dashboard

*   **Recommendation:** Use Supabase Realtime to power your `admin-ui`. The dashboard should subscribe to changes on the `service_runs` table.

*   **Reasoning:**
    *   Polling is inefficient and introduces latency. Supabase Realtime is a push-based system that will update your dashboard instantly whenever a service reports its status. This provides a true live view of your system's health.
    *   The dashboard can subscribe to inserts on the `service_runs` table and update the UI accordingly. You can easily display a list of recent service runs, flag failures, and show the last successful run time for each service without a single polling request from the client.
    *   This is a very low-effort, high-impact way to build a powerful monitoring UI using your existing stack.

*   **Effort:** Low. Requires creating the `service_runs` table and adding the Supabase Realtime client to your Next.js dashboard.

---

### Final Prioritized Action Plan

Here is the recommended order of implementation to achieve the biggest reliability gains first.

1.  **[High Priority] Adopt `pm2` and 1Password (Effort: Medium):**
    *   Install `pm2` and the `op` CLI.
    *   Create a single `launchd` service to keep `pm2` alive.
    *   Move all secrets into a 1Password vault.
    *   Create an `ecosystem.config.js` that defines all your services, using `op run --` to inject secrets. This immediately gives you better logging, process management, and security.

2.  **[High Priority] Implement Status Reporting (Effort: Medium):**
    *   Create the `service_runs` table in Supabase.
    *   Instrument all services to report `start`, `success`, and `failure` to this table using `try/catch/finally` blocks.
    *   In the `catch` block, add the `curl` command to notify your Telegram bot of failures. This gives you immediate alerting and a durable history of all executions.

3.  **[Medium Priority] Build the Realtime Dashboard (Effort: Low):**
    *   Update your Next.js admin UI to use the Supabase client and subscribe to the `service_runs` table. Display the live status of your services.

4.  **[Medium Priority] Implement Pre-Flight Health Checks (Effort: Low):**
    *   Add dependency checks (Ollama, Supabase) to the startup sequence of each service so they fail fast if a dependency is down.

5.  **[Low Priority] Refactor Local vs. Cloud Services (Effort: High):**
    *   Once the system is stable and observable, undertake the architectural refactor to split the data acquisition (cloud) and processing (local) responsibilities of your services. This will improve efficiency and make the system's logic clearer.
