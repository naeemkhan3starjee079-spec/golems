# Golems

> Autonomous AI agent ecosystem — coding loops, memory, and orchestration.

[![Docs](https://img.shields.io/badge/Docs-etanhey.github.io/golems-blue)](https://etanhey.github.io/golems/)
[![Ralph](https://img.shields.io/badge/Ralph-Autonomous_Coding-purple)](packages/ralph/)
[![Zikaron](https://img.shields.io/badge/Zikaron-Memory_Layer-blue)](packages/zikaron/)
[![Autonomous](https://img.shields.io/badge/Autonomous-Telegram_Bots-green)](packages/autonomous/)

```
golems/
├── packages/
│   ├── ralph/          # Autonomous AI coding loop (PRD → implement → review → commit)
│   ├── zikaron/        # Memory layer - indexes Claude conversations for search
│   ├── autonomous/     # Telegram bot, Night Shift, golem orchestration
│   ├── docsite/        # Documentation site (Docusaurus)
│   ├── golems-tui/     # React Ink CLI dashboard
│   └── admin-ui/       # Web admin dashboard (Vite + React)
├── skills/             # 34 golem-powers skills
├── contexts/           # Shared Claude context files
└── docs/               # Architecture + plan
```

---

## Packages

### Ralph (`packages/ralph/`)

Autonomous AI coding loop that executes PRD stories with self-correction.

```bash
cd packages/ralph
./ralph.zsh 5  # Run 5 stories
```

**Features:**
- PRD-driven development (JSON story format)
- CodeRabbit integration for AI code review
- Smart model routing (Opus for planning, Sonnet for implementation, Haiku for verification)
- Git worktree isolation
- Telegram notifications on completion
- Cost tracking and hang detection

### Zikaron (`packages/zikaron/`)

Memory layer that indexes Claude Code conversations for semantic search.

```bash
cd packages/zikaron
pip install -e .
zikaron search-fast "how to handle auth"
```

**Features:**
- Indexes 200k+ conversation chunks
- **sqlite-vec** for fast vector search (<2s queries)
- **bge-large-en-v1.5** embeddings (1024 dims, local)
- Hybrid search (BM25 + semantic)
- FastAPI daemon for instant queries
- Interactive dashboard (Rich TUI)

### Autonomous (`packages/autonomous/`)

Telegram bot, scheduled automation, and social presence.

```bash
cd packages/autonomous
bun install && bun run bot
```

**Components:**
- **Telegram Bot** - Chat with Claude, notifications, draft approval
- **Night Shift** (4am) - Autonomous code improvements → PR
- **Morning Briefing** (8am) - Daily summary with PR links
- **Email Golem** - Smart email triage with Ollama scoring
- **Soltome Presence** - Posts to [soltome.com](https://soltome.com) as ClaudeGolem

---

## Quick Start

```bash
git clone https://github.com/EtanHey/golems.git
cd golems

# CLI dashboard
golems status

# Autonomous coding loop
cd packages/ralph && ./ralph.zsh 5

# Memory search
cd packages/zikaron && pip install -e . && zikaron search-fast "auth patterns"

# Telegram bot
cd packages/autonomous && bun install && bun run bot
```

Full setup: [Getting Started](https://etanhey.github.io/golems/getting-started)

---

## Golems

| Golem | Role | Status |
|-------|------|--------|
| **ClaudeGolem** | Orchestrator — runs Claude Code sessions per project | ✅ Active |
| **EmailGolem** | Smart email triage, routing, draft replies | ✅ Active |
| **RecruiterGolem** | Job matching, outreach, interview practice (7 modes) | ✅ Active |
| **TellerGolem** | Financial tracking, subscription alerts | ✅ Active |
| **JobGolem** | Job board scraping + LLM filtering | ✅ Active |
| **NightShift** | 4am autonomous improvements → PR | ✅ Active |

## CLI Helpers

Golems orchestrates 4 free CLI AI tools alongside Claude:

| Tool | Use | Cost |
|------|-----|------|
| **Gemini** | Research, opinions, web search | Free |
| **Cursor** | Codebase sweeps, CSS, frontend | $20/mo |
| **Codex** | Isolated code gen, reviews | ChatGPT Plus |
| **Kiro** | Knowledge base, custom agents | Free |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER                                                                │
│  Telegram / CLI                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  AUTONOMOUS (packages/autonomous/)                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Telegram    │  │ Night Shift │  │ Email Golem │  │ Soltome    │ │
│  │ Bot         │  │ (4am PRs)   │  │ (triage)    │  │ Presence   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  RALPH (packages/ralph/)                                             │
│  PRD → Story → Claude Code → CodeRabbit → Commit                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  ZIKARON (packages/zikaron/)                                         │
│  Conversations → Chunk → Embed → Index → Search                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Links

- [Documentation](https://etanhey.github.io/golems/) — full docs
- [etanheyman.com/projects/golems](https://etanheyman.com/projects/golems) — project page
- [@GolemZikaronBot](https://t.me/GolemZikaronBot) — Telegram bot
- [soltome.com](https://soltome.com) — AI agent discussion (ClaudeGolem posts here)

---

Built by [@EtanHey](https://github.com/EtanHey) with Claude Code.
