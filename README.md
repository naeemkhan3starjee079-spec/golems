<p align="center">
  <img src="packages/docsite/static/img/golems-logo.svg" alt="Golems Logo" width="120" />
</p>

<h1 align="center">Golems</h1>

<p align="center">
  <strong>Autonomous AI Agent Ecosystem</strong><br />
  <sub>Spawn → Work → Die → Remember</sub>
</p>

<p align="center">
  <a href="https://etanhey.github.io/golems/"><img src="https://img.shields.io/badge/docs-etanhey.github.io/golems-1a1a2e?style=flat-square" alt="Docs" /></a>
  <a href="https://etanheyman.com/projects/golems"><img src="https://img.shields.io/badge/site-etanheyman.com-e94560?style=flat-square" alt="Site" /></a>
  <a href="packages/ralph/"><img src="https://img.shields.io/badge/Ralph-Autonomous_Coding-7b2ff7?style=flat-square" alt="Ralph" /></a>
  <a href="packages/zikaron/"><img src="https://img.shields.io/badge/Zikaron-Memory_Layer-0f3460?style=flat-square" alt="Zikaron" /></a>
</p>

---

```
   ┌──◇──────────────◇──┐
   │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│        Golems is an ecosystem of AI agents that
◇──┤▒▒┌──────────────┐▒▒├──◇     run autonomously on your machine.
   │▒▒│  א   מ   ת  │▒▒│
◇──┤▒▒└──────────────┘▒▒├──◇     They scrape jobs, triage email, track finances,
   │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│        write code at 4am, and report back via Telegram.
   │▒▒┌────┐▒▒┌────┐▒▒│
   │▒▒│█▓▓█│▒▒│█▓▓█│▒▒│        Each golem owns a domain, not an I/O channel.
◇──┤▒▒│█▓▓█│▒▒│█▓▓█│▒▒├──◇     Every session is indexed into searchable memory.
   │▒▒└────┘▒▒└────┘▒▒│
   │▒▒▒▒◇──◇──◇──◇▒▒▒▒│        Your Mac is the brain. Railway is the body.
   │▒▒▒▒▒┌────────┐▒▒▒▒│
   │▒▒▒▒▒│ {···}  │▒▒▒▒│        Built with Claude Code, Bun, and too much coffee.
   └──◇────────╤───────◇──┘
 ◇──◇          │          ◇──◇
```

---

## The Golems

| | Golem | What It Does |
|---|---|---|
| **🤖** | [**ClaudeGolem**](packages/autonomous/) | Persistent Claude sessions per project. Manages Night Shift, content, interactive Telegram chat. |
| **📧** | [**EmailGolem**](packages/autonomous/) | Scores and categorizes incoming email. Routes to domain golems. Drafts replies. |
| **💼** | [**RecruiterGolem**](packages/autonomous/) | Finds contacts via GitHub + Exa + Hunter. Runs outreach campaigns. 7 interview practice modes. |
| **💰** | [**TellerGolem**](packages/autonomous/) | Tax categorization, payment failure alerts, monthly expense reports. |
| **🎯** | [**JobGolem**](packages/autonomous/) | Scrapes Indeed, SecretTLV, Drushim, Goozali. LLM-scores matches against your profile. |
| **🌙** | [**NightShift**](packages/autonomous/) | Autonomous 4am code improvements. Creates PRs across repos. Sends morning briefings. |

---

## Packages

### [`ralph`](packages/ralph/) — Autonomous Coding Loop

PRD-driven development: write stories in JSON, Ralph executes them with Claude Code, runs CodeRabbit review, commits when green.

```bash
./ralph.zsh 5   # Execute 5 stories autonomously
```

Smart model routing (Opus → plan, Sonnet → implement, Haiku → verify), git worktree isolation, cost tracking, hang detection.

### [`zikaron`](packages/zikaron/) — Memory Layer

Indexes 200k+ Claude conversation chunks into searchable memory using sqlite-vec and bge-large-en-v1.5 embeddings.

```bash
zikaron search-fast "how to handle auth"   # <2s semantic search
```

Hybrid search (BM25 + vector), FastAPI daemon, Rich TUI dashboard.

### [`autonomous`](packages/autonomous/) — Telegram Bot + Golem Orchestration

All 6 golems live here. Scheduled via launchd (Mac) and Railway (cloud). Telegram bot for human-in-the-loop control.

```bash
bun run bot          # Start Telegram bot
bun run nightshift   # Trigger Night Shift manually
```

### [`docsite`](packages/docsite/) — Documentation

Docusaurus site with interactive terminal hero, ASCII golem mascot, and Telegram mock. Live at [etanhey.github.io/golems](https://etanhey.github.io/golems/).

### [`admin-ui`](packages/admin-ui/) — Dashboard

Vite + React admin dashboard. 7 pages: golem status, email triage, job matches, finances, nightshift logs, system health, settings.

---

## Architecture

```
                    ┌─────────────────┐
                    │   You (Telegram) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  Telegram   │  │   Night    │  │  Morning   │
     │    Bot      │  │   Shift    │  │  Briefing  │
     └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
            │               │               │
            └───────┬───────┴───────┬───────┘
                    ▼               ▼
           ┌──────────────┐  ┌──────────────┐
           │   Golems     │  │   Ralph      │
           │  (6 agents)  │  │  (PRD loop)  │
           └──────┬───────┘  └──────┬───────┘
                  │                 │
                  └────────┬────────┘
                           ▼
                  ┌──────────────────┐
                  │     Zikaron      │
                  │  (memory layer)  │
                  └──────────────────┘

  Mac (brain)                    Railway (body)
  ─────────────                  ──────────────
  Telegram Bot                   Email Poller
  Night Shift                    Job Scraper
  Notification Server            Briefing Generator
  Zikaron Memory                 Soltome Learner
```

---

## Quick Start

```bash
git clone https://github.com/EtanHey/golems.git
cd golems

# Check ecosystem health
golems status

# Run autonomous coding loop
cd packages/ralph && ./ralph.zsh 5

# Search past conversations
cd packages/zikaron && pip install -e . && zikaron search-fast "auth patterns"

# Start Telegram bot
cd packages/autonomous && bun install && bun run bot
```

**Full setup guide:** [Getting Started](https://etanhey.github.io/golems/docs/getting-started)

---

## CLI Helpers

Golems orchestrates multiple AI tools — Claude is the brain, helpers handle the grunt work:

| Tool | Model | Use | Cost |
|------|-------|-----|------|
| **Gemini** | 2.5 Pro | Research, web search, doc audits | Free |
| **Cursor** | Opus 4.6 / GPT-5.2 | Codebase sweeps, CSS, @codebase indexing | $20/mo |
| **Codex** | GPT-5.3 | Sandboxed code gen, reviews | ChatGPT Plus |
| **Kiro** | Various | Knowledge base, custom agents | Free |

---

## Skills

34 golem-powers skills in [`skills/`](skills/), organized into 6 categories:

**Development** — commit, PR creation, test plans, worktrees, TDD
**Operations** — 1password, Convex, Supabase, Brave browser automation
**Content** — drafting, publishing, style adaptation
**Review** — CodeRabbit workflows, critique waves, context audits
**AI Tools** — interview practice, LSP intelligence, zikaron memory
**Meta** — skill discovery, skill authoring, project context

```bash
golems skills          # List all available skills
golems skills search   # Search by keyword
```

---

## Links

- **[Documentation](https://etanhey.github.io/golems/)** — full docs with interactive demos
- **[etanheyman.com/projects/golems](https://etanheyman.com/projects/golems)** — project page
- **[@GolemZikaronBot](https://t.me/GolemZikaronBot)** — Telegram bot (live)
- **[soltome.com](https://soltome.com)** — AI agent discussion (ClaudeGolem posts here)

---

<sub>Built by <a href="https://github.com/EtanHey">@EtanHey</a> with Claude Code.</sub>
