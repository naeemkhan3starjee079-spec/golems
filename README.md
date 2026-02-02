# Golems Monorepo

> Autonomous AI agent ecosystem: coding loops, memory systems, and Telegram bots.

```
golems/
├── packages/
│   ├── ralph/        # Autonomous AI coding loop (PRD → implement → review → commit)
│   ├── zikaron/      # Memory layer - indexes Claude conversations for search
│   └── autonomous/   # Telegram bots, Night Shift, Job Golem, Moltbook
├── docker/
│   └── ollama/       # Sandboxed Ollama with internet access
├── contexts/         # Shared Claude context files
└── docs/             # Future ideas, architecture notes
```

---

## Packages

### Ralph (`packages/ralph/`)
Autonomous AI coding loop that executes PRD stories.

```bash
cd packages/ralph
./ralph.zsh 5  # Run 5 stories
```

**Features:**
- PRD-driven development (JSON story format)
- CodeRabbit integration for AI code review
- Smart model routing (claude-sonnet, claude-opus, gemini)
- Git worktree isolation
- Telegram notifications

### Zikaron (`packages/zikaron/`)
Memory layer that indexes Claude Code conversations for semantic search.

```bash
cd packages/zikaron
zikaron search "how to handle auth"
```

**Features:**
- Indexes conversation transcripts
- Semantic search with embeddings (via Ollama)
- Style analysis for communication patterns
- SQLite + vector storage

### Autonomous (`packages/autonomous/`)
Telegram bots and scheduled automation.

```bash
cd packages/autonomous
bun run bot  # Start Telegram bot
```

**Components:**
- **Telegram Bot** - Chat with Claude, notifications
- **Night Shift** (4am) - Autonomous code improvements
- **Job Golem** (5am/5pm) - Job board scraping + AI matching
- **Morning Briefing** (8am) - Daily summary
- **OllamaChat Bot** - Direct Ollama interaction

---

## Docker Setup

Sandboxed Ollama with controlled internet access:

```bash
cd docker/ollama
docker compose up -d
curl http://localhost:11434/api/tags  # Verify
```

**Security model:** Internet enabled, but no git/database credentials mounted.

---

## Quick Start

```bash
# Clone
git clone https://github.com/EtanHey/golems.git
cd golems

# Install dependencies
cd packages/autonomous && bun install
cd ../ralph && bun install
cd ../zikaron && pip install -e .

# Start Telegram bot
cd packages/autonomous && bun run bot
```

---

## Related

- [@GolemZikaronBot](https://t.me/GolemZikaronBot) - Telegram bot
- [docs/future-ideas.md](docs/future-ideas.md) - Roadmap
