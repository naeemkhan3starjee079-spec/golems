# Hosting a lightweight Bun monorepo: three options dissected

**Railway remains the strongest choice for unattended 24/7 cron workloads at this scale.** For a ~50MB Bun app with 4 cron jobs and a health endpoint, Railway's $5/month Hobby plan delivers native cron scheduling, seamless GitHub auto-deploy, and automatic crash recovery — all without requiring you to maintain infrastructure. Coolify on Hetzner can cut the bill to ~€4.50/month but trades money for time, security responsibility, and 4 AM risk. Fly.io has no free tier for new users and would cost $2–4/month with weaker cron and alerting support. The real question isn't cost — it's how much you value sleeping through the night.

## Railway does the most with the least effort

Railway's developer experience is consistently praised as the best in this category, and for good reason. Connect a GitHub repo, push to main, and your Dockerfile builds and deploys in under two minutes. No YAML files, no CLI tools, no configuration ceremony.

**Native cron scheduling is Railway's killer feature for this workload.** You define cron jobs as separate services with standard crontab expressions directly in the dashboard. Each service spins up on schedule, executes, and exits — meaning you only pay for actual compute during execution, not 24/7 runtime for cron workers. The Hobby plan supports **50 cron jobs per project**, with a minimum 5-minute interval. Railway handles the orchestration, and if a previous run is still executing when the next trigger fires, the new run is skipped rather than stacking.

Auto-restart is configurable: the "Always" restart policy (available on paid plans with unlimited restarts) uses exponential backoff to recover crashed services automatically. At 4 AM, a crashed service restarts without intervention. The weakness: **health checks only run during deployments**, not continuously. A silently hanging process won't be detected without external monitoring like Uptime Kuma. Monitoring dashboards show CPU, RAM, disk, and network metrics automatically, but **alerting requires the $20/month Pro plan** — Hobby users get metrics but no notifications.

The $5 Hobby plan includes $5 of usage credits. A 50MB Bun app running continuously costs roughly $0.50/month in memory alone. Four brief cron executions add negligible cost. **Most lightweight workloads fit comfortably within the $5 credit**, making the effective cost just the $5 subscription. The risk is cost escalation: one developer documented costs growing from $5 to $80/month over six months as their app scaled, and Railway's billing FAQ explicitly states they won't help diagnose why your bill increased.

## Coolify on Hetzner saves money but costs time and sleep

Coolify is a self-hosted PaaS running on your own VPS — an open-source alternative to Railway with **~50,400 GitHub stars** and rapid development under primary maintainer Andras Bacsai. It runs on a Hetzner CX22 (2 vCPU, 4GB RAM, 40GB NVMe, ~€4.50/month including IPv4) and gives you full control over your deployment infrastructure.

The GitHub auto-deploy story is solid. Coolify creates a private GitHub App that fires webhooks on push, triggering automatic builds and deploys. Preview deployments for pull requests work out of the box. The setup takes 15–30 minutes initially, and subsequent pushes deploy automatically. Coolify also has **built-in scheduled tasks** using cron syntax that execute commands inside containers via `docker exec`, with execution history visible in the UI. However, Coolify's cron implementation has known reliability issues: tasks can silently stop working due to Redis connection timeouts, there's no mutex/locking to prevent overlapping runs, and successful runs don't always log properly. For critical cron jobs, **in-app scheduling with node-cron is more reliable** than Coolify's built-in scheduler.

The real cost of Coolify is measured in hours, not euros. Here's what self-hosting actually requires:

- **Coolify's overhead consumes ~1–1.5GB RAM** at idle (PostgreSQL, Redis, Traefik, Soketi, the dashboard itself). On a 4GB server with your 50MB app, you'll use roughly 1.5–2GB, leaving ~2GB free — workable but tight during Docker builds, which can spike to 3–4GB and make the dashboard unresponsive
- **Disk space is the most common failure mode.** Docker images, build cache, and orphaned volumes accumulate rapidly on 40GB. Coolify has built-in Docker cleanup (configurable via cron), but users regularly report cleanup getting stuck or failing silently. Multiple GitHub issues document disk usage jumping from 15GB to 46GB without explanation
- **Updates arrive every 2–4 weeks** on the production channel. Most are painless (click "Update" in the UI), but migration failures between versions have bricked instances. Users have reported losing environment variables and encryption keys after clicking the update button multiple times during a slow update

**A critical security disclosure in January 2026 revealed 11 vulnerabilities with CVSS scores from 9.4 to 10.0**, including command injection flaws allowing full server compromise and exposure of root SSH keys to low-privileged users. Approximately 52,890 Coolify instances were exposed worldwide. Patches were released, but this underscores a fundamental truth: **self-hosting means security is your responsibility**, and a single missed update can be catastrophic.

The 4 AM scenario for Coolify: Docker's restart policy handles crashed containers automatically, and Coolify sends notifications via Discord, Slack, email, Telegram, or webhooks. But **Coolify does not auto-restart "unhealthy" containers** — only crashed ones. A process that hangs (returning 500s but not exiting) will stay broken until you manually intervene. Realistic maintenance burden: **1–3 hours per month** for updates, OS patching, and disk monitoring, plus unpredictable debugging sessions 2–3 times per year when something breaks.

## Fly.io is neither free nor simple for this workload

The most important fact about Fly.io: **there is no free tier for new users.** Fly.io's own documentation explicitly states this. The "free trial" offers 2 hours of machine runtime or 7 days of access, whichever expires first. After that, a credit card is required. Fly.io informally waives invoices under $5/month for personal organizations, but this is an undocumented policy described internally as "keep this on the down low" — it could disappear without notice.

For your workload running 24/7 on a shared-cpu-1x with 256MB RAM, **expect roughly $2–4/month** in compute costs. A dedicated IPv4 address adds $2/month (avoidable by using shared IPv4 or IPv6-only). This likely falls under the informal $5 waiver, but you're building on a policy that isn't contractual.

Fly.io has **no native cron scheduling**. The recommended approach is in-app scheduling (node-cron or similar) running inside an always-on machine with `auto_stop_machines = false`. Fly.io does offer a `cron-manager` project that spins up ephemeral machines per job, but it requires its own always-on machine (~$2/month extra) and adds complexity. The Machines API supports basic interval scheduling (hourly, daily, weekly) but not fine-grained expressions like "3x daily at specific times."

Auto-deploy requires GitHub Actions setup — a YAML workflow that installs `flyctl` and runs `flyctl deploy --remote-only`. It works reliably but requires more configuration than Railway's zero-config approach. Fly.io introduced a native auto-deploy toggle in late 2024, but community reports suggest it's still immature.

The monitoring story is surprisingly strong: **built-in Prometheus metrics with managed Grafana dashboards** showing HTTP response times, CPU, memory, and network — all free. But there are **no native alerting or billing alerts**. If your machine hangs but doesn't crash, health check failures only affect traffic routing; they don't trigger restarts. The `on-fail` restart policy handles process crashes (up to 10 retries), but a frozen event loop stays frozen until you notice.

Fly.io's reliability has been publicly questioned. CEO Kurt Mackey authored a post titled "Reliability: It's Not Great," acknowledging months of proxy issues, connectivity problems, and hung deployments. Community reports include multi-hour outages where the status page showed green, and billing surprises from volumes that continue billing after apps are stopped.

## The 4 AM test reveals the real differences

The defining question for unattended cron workloads isn't features — it's what happens when nobody's watching. Here's how each platform handles a process crash at 4 AM:

| Scenario | Railway | Coolify + Hetzner | Fly.io |
|---|---|---|---|
| **Process crashes (exit code ≠ 0)** | Auto-restart with exponential backoff, unlimited retries on paid plan | Docker restart policy auto-restarts; notification sent via configured channels | Auto-restart via `on-fail` policy, up to 10 retries |
| **Process hangs (still running, unresponsive)** | Not detected without external monitoring; health checks only run during deploys | Not detected; Coolify doesn't restart unhealthy containers | Health check fails → traffic routes away, but machine stays in broken state |
| **Cron job silently fails** | Railway's cron service either runs or doesn't start — visible in deployment logs | Coolify cron tasks can silently stop due to Redis timeouts; in-app cron more reliable | No native cron; in-app scheduler only runs while process is healthy |
| **Server/infrastructure failure** | Railway manages infrastructure — transparent to you | Your responsibility; Hetzner provides hardware but you manage recovery | Fly.io manages infrastructure |
| **Alerting** | Pro plan only ($20/month); Hobby has no alerts | 7 notification channels (Discord, email, Slack, etc.) for crashes and deploys | No native alerting; requires external Grafana or uptime monitoring |

**Railway wins the 4 AM test for simplicity**: crashes auto-recover, and the infrastructure isn't your problem. Coolify actually has better alerting (multi-channel notifications on the $5 tier vs Railway's Pro-only alerts), but you're also responsible for the server itself failing. Fly.io sits in the middle — managed infrastructure but weaker recovery for non-crash failures.

## Alternatives worth knowing about

**Oracle Cloud Free Tier** offers the most generous free compute: up to 4 ARM OCPUs with 24GB RAM, free forever. For a 50MB Bun app, this is absurdly overpowered at zero cost. The catch is significant: you must manually provision a VM, install Docker, configure firewall rules, set up your own CI/CD pipeline, and manage everything yourself. Oracle may reclaim instances idle for 7+ days (your cron jobs would prevent this). ARM instances frequently show "out of host capacity" errors during provisioning. Some users report account closures on inactive free accounts. This is the cheapest option at $0/month but carries the highest setup and maintenance burden — essentially Coolify-level self-hosting without Coolify's UI.

**Northflank's free tier** deserves attention: 2 services, 2 jobs, built-in cron scheduling, Dockerfile support, always-on with no spin-down. It's the closest to a "free Railway" for this workload, though its smaller community means less troubleshooting help available.

**Render's free tier** is unsuitable: web services spin down after 15 minutes of inactivity, and cron jobs cost $1/month each ($4/month for your four jobs). A paid Render setup would run $11–15/month — more expensive than Railway. **Koyeb's free tier** offers a single always-on service with 512MB RAM and 0.1 vCPU, viable for in-app cron scheduling but with very constrained CPU.

## Conclusion

The decision matrix for this workload is surprisingly clear. **Railway at $5/month is the right choice if you value reliability and unattended operation** — native cron, zero-config deploys, automatic crash recovery, and zero infrastructure maintenance. The $5 included credit likely covers your entire workload. The missing piece is Hobby-tier alerting, solvable with a free Uptime Kuma instance or UptimeRobot.

Coolify on Hetzner makes sense if you plan to host multiple projects on one server — the marginal cost of adding services to an existing Coolify instance is zero, amortizing the maintenance burden. For a single lightweight app, the **1–3 hours/month of maintenance and security responsibility outweigh the $0.50/month savings** versus Railway. The January 2026 CVE disclosure (11 critical vulnerabilities, CVSS up to 10.0) is a concrete reminder of what self-hosting security responsibility looks like.

Fly.io occupies an awkward middle ground for this workload: no free tier, no native cron, more setup than Railway, and documented reliability concerns — all for a savings of $1–3/month compared to Railway. Its strengths (global edge deployment, Firecracker micro-VMs, excellent metrics) don't align with the needs of a single-region cron worker.

**The pragmatic move: stay on Railway.** The $5/month buys engineering time back and guarantees that your cron jobs run whether you're awake or not.