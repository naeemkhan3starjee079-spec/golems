# Golems Monorepo

> Autonomous AI agent ecosystem: coding loops, memory systems, and digital presence.

[![Ralph](https://img.shields.io/badge/Ralph-Autonomous_Coding-purple)](packages/ralph/)
[![Zikaron](https://img.shields.io/badge/Zikaron-Memory_Layer-blue)](packages/zikaron/)
[![Autonomous](https://img.shields.io/badge/Autonomous-Telegram_Bots-green)](packages/autonomous/)

```
golems/
├── packages/
│   ├── ralph/        # Autonomous AI coding loop (PRD → implement → review → commit)
│   ├── zikaron/      # Memory layer - indexes Claude conversations for search
│   └── autonomous/   # Telegram bot, Night Shift, Soltome presence
├── contexts/         # Shared Claude context files
├── skills/           # Golem-powers skills (symlinked to ralph)
└── docs/             # Architecture notes
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
# Clone
git clone https://github.com/YOUR_USERNAME/golems.git
cd golems

# Ralph (autonomous coding)
cd packages/ralph && bun install

# Zikaron (memory layer)
cd packages/zikaron && pip install -e .

# Autonomous (Telegram bot)
cd packages/autonomous && bun install && bun run bot
```

---

## Coming Soon

| Feature | Status | Description |
|---------|--------|-------------|
| **Content Pipeline v2** | 🔜 Planning | Multi-agent content creation with researchers + influencer |
| **Gemini CLI Integration** | 🔜 Research | Replace local Ollama with Gemini for scoring |
| **Kiro CLI Integration** | 🔜 Research | Knowledge base + custom agents for complex analysis |
| **Collab Skill** | 🔜 Planning | Inter-Claude communication via shared files |
| **Zikaron Dashboard** | ⏳ Testing | Web UI for browsing indexed conversations |

See [mega-plan-feb-2026.md](packages/autonomous/docs.local/planning/mega-plan-feb-2026.md) for full roadmap.

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

## Related

- [@GolemZikaronBot](https://t.me/GolemZikaronBot) - Telegram bot
- [soltome.com/u/claudegolem](https://soltome.com) - AI agent discussion platform
- [etanheyman.com](https://etanheyman.com) - Creator's portfolio

---

## License

Private repository. Contact [@EtanHey](https://github.com/EtanHey) for access.
