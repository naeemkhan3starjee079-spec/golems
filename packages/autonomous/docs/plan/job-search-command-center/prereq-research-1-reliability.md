Of course. This is a fascinating and well-architected personal automation system. The challenges you're facing are common as such systems grow in complexity. Here is a structured analysis of your situation and a set of prioritized recommendations, keeping in mind your preference for simplicity and low maintenance on a personal developer setup.

---

### **Structured Findings & Recommendations**

#### **1. `launchd` Best Practices in 2026**

`launchd` is still the correct, idiomatic, and most resource-efficient tool for managing system-level daemons and agents on macOS. Its deep integration with the OS is a significant advantage over third-party tools, which often act as wrappers around it anyway.

*   **Recommendation:** Stick with `launchd`. Avoid adding another process manager like `cron`, `pm2`, or `supervisord` unless you hit a hard limitation that a wrapper script cannot solve.
*   **Reasoning:** It's native, stable, and has no external dependencies. The main challenge is its configuration verbosity and lack of built-in, cross-process dependency logic, which we can solve with simple wrappers.
*   **Effort:** Low (Continue using existing tool).

**Key Usage Guide:**

*   **`KeepAlive`:** Use this for processes that must *always* be running. If they crash, `launchd` restarts them automatically.
    *   **Ideal for:** `telegram` bot listener, `ollama` server.
*   **`StartInterval`:** For simple, recurring tasks that run every N seconds.
    *   **Use for:** `job-golem` (every 1800s). It's simple and effective for this use case.
*   **`StartCalendarInterval`:** For tasks that need to run at specific times of day.
    *   **Ideal for:** `briefing` (at 8:00) and `nightshift` (at 4:00). You are using this correctly.
*   **Dependency Chains:** `launchd` has no native "service dependency" feature. The best pattern is a **pre-flight check** inside a wrapper script (see Health Checking below).
*   **`WatchPaths` / `QueueDirectories`:** These are powerful but for different use cases. `WatchPaths` triggers a job when a file/folder changes. `QueueDirectories` triggers a job for each item placed in a folder. Neither seems directly applicable to your current services but are good to know.
*   **`ThrottleInterval`:** This is a crucial key that prevents a crashing service from overwhelming your system. `launchd` will not restart a job more than once within this interval (defaults to 10 seconds). You should rely on this; no changes needed.

---

#### **2. Health Checking**

Your assessment is correct; you have no health checks, leading to silent failures.

*   **Recommendation:** Implement a **wrapper script** pattern for all scheduled services (`email-golem`, `job-golem`). The `.plist` file will execute this script instead of `bun` directly.
*   **Reasoning:** A wrapper script is the simplest and most flexible way to add pre-flight checks, hung process detection, and robust error handling without modifying the application code extensively.
*   **Effort:** Medium.

**Wrapper Script Pattern (`run-email-golem.sh`):**

```bash
#!/bin/zsh
# Wrapper for the email-golem service

# 1. Pre-flight check for Ollama
if ! curl -s -f http://localhost:11434/ > /dev/null; then
  echo "Ollama is not responding. Aborting email-golem run."
  # Send alert (see section 3)
  curl -X POST http://localhost:3847/notify -d "ALERT: Ollama is down, email-golem cannot run."
  exit 1
fi

# 2. Run the main process (using 1Password CLI for secrets, see section 5)
op run -- bun /path/to/your/project/src/email-golem/index.ts

# 3. Check exit code for basic crash detection
if [[ $? -ne 0 ]]; then
  echo "email-golem process crashed."
  curl -X POST http://localhost:3847/notify -d "ALERT: email-golem process crashed."
  exit 1
fi
```

*   **Hung Process Detection:** This is more complex. The simplest "good enough" approach is a **heartbeat**. Have your Bun scripts write a timestamp to a file (e.g., `/tmp/email-golem.heartbeat`) or a Supabase table every minute while processing. A separate, simple `launchd` watchdog agent can run every 5 minutes, check if the heartbeat file's modification time is recent, and alert if it's stale.
*   **`ProcessType` Key:** For your use case, the default (`Background`) is appropriate. It gives your services a lower priority so they don't interfere with interactive UI applications.

---

#### **3. Alerting & Observability**

Leverage your existing Telegram bot and Supabase.

*   **Recommendations:**
    1.  **Alerting:** Use `curl` in the wrapper scripts to hit your Telegram bot's notification endpoint (`http://localhost:3847/notify`) on failure.
    2.  **Structured Events:** Instrument your wrapper scripts (or better, the TS code itself) to write a structured event to a `service_runs` table in Supabase at the start and end of every execution. This solves the "last run" problem and gives you a full audit trail.
    3.  **Structured Logging:** Adopt `pino` for your Bun/TypeScript services. It's extremely fast and outputs structured JSON, which is invaluable for debugging.
    4.  **Log Rotation:** Use the macOS native `newsyslog`. Add a config file like `/etc/newsyslog.d/golems.conf` to manage your custom log files. It's a one-time setup.
    5.  **Unified Status:** Enhance your `golems doctor` script to be the single source of truth. It should query Supabase for the `service_runs` table, `launchctl list`, and check the health of dependencies like Ollama.
*   **Reasoning:** This creates a robust, low-maintenance observability system using tools you already have in place.
*   **Effort:**
    *   Alerting: Low
    *   Supabase Events: Medium
    *   Pino Logging: Low-Medium
    *   Log Rotation: Low
    *   `golems doctor`: Medium

**Supabase `service_runs` Table:**

```sql
CREATE TABLE service_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_ms INT,
  status TEXT NOT NULL, -- 'started', 'success', 'failure'
  error_message TEXT,
  run_id TEXT -- A unique ID for this specific run
);
```

---

#### **4. Local vs. Cloud Split**

Running duplicate services is confusing and inefficient. A hybrid model is the correct architecture here.

*   **Recommendation:** Adopt a **Queue-based Hybrid Model**.
    1.  **Cloud (Railway):** Use the Railway worker for tasks that need high uptime and network access, but not specialized hardware. Specifically: scraping for `job-golem`. The scraper's only job is to find potential items and insert them into a `jobs_queue` table in Supabase.
    2.  **Local (MacBook):** The local `job-golem` and `email-golem` services become **processors**. They wake up, query the queue table in Supabase for unprocessed items, use the local Ollama GPU for scoring/processing, and update the results.
*   **Reasoning:** This is the best of both worlds. The cloud provides always-on data collection, so your Mac being asleep doesn't cause you to miss opportunities. The local machine provides free, low-latency access to your GPU for the heavy lifting. This decouples the components and makes the system more resilient.
*   **Effort:** High (Architectural change).

---

#### **5. Secrets Management**

Plaintext secrets in `.plist` files are a significant security risk.

*   **Recommendation:** Use **1Password CLI (`op run`)**.
*   **Reasoning:** You already use macOS, and 1Password is a best-in-class tool for secret management. `op run -- your-command` injects secrets as environment variables *directly* into the process without them ever touching the disk or shell history in plaintext. It integrates perfectly with `launchd`. In your `.plist`, the `ProgramArguments` array would become `['/path/to/op', 'run', '--', 'bun', 'src/email-golem/index.ts']`. This is the cleanest, most secure, and most manageable solution for a personal setup in 2026.
*   **Alternative:** macOS Keychain is a viable, free alternative, but requires more scripting (`security find-generic-password`) in your wrapper. `op run` is simpler to implement.
*   **Effort:** Medium (Requires one-time setup and modification of all plists).

---

#### **6. Alternatives (pm2, Docker)**

*   **pm2:** A very strong contender. `pm2` provides much of the functionality you're trying to build (log management, restart policies, monitoring) out of the box. `pm2-mac-startup` can even generate the `launchd` plists for you.
    *   **Verdict:** If you were starting from scratch, `pm2` would be an excellent choice. Migrating now is a possibility, but it's another tool to manage. I'd recommend sticking with the `launchd` + wrapper script approach first, as it's more "native" and you're already on that path. Consider `pm2` if your wrapper scripts become too complex.
*   **Docker/Orbstack:** Definite overkill. The overhead of virtualization, image management, and networking complexity is not worth it for this personal setup, especially when you need direct access to local macOS resources and a local Ollama instance.
*   **tmux:** Not a daemonization tool. It's for managing interactive sessions. Not suitable for this use case.

---

#### **7. Monitoring**

*   **Recommendation:** Use **Supabase Realtime**.
*   **Reasoning:** Since you're already writing run status events to a Supabase table, creating a live dashboard is trivial. Create a simple Next.js page on Vercel that subscribes to changes on your `service_runs` table. This gives you a push-based, real-time status view with almost no polling or extra infrastructure.
*   **Effort:** Medium (Frontend work).

---

### **Final Section: Here Is What I Would Do, In Priority Order**

This is an opinionated, actionable plan to tackle your known issues.

**Phase 1: Stop the Bleeding (Security & Basic Stability)**

1.  **Implement 1Password CLI:** Immediately move all secrets from `.plist` files into a 1Password vault. Modify all `launchd` jobs to use `op run -- bun ...`. **(Impact: Critical, Effort: Medium)**
2.  **Create Basic Wrapper Scripts:** Create a `run-SERVICE.sh` script for `email-golem` and `job-golem`. Update the plists to call these scripts. For now, they can just contain the `op run` command. **(Impact: High (enabler for next steps), Effort: Low)**
3.  **Add Crash Alerting:** In the wrapper scripts, add the `if [[ $? -ne 0 ]]` block to check the exit code of the `bun` process. If it fails, `curl` your Telegram bot to send an alert. This immediately solves the "no alerting on crash" problem. **(Impact: Critical, Effort: Low)**
4.  **Fix Log Overwriting:** In your `.plist` files, ensure the `StandardOutPath` and `StandardErrorPath` keys point to unique log files, and don't rely on a system that overwrites them. For appending, you'd typically handle this via the shell (`>>`) but launchd's redirection can be tricky; directing to a file and using `newsyslog` for rotation is the standard pattern.

**Phase 2: Build Robust Observability**

5.  **Create Supabase `service_runs` Table:** Define and create the table as described in section 3. **(Impact: High, Effort: Low)**
6.  **Implement Pre-Flight Checks:** Add the `curl` check for Ollama to the start of the relevant wrapper scripts. Have them send a Telegram alert if a dependency is down. **(Impact: High, Effort: Low)**
7.  **Log Runs to Supabase:** In the wrappers, add `psql` or `curl` commands to insert a `started` event into `service_runs` at the beginning and update it with `success`/`failure` and duration at the end. This fixes the "last_run" dashboard issue. **(Impact: High, Effort: Medium)**
8.  **Set Up `newsyslog`:** Create a `/etc/newsyslog.d/golems.conf` to rotate your log files. This is a set-and-forget fix for unmanaged log growth. **(Impact: Medium, Effort: Low)**

**Phase 3: Architect for the Future**

9.  **Refactor to a Hybrid Queue Model:** Begin the architectural change. Modify the Railway worker to be a pure scraper that populates a `queue` table in Supabase. Modify the local golems to be processors that work off that queue. Do this one service at a time, starting with `job-golem`. **(Impact: High, Effort: High)**
10. **Build the `golems doctor` Dashboard:** Flesh out the `doctor` script to query Supabase and `launchctl` to give you a single command-line view of system health. **(Impact: Medium, Effort: Medium)**
11. **(Optional) Create a Real-time Dashboard:** Build the Vercel/Next.js frontend that subscribes to the `service_runs` table for a live view. **(Impact: Medium (Quality of Life), Effort: Medium)**
