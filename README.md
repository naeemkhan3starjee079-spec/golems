<h1 align="center">Golems</h1>

<p align="center">
  <strong>AI agents that work everywhere you do.</strong><br />
  <sub>Skills, plugins, and autonomous agents — use them in Claude Code, Telegram, any CLI, or Cowork (coming soon).</sub>
</p>

<p align="center">
  <a href="https://etanheyman.com/golems/"><img src="https://img.shields.io/badge/docs-live-1a1a2e?style=flat-square&logo=vercel" alt="Docs" /></a>
  <a href="packages/ralph/"><img src="https://img.shields.io/badge/ralph-autonomous_coding-7b2ff7?style=flat-square" alt="Ralph" /></a>
  <a href="packages/zikaron/"><img src="https://img.shields.io/badge/zikaron-memory_layer-0f3460?style=flat-square" alt="Zikaron" /></a>
</p>

---

## What is this?

Golems is a personal AI agent ecosystem built as a **Bun workspace monorepo**. Each golem is a self-contained **Claude Code plugin** — install one into any Claude session and it brings its skills, rules, and context with it.

**Use golems through any surface:**

| Surface | How | Status |
|---------|-----|--------|
| **Claude Code** | `claude --plugin-dir packages/recruiter` — any golem as a plugin | Live |
| **`/agents`** | Named agent profiles with specialized personalities | Live |
| **Telegram** | ClaudeGolem bot routes to domain golems via Composers | Live |
| **CLI** | `golems status`, `golems doctor`, `golems wizard` | Live |
| **Any AI agent** | Clone the repo, grab the skills/rules you need | Live |
| **Claude Cowork** | Same plugins + skills in collaborative workspace | Coming soon |

It's not a Telegram bot — it's a **collection of skills, rules, MCP tools, and agent profiles** bundled into an ecosystem. Telegram is just one surface. A Codex agent, a Cursor session, or a fresh Claude Code instance can all use golems by pointing at the plugin directory.

Your Mac runs the brain (Telegram bot, Night Shift, memory). Railway runs the body (email polling, job scraping, briefings). Every conversation gets indexed into searchable memory via [Zikaron](packages/zikaron/) (226k+ chunks).

---

## Quick Start

```bash
git clone https://github.com/EtanHey/golems.git && cd golems
bun install
golems wizard      # Interactive setup — picks services, wires keys
golems status      # See what's running
```

**[Full docs →](https://etanheyman.com/golems/)**

---

## Architecture

Three **domain golems** + an **orchestrator** + **service layers**.

### Golems (Autonomous Agents)

| | Golem | Domain | What it does |
|---|---|---|---|
| 👔 | **RecruiterGolem** | Recruitment | Finds contacts via GitHub + Exa + Hunter. Outreach campaigns. 7 interview practice modes with Elo tracking. |
| 💰 | **TellerGolem** | Finance | Categorizes transactions for tax. Payment failure alerts. Monthly expense reports. |
| 🗓️ | **CoachGolem** | Scheduling | Calendar management. Daily plans. Reads status from all other golems. |

### Orchestrator

| | Component | Role |
|---|---|---|
| 🤖 | **ClaudeGolem** | Persistent Telegram bot. Routes messages to golems. Manages Night Shift + briefings. |

### Service Layers

| Component | Role |
|---|---|
| **Jobs** | Background job scraping (Indeed, SecretTLV, Drushim, Goozali). Feeds RecruiterGolem. |
| **Email** | Scores incoming email 0-10. Routes to domain golems. Drafts replies. |
| **Night Shift** | Runs at 4am. Scans repos for TODOs, creates PRs, sends morning briefing. |
| **Shared** | Supabase, LLM abstraction, state store, notifications, event log. |

---

## Packages

```
golems/
├── packages/
│   ├── claude/         # ClaudeGolem — Telegram bot + orchestrator
│   ├── recruiter/      # RecruiterGolem — outreach, contacts, interview practice
│   ├── teller/         # TellerGolem — finance, tax, subscriptions
│   ├── coach/          # CoachGolem — calendar, daily plans
│   ├── jobs/           # Job scraping service (feeds RecruiterGolem)
│   ├── shared/         # Supabase, LLM, email, state, notifications
│   ├── services/       # Night Shift, Briefing, Cloud Worker, Doctor, Wizard
│   ├── content/        # Content creation skills (LinkedIn, ghostwriting)
│   ├── autonomous/     # Legacy test host (test files only)
│   ├── ralph/          # Autonomous coding loop (PRD → stories → code → review)
│   └── zikaron/        # Memory layer (226k+ chunks, semantic search)
├── .claude/agents/     # 7 named agent profiles (/agents)
├── .claude/rules/      # Auto-loaded rules (survives compaction)
├── skills/             # 34 golem-powers skills in 6 categories
├── rules-library/      # Exportable rules for any Claude Code project
├── docs/architecture/  # Architecture decisions (Zikaron-indexed)
├── launchd/            # macOS service plists
└── Dockerfile          # Railway deployment
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| **Runtime** | Bun + TypeScript |
| **LLM** | Claude Code (Opus/Sonnet/Haiku), Gemini CLI, Cursor CLI |
| **Database** | Supabase (Postgres + RLS) |
| **Memory** | sqlite-vec + bge-large-en-v1.5 embeddings (226k+ chunks) |
| **Cloud** | Railway (Docker) |
| **Local** | macOS launchd services |
| **Bot** | grammY (Telegram) |
| **Testing** | Bun test (1179 tests, 4054 assertions) |
| **CI/CD** | GitHub Actions + CodeRabbit + DeepSource |

---

## Deployment

| Environment | What Runs |
|-------------|-----------|
| **Mac (brain)** | Telegram bot, Night Shift, Zikaron, notification server |
| **Railway (body)** | Email poller, job scraper, briefing, cloud LLM (Haiku) |
| **Supabase** | Database, auth, storage |

```
  You ←── Telegram ──→ ClaudeGolem (Mac)
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ Recruiter│  │  Teller  │  │  Coach   │
       │  Golem   │  │  Golem   │  │  Golem   │
       └──────────┘  └──────────┘  └──────────┘
             │              │              │
             └──────┬───────┴──────┬───────┘
                    ▼              ▼
             ┌──────────┐  ┌──────────┐
             │ Services │  │  Zikaron │
             │ (Railway)│  │ (memory) │
             └──────────┘  └──────────┘
```

---

## Telegram

Two topics in the group:
- **General** — interactive ClaudeGolem chat
- **Alerts** — all one-way notifications (jobs, email, nightshift, health)

Commands: `/status` `/trigger` `/tonight` `/morning` `/jobs` `/admin`

---

## CLI

```bash
golems status          # Service overview
golems doctor          # Health checks
golems wizard          # Guided setup
golems skills          # List all skills
golems rules check     # Audit rules for a project
golems scrape          # Trigger job search
golems logs telegram   # View service logs
```

---

## Use as a Plugin

Each golem is a Claude Code plugin. Install one into any session:

```bash
# Use RecruiterGolem for interview practice
claude --plugin-dir ~/Gits/golems/packages/recruiter

# Use TellerGolem for tax categorization
claude --plugin-dir ~/Gits/golems/packages/teller

# Use the whole ecosystem
claude --plugin-dir ~/Gits/golems
```

The plugin brings its CLAUDE.md, skills, MCP tools, and rules automatically.

---

## Agent Profiles

7 named agents via `/agents` — each with specialized system prompts and tool access:

| Agent | Domain |
|-------|--------|
| `recruiter` | Interview practice, outreach, contacts |
| `coach` | Calendar, daily plans, priorities |
| `jobs` | Job scraping, matching, quality |
| `content` | LinkedIn, Soltome, ghostwriting |
| `services` | Night Shift, Briefing, Doctor, Wizard |
| `orchestrator` | Telegram routing, ecosystem coordination |
| `tax-helper` | Bank transactions, deductions, Schedule C |

---

## MCP Servers

| Server | What it does |
|--------|-------------|
| **zikaron** | Search 226k+ indexed conversation chunks — persistent memory across sessions |
| **golems-email** | Email triage — recent, search, subscriptions, urgent, draft replies |
| **golems-jobs** | Job discovery — recent matches, search, stats |
| **supabase** | Database access — tables, SQL, migrations |
| **exa** | Web search — code context, company research |

---

## Links

- **[Documentation](https://etanheyman.com/golems/)** — interactive docs
- **[@GolemZikaronBot](https://t.me/GolemZikaronBot)** — Telegram bot
- **[etanheyman.com](https://etanheyman.com)** — portfolio

---

<sub>Built by <a href="https://github.com/EtanHey">@EtanHey</a> with Claude Code. Golems write code at 4am so you don't have to.</sub>
