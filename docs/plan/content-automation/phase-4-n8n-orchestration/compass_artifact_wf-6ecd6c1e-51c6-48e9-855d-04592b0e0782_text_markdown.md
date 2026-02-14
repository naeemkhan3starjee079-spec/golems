# n8n as the orchestration brain for your Golems ecosystem

**n8n is an excellent fit for orchestrating your Golems agent ecosystem**, and you're in a strong position since you already have a cloud instance running. n8n's **native AI Agent node, MCP client/server support, and LangChain integration** make it the most practical tool for a solo TypeScript developer who wants to wire together specialized agents without rebuilding everything. The key insight from this research: use n8n as a **coordinator that triggers your existing Bun/TypeScript services** via HTTP requests and webhooks rather than trying to reimport all agent logic into n8n itself. Start with your existing n8n Cloud instance for Phase 0, create a `packages/orchestrator` directory in your monorepo for workflow backups, and migrate to self-hosted Railway (~$5/month, unlimited executions) once you've validated the approach in Phase 2.

---

## n8n's AI capabilities are production-ready in 2026

n8n's AI story has matured dramatically. The **AI Agent node** (`n8n-nodes-langchain.agent`) now operates exclusively as a "Tools Agent" (since v1.82.0), built on LangChain's JavaScript framework. It supports four architectural patterns directly relevant to Golems: chained requests (sequential agent calls), single agent with state, multi-agent with gatekeeper (a primary agent delegating to specialists), and multi-agent teams (parallel collaboration).

The **Anthropic Chat Model sub-node** (`n8n-nodes-langchain.lmchatanthropic`) natively supports Claude 3.7 Sonnet, Claude Sonnet 4, and Claude Opus 4, with full tool-use/function-calling support. When connected to the AI Agent node, Claude models can invoke tools during their reasoning loop — querying APIs, writing to databases, sending messages — without custom code. A community template even implements dynamic routing between Sonnet 4 for routine tasks and Opus 4 for complex reasoning.

**MCP integration is bidirectional.** The **MCP Server Trigger** (`n8n-nodes-langchain.mcptrigger`) exposes n8n workflows as tools to external AI agents like Claude Desktop or Claude Code. The **MCP Client Tool** lets n8n AI agents discover and call tools from external MCP servers. Your existing endpoint at `https://etanheyman.app.n8n.cloud/mcp-server/http` can be consumed by any MCP client. For your Golems setup, this means each agent's MCP tools become callable from n8n workflows — the MCP Client Tool node connects to each agent's MCP server, and the AI Agent node dynamically selects which tools to invoke based on the task.

The **January 2026 Human-in-the-Loop release** adds gated tool approval: any tool call can require human sign-off before execution, with approvals routable through Telegram, Slack, or email. This is exactly what you need for content publishing, recruiter outreach, and financial transactions.

For Claude Code/CLI integration, the community node **`@johnlindquist/n8n-nodes-claudecode`** provides dedicated support with local, SSH, or Docker execution modes, persistent sessions via "Continue" operations, and configurable security controls that let you block dangerous commands. This requires self-hosted n8n (the Execute Command node is disabled on n8n Cloud for security).

### The full AI toolkit available in n8n

The LangChain integration (package version **2.6.0**) provides chat model sub-nodes for OpenAI, Anthropic, Gemini, Ollama, Cohere, Groq, DeepSeek, and Mistral — all swappable without modifying agent configuration. Memory nodes include **Postgres Chat Memory** (ideal for your Supabase setup), Redis, MongoDB, and Zep for long-term memory with summaries. Tool nodes include HTTP Request Tool, Code Tool, MCP Client Tool, **Custom n8n Workflow Tool** (which wraps entire workflows as callable tools), Calculator, Vector Store QA, and Think (for chain-of-thought reasoning). The **Supabase Vector Store node** works directly with your pgvector setup for RAG workflows. Critically, **any n8n integration** can be wrapped as an agent tool through the Custom Workflow Tool node, giving your AI agents access to 400+ services.

---

## Self-hosted architecture: Docker on Mac, Railway for production

**Docker is the recommended installation method**, and it's the right choice for your setup. A minimal Docker Compose file gets n8n running in seconds with persistent storage. On an Apple Silicon Mac, n8n idles at roughly **100MB RAM** and handles moderate workflows comfortably at 1–2GB. An 8GB MacBook runs n8n alongside Ollama and your Bun services without issues.

The critical architectural decision is how n8n connects to your Bun/TypeScript services. **The HTTP Request node is your primary bridge** — expose endpoints in your Bun apps and call them from n8n. From Docker, use `http://host.docker.internal:3000` to reach host-machine services. For the reverse direction, n8n's Webhook node creates endpoints your TypeScript services can POST to, triggering workflows programmatically. The Code node supports inline JavaScript (not TypeScript directly), useful for data transformation between steps. For complex logic, keep it in your Bun services and call them via HTTP.

If you need to call Bun scripts directly via shell (Execute Command node), you'll need a custom Dockerfile that installs Bun inside the n8n container, or run n8n natively with `npx n8n`. However, the HTTP approach is cleaner and works identically across local Docker and Railway deployments.

### Railway deployment at $5/month

Railway has **official n8n templates** — deploying is literally one click. The Single Node SQLite template runs n8n for approximately **$5/month** on the Hobby plan, well within your budget. Critical environment variables you must set:

```
N8N_ENCRYPTION_KEY=<random-32-char-string>  # Set once, never change — or credentials break
WEBHOOK_URL=https://<your-app>.up.railway.app/
GENERIC_TIMEZONE=America/New_York
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168
```

Your existing n8n Cloud instance (Starter tier) limits you to **2,500 executions/month**, 5 concurrent workflows, and **320MiB RAM**. More importantly, Cloud **blocks the Execute Command node** entirely, which means no Bun script execution, no Claude CLI sessions. Self-hosted on Railway gives unlimited executions and full node access for a quarter of the Cloud price. The recommended strategy: start with Cloud for validation (you already have it), migrate to Railway self-hosted in Phase 2.

n8n can use **PostgreSQL as its backend database** — you could technically point it at Supabase, but a dedicated Railway Postgres or simply SQLite is simpler and avoids Supabase connection pooler complications. For Telegram webhook testing locally, n8n includes a built-in tunnel (`--tunnel` flag) that creates a public URL pointing to your local instance.

n8n has **native Supabase nodes** for CRUD operations plus a dedicated Supabase Vector Store node for your pgvector embeddings. For complex queries and joins, use the PostgreSQL node with direct connection to Supabase. Telegram integration is excellent — the Telegram Trigger node listens for messages, callback queries, channel posts, and more, while the Action node sends messages, documents, photos, and supports inline keyboards for approval buttons.

---

## Multi-agent orchestration: how to wire Golems through n8n

The orchestration patterns that matter most for Golems fall into three tiers of complexity, and you should adopt them in this order.

### Tier 1: Chained requests with conditional branching

The simplest and most reliable pattern chains n8n nodes sequentially: Schedule Trigger → HTTP Request (call job scraper) → Code (normalize data) → AI Agent (analyze with Claude) → IF/Switch (route based on classification) → Telegram (send result or request approval). Each node hands structured data to the next. Use the **IF node** for binary decisions and the **Switch node** for multi-path routing (e.g., classifying an email as "recruiter," "financial," or "content opportunity"). Always place a Code node between AI output and Switch nodes to parse and normalize the response — raw LLM output is unpredictable.

The **Structured Output Parser** sub-node enforces JSON schema from AI agents, which is essential for reliable branching. Configure it on the AI Agent node to guarantee the output includes specific fields like `classification`, `confidence`, and `suggested_action`.

### Tier 2: Sub-workflows for modular agents

Extract each Golem into its own n8n workflow with an **Execute Sub-workflow Trigger** as its entry point. The orchestrator workflow calls each via the **Execute Sub-workflow** node, passing data as JSON and receiving structured results. Sub-workflow executions **don't count against execution limits**, making this pattern budget-friendly. Each sub-workflow has its own error handling, its own AI Agent configuration, and its own specialized tools.

A critical fix in n8n v2.0 made this pattern reliable: parent workflows now correctly wait for sub-workflows containing Wait nodes (the human-in-the-loop pattern) to fully complete before continuing. Previously, the parent would resume with stale data.

Keep workflows under **50 nodes** and nesting under **3 levels deep**. Pass database IDs between workflows rather than full data payloads. Use the "Define using fields" input mode on sub-workflow triggers to enforce contracts between parent and child.

### Tier 3: Human-in-the-loop approval gates

For actions that shouldn't happen without your sign-off — publishing content, sending recruiter outreach, approving financial transactions — use the **Wait node** set to "On Webhook Call." Before the Wait, send a Telegram message containing approve/reject URLs constructed from `$execution.resumeUrl`:

```
Approve: {{$execution.resumeUrl}}?decision=approve
Reject: {{$execution.resumeUrl}}?decision=reject
```

The workflow pauses until you tap one. After resumption, an IF node checks the `decision` parameter. The Telegram node also supports a native **`sendAndWait` operation** with inline approve/reject buttons, though the webhook resume pattern is more flexible.

**Always set timeout limits on Wait nodes** — executions without timeouts become zombies. Configure a fallback path (e.g., auto-escalate after 24 hours or default to "reject").

### Replacing launchd with n8n scheduling

The **Schedule Trigger** node directly replaces your launchd daemons. Your three current schedules translate to: `0 4 * * *` for the 4am night shift, `*/10 * * * *` for 10-minute email polling, and `*/30 * * * *` for 30-minute job scraping. A single workflow can have multiple trigger nodes — both a Schedule Trigger and a Webhook Trigger — so workflows can run both on schedule and on-demand.

For concurrency control, set `N8N_CONCURRENCY_PRODUCTION_LIMIT=5` to prevent API flooding when multiple workflows fire simultaneously. Excess executions queue in FIFO order. For production scale, Queue Mode (Redis + PostgreSQL + Workers) provides ~7x throughput, but this is overkill for a solo developer — the default single-process mode handles your workload fine.

---

## n8n versus the alternatives: the right tool depends on what you value

### The comparison matrix

| Criterion | n8n | Temporal | Trigger.dev | Windmill | LangGraph | Inngest |
|---|---|---|---|---|---|---|
| Setup effort | Minutes | Hours | Minutes | Minutes | Moderate | Minutes |
| TypeScript-native | JS in nodes | Full TS SDK | TS-first | TS via Deno | LangGraph.js | Native TS |
| AI/LLM built-in | ⭐⭐⭐⭐⭐ | None | Code-based | None | ⭐⭐⭐⭐⭐ | Code-based |
| Visual builder | Best-in-class | None | Dashboard only | DAG builder | Studio (debug) | Dashboard |
| GitHub stars | **174k** | 18k | 13k | 15k | 25k | 4k |
| Self-host cost | Free | Free | Free | Free (<10) | Free (MIT) | Free (BSL) |
| Crash recovery | Manual restart | Gold standard | Checkpoint | Auto-retry | Checkpoint | Step-level |
| MCP support | Native nodes | None | Via npm SDK | None | Via adapters | None |
| RAM footprint | ~516MB | ~832MB | Light | ~287MB | Light | Light |

### n8n wins on breadth and speed; Trigger.dev + LangGraph wins on depth

**n8n** is the best choice if you want to wire things together fast with a visual builder, connect to 400+ services without code, and get built-in AI agent capabilities with MCP support. Its weakness is that the Code node runs JavaScript (not TypeScript), crash recovery requires manual restart, and complex workflows can become visual spaghetti.

**Trigger.dev + LangGraph.js** is the best choice if you want maximum TypeScript integration, durable execution with checkpoint-resume, and sophisticated multi-agent coordination. LangGraph was purpose-built for multi-agent systems with four architectural patterns (network, supervisor, hierarchical, sequential). Trigger.dev has the best TypeScript DX of any tool compared, with Apache 2.0 licensing and a free $5/month cloud credit. The weakness: no visual builder, more code to write, and a smaller community.

**Temporal** is overkill — steep learning curve, ~832MB RAM, complex multi-service setup, and no AI-specific features. It's built for enterprise teams, not solo developers.

**Windmill** is a solid general-purpose alternative to n8n with lower RAM usage (~287MB) and native shell/script execution, but its AI capabilities lag behind n8n and it uses Deno rather than Bun for TypeScript.

### The pragmatic recommendation for Golems

**Start with n8n.** You already have a cloud instance, your agents are loosely coupled through Telegram and Supabase (which n8n integrates with natively), and the visual builder lets you prototype workflows in minutes. n8n's AI Agent node with MCP Client Tool can call your existing MCP servers directly. As your agent logic grows more sophisticated, consider **embedding LangGraph.js inside your Bun services** for complex multi-agent reasoning, while keeping n8n as the trigger/scheduling/integration layer that coordinates everything. This hybrid gives you the best of both worlds: n8n for orchestration, LangGraph for agent intelligence.

---

## Seven concrete workflows for the Golems ecosystem

### 1. Job pipeline: scrape → match → outreach → track

**Trigger:** Schedule Trigger (every 30 minutes, cron `*/30 * * * *`)

```
Schedule Trigger → HTTP Request [POST to your Bun job scraper endpoint]
  → Code [normalize job data into standard schema]
  → HTTP Request [POST to Ollama for local scoring, or use AI Agent with Ollama Chat Model]
  → IF [score > threshold?]
    → True: Supabase [insert high-match job]
      → AI Agent with Anthropic Chat Model [draft personalized outreach message]
      → Telegram [send draft + approve/reject buttons via sendAndWait]
      → IF [approved?]
        → True: HTTP Request [execute outreach via recruiter agent API]
          → Supabase [update job status to "outreach_sent"]
        → False: Supabase [update status to "skipped"]
    → False: Supabase [insert low-match job, status "archived"]
```

**Error handling:** Retry On Fail enabled on HTTP Request nodes (3 attempts, 30-second delay). Error workflow sends Telegram alert with failed job details. The Ollama scoring step uses a fallback — if Ollama is unreachable, fall through to Claude API scoring via the AI Agent node.

### 2. Content pipeline: research → draft → review → publish

**Trigger:** Schedule Trigger (daily at 9am) or Webhook (manual trigger from Telegram command)

```
Schedule Trigger → Supabase [query content_ideas table for pending topics]
  → AI Agent with Anthropic Chat Model + HTTP Request Tool [research trending topics via web search]
  → Code [compile research summary + topic brief]
  → AI Agent with Anthropic Chat Model [draft LinkedIn post, system prompt includes brand voice guidelines]
  → Telegram [send draft + "Approve / Edit / Reject" inline keyboard via sendAndWait]
  → Switch [check response]
    → "approve": HTTP Request [POST to LinkedIn API or content scheduler]
      → Supabase [update content status to "published", store post URL]
      → Telegram ["✅ Published successfully"]
    → "edit": Telegram ["Send your edits"] → Wait [on webhook, timeout 4 hours]
      → AI Agent [revise draft with edits] → loop back to Telegram approval
    → "reject": Supabase [mark rejected] → Telegram ["Noted, skipping"]
```

### 3. Finance pipeline: categorize → report → alert

**Trigger:** Schedule Trigger (daily at 11pm) or Webhook (real-time bank notification)

```
Schedule Trigger → HTTP Request [call finance tracker Bun endpoint to fetch new transactions]
  → AI Agent with Anthropic Chat Model [categorize each transaction, output structured JSON]
  → Supabase [batch insert categorized transactions]
  → Code [calculate daily/weekly spend summaries, compare to budget thresholds]
  → IF [over budget in any category?]
    → True: Telegram ["⚠️ You've spent $X on dining this week, $Y over budget"]
  → IF [is Sunday?]
    → True: AI Agent [generate natural-language weekly financial summary]
      → Telegram [send weekly report with spending breakdown]
```

### 4. Morning briefing: cross-agent intelligence pull

**Trigger:** Schedule Trigger (7:00am daily, cron `0 7 * * *`)

```
Schedule Trigger
  → Execute Sub-workflow [Job Stats] — queries Supabase for new matches, pending outreach, response rates
  → Execute Sub-workflow [Finance Summary] — yesterday's spending, budget status, upcoming bills
  → Execute Sub-workflow [Schedule Check] — today's calendar items via coach agent API
  → Execute Sub-workflow [Content Status] — pending drafts, scheduled posts, engagement metrics
  → Code [merge all sub-workflow outputs into unified briefing object]
  → AI Agent with Anthropic Chat Model [compose a concise, natural-language morning briefing]
  → Telegram [send formatted briefing to main chat topic]
```

Each sub-workflow is a simple 3–5 node sequence: trigger → Supabase query or HTTP request → Code (format output) → return. This pattern keeps each sub-workflow independently testable.

### 5. Reactive email routing: triage → classify → respond

**Trigger:** Schedule Trigger (every 10 minutes) or Gmail Trigger (if using n8n's native Gmail integration)

```
Schedule Trigger → HTTP Request [call email polling Bun endpoint, or use Gmail node to fetch unread]
  → Split In Batches [process each email individually]
  → AI Agent with Anthropic Chat Model [classify: recruiter, financial, newsletter, personal, spam]
  → Switch [route by classification]
    → "recruiter": HTTP Request [forward to recruiter agent] → Supabase [log] → Telegram ["📧 Recruiter email from [company]"]
    → "financial": HTTP Request [forward to finance tracker] → Supabase [log]
    → "newsletter": Code [extract key points] → Supabase [store for weekly digest]
    → "personal": Telegram [send notification with quick-reply options]
    → "spam": Gmail [archive/delete] → Supabase [log for training]
  → Error branch: Telegram ["Failed to process email: [subject]"]
```

### 6. Night shift orchestration: 4am autonomous work

**Trigger:** Schedule Trigger (4:00am daily, cron `0 4 * * *`)

```
Schedule Trigger
  → Execute Sub-workflow [Job Scraping] — full scrape cycle across all sources
  → Execute Sub-workflow [Email Backlog] — process any emails received overnight
  → Execute Sub-workflow [Finance Sync] — pull latest transaction data, categorize
  → Execute Sub-workflow [Content Generation] — draft 1-2 content pieces for review
  → Execute Sub-workflow [Memory Consolidation] — call Zikaron to summarize/compress recent interactions
  → Code [compile night shift report: what was done, what needs attention, any errors]
  → Supabase [store night shift execution log]
  → Wait [until 7am, "At Specified Time"]
  → Telegram [send night shift summary as part of morning briefing]
```

The key design choice: sub-workflows run **sequentially** (not parallel) to avoid overwhelming your Mac or Railway instance. Each sub-workflow has its own timeout (30 minutes max) and error handling that logs failures without stopping the entire night shift.

### 7. Health monitoring: heartbeat checks across all agents

**Trigger:** Schedule Trigger (every 5 minutes, cron `*/5 * * * *`)

```
Schedule Trigger
  → HTTP Request [ping job scraper /health endpoint] → Set [status: "job_scraper"]
  → HTTP Request [ping recruiter agent /health] → Set [status: "recruiter"]
  → HTTP Request [ping finance tracker /health] → Set [status: "finance"]
  → HTTP Request [check Supabase connectivity via simple SELECT 1]
  → HTTP Request [check Railway service status API]
  → Merge [combine all health check results]
  → Code [evaluate: any failures? any degraded response times?]
  → IF [any service down?]
    → True: Telegram ["🚨 Service down: [service_name], error: [details]"]
      → Supabase [log incident with timestamp]
    → False: no action (silent success)
```

Add **Continue On Fail** to each HTTP Request node so a single service being down doesn't prevent checking the others. The Code node aggregates results and generates a health status object. For response time monitoring, use the `$json.responseTime` from HTTP Request nodes and alert if any exceeds your threshold (e.g., 5 seconds).

---

## Where n8n should live: packages/orchestrator is the answer

After evaluating four options, **creating a new `packages/orchestrator` directory** is the clear winner. n8n is fundamentally a standalone runtime — it runs its own Node.js server, stores workflows in its own database, and has its own UI. It doesn't fit *inside* a TypeScript package. But its configuration, workflow backups, and documentation absolutely belong in your monorepo.

Here is the recommended structure:

```
packages/orchestrator/
├── docker-compose.yml            # n8n + supporting services (for local dev)
├── docker-compose.railway.yml    # Railway-specific overrides
├── .env.example                  # Environment variable template
├── workflows/                    # Exported workflow JSON backups
│   ├── morning-briefing.json
│   ├── job-pipeline.json
│   ├── email-triage.json
│   ├── night-shift.json
│   └── health-monitor.json
├── scripts/
│   ├── backup-workflows.sh       # n8n CLI export to this directory
│   ├── restore-workflows.sh      # n8n CLI import from backups
│   └── setup.sh                  # First-time setup helper
├── legacy/
│   └── launchd/                  # Archived launchd plist files after migration
├── docs/
│   └── workflow-catalog.md       # Documentation of all workflows + webhook URLs
├── package.json
└── README.md
```

The other options don't hold up. **Option (a), inside packages/autonomous**, conflates two different runtime paradigms and makes the autonomous package responsible for too much. **Option (c), a packages/services package**, is premature abstraction — you can always refactor later if you add more services. **Option (d), standalone outside the monorepo**, disconnects workflow backups from the codebase, making version control harder.

The **n8n Cloud factor** doesn't change this recommendation. Since Cloud runs externally, your orchestrator package becomes a lightweight home for workflow exports, webhook documentation, and migration scripts. When you eventually move to self-hosted, the Docker Compose file is already there.

For **workflow version control**, build an n8n workflow that auto-backs up to GitHub daily: Schedule Trigger (2am) → n8n API (get all workflows) → Code (format as JSON files) → GitHub node (commit to packages/orchestrator/workflows/). For self-hosted, the CLI command `n8n export:workflow --all --output=./packages/orchestrator/workflows/` works as a manual alternative.

---

## Implementation roadmap: from zero to fully orchestrated in 10 weeks

### Phase 0: prove value in one day (Week 1, ~8 hours)

**MVP workflow: Morning Briefing.** This is the single highest-impact, lowest-risk starting point because it's purely additive — it doesn't replace anything, just adds a new daily summary. Log into your existing n8n Cloud instance, configure Supabase and Telegram credentials, and build a 6-node workflow: Schedule Trigger (8am) → Supabase (query pending items) → HTTP Request (check email summary) → Code (format briefing) → Telegram (send message). Create `packages/orchestrator/` and export the workflow JSON.

**Success criteria:** The briefing arrives reliably for 5 consecutive days. **Risk factor:** n8n Cloud's 2,500 execution limit is more than sufficient for Phase 0.

### Phase 1: core integrations and first migration (Weeks 2–3, ~17 hours)

Set up the **Telegram command router** — a workflow with Telegram Trigger that listens for bot messages, uses a Switch node to route commands (`/jobs`, `/finance`, `/content`, `/status`) to appropriate sub-workflows. Establish the **webhook bridge** by creating n8n webhook endpoints your existing TypeScript services can call. Configure PostgreSQL credentials for direct Supabase queries.

**Migrate your simplest launchd job first.** Use the "Shadow Mode" pattern: keep launchd active, create the equivalent n8n workflow, run both for one week comparing outputs, then disable launchd. Archive the plist file in `packages/orchestrator/legacy/`. The feature-flag pattern (`USE_N8N_ORCHESTRATION=true` in your .env) allows instant rollback.

### Phase 2: core workflows and self-hosted migration (Weeks 4–6, ~29 hours)

Build the **email triage workflow** and **job pipeline** — these deliver the most daily value. Implement the **global error handling workflow** (Error Trigger → format details → Telegram alert → Supabase log). Set up the automated workflow backup to GitHub.

**Migrate to self-hosted Railway** during this phase. Deploy using Railway's one-click n8n template (~5 minutes). Set `N8N_ENCRYPTION_KEY` and `WEBHOOK_URL`. Update your service endpoints. This gives you unlimited executions and access to the Execute Command node for ~$5/month versus Cloud's $24/month Starter tier.

### Phase 3: full orchestration (Weeks 7–10, ~25 hours)

Build the **Night Shift orchestration** workflow, **cross-agent coordination** patterns (Zikaron → Soltome → Telegram chains), and the **health monitoring** heartbeat. Migrate all remaining launchd jobs. Create the sub-workflow library for reusable patterns. By the end of this phase, all scheduled jobs run through n8n and no launchd dependencies remain.

### Phase 4: optimization (ongoing, ~3 hours/week)

Review execution history for bottlenecks. Add new workflows as needs arise. Implement A/B testing for agent configurations. Build a Telegram-based system dashboard. Consider Queue Mode (Redis + Workers) only if you hit concurrency limits — unlikely for a solo developer.

**Total estimated investment through Phase 3: 70–90 hours over 10 weeks** (~7–9 hours per week). The morning briefing alone will prove n8n's value within the first week, and each subsequent phase compounds the automation benefits.

---

## Conclusion

n8n occupies a unique position in your stack: it's the **visual control plane** that sits above your specialized Golems agents, triggering them on schedules and webhooks, routing data between them, gating irreversible actions with human approval, and monitoring system health. It doesn't replace your agents' intelligence — it coordinates it. The MCP Client Tool node means your existing agent tools are directly callable from n8n workflows without reimplementation. The January 2026 Human-in-the-Loop feature makes approval gates a first-class citizen rather than a hack.

The strongest architectural pattern for Golems is **n8n as trigger/scheduler/router** with your Bun services as the execution layer, communicating via HTTP requests and webhooks. This keeps your TypeScript code as the source of truth for business logic while n8n handles the "when, what order, and what if it fails" questions. If you later need more sophisticated multi-agent reasoning (agents that negotiate, plan together, or dynamically form teams), embed LangGraph.js inside your Bun services and let n8n invoke those LangGraph-powered endpoints. Start with Cloud this week, ship the Morning Briefing workflow today, and migrate to Railway self-hosted once you're convinced — which, based on this research, should take about three days of actual use.