# Golems Monorepo

> Autonomous AI agent ecosystem. This is the root CLAUDE.md - each package has its own.

---

## Package Documentation

| Package | CLAUDE.md | Purpose |
|---------|-----------|---------|
| **ralph** | [`packages/ralph/CLAUDE.md`](packages/ralph/CLAUDE.md) | Autonomous coding loop |
| **zikaron** | [`packages/zikaron/CLAUDE.md`](packages/zikaron/CLAUDE.md) | Memory layer |
| **autonomous** | [`packages/autonomous/CLAUDE.md`](packages/autonomous/CLAUDE.md) | Telegram bot, Night Shift, Soltome |

**Always read the package-specific CLAUDE.md when working in that package.**

---

## Research Documentation

Each package has `docs.local/research/` with in-depth research. These are accurate and useful for understanding decisions.

### Zikaron Research
| File | Topic |
|------|-------|
| `performance/architecture.md` | sqlite-vec vs ChromaDB analysis |
| `performance/profiling.md` | Cold start optimization |
| `performance/alternatives.md` | Embedding model comparison (bge-large winner) |
| `dashboard/ui-framework.md` | Rich TUI vs FastHTML vs Textual |
| `dashboard/search-quality.md` | Hybrid search (BM25 + semantic) |
| `dashboard/competitors.md` | Similar tools analysis |

### Autonomous Research
| File | Topic |
|------|-------|
| `gemini-cli-migration.md` | Gemini CLI for replacing Ollama |
| `kiro-capabilities.md` | Kiro CLI features, knowledge base, agents |
| `ollama-migration-plan.md` | Full migration plan with file-by-file changes |
| `agent-memory.md` | LangChain, Redis, multi-agent patterns |
| `telegram-advanced-features.md` | Voice, threading, inline mode |
| `night-shift-patterns.md` | Task prioritization, quality gates |
| `moltbook-integration.md` | Posting strategies (now Soltome) |

### Ralph Research
| File | Topic |
|------|-------|
| `US-132-ntfy-story-complete.md` | Notification system research |

---

## Planning Documentation

Planning docs live in `docs.local/planning/`:

| Package | Key Plans |
|---------|-----------|
| **autonomous** | `mega-plan-feb-2026.md` - Comprehensive roadmap |
| **autonomous** | `content-pipeline-architecture.md` - Multi-agent content creation |

---

## When Writing READMEs

1. **Check research first** - `docs.local/research/` has accurate, detailed analysis
2. **Extract key decisions** - Research docs explain WHY, READMEs explain WHAT
3. **Keep READMEs concise** - Link to research for deep dives
4. **Update after major changes** - Research informs README updates

---

## Shared Resources

| Path | Purpose |
|------|---------|
| `contexts/` | Shared Claude context files |
| `skills/golem-powers/` | Skills (symlinked to ralph) |
| `docs/` | Architecture notes, future ideas |

---

## Development Workflow

```bash
# Work on a package
cd packages/autonomous
# Read its CLAUDE.md first!
cat CLAUDE.md

# Check research for context
ls docs.local/research/

# Make changes, then update README if needed
```

---

## Communication Style

Based on Zikaron analysis of owner's patterns:
- **Formality:** 2/10 - Very casual
- **Length:** Brief, direct
- **Tone:** Friendly, sometimes playful

See `packages/autonomous/SOUL.md` for bot persona.

---

## Related Global Config

- `~/.claude/CLAUDE.md` - Global Claude instructions
- `~/.claude/contexts/` - Shared context files
- `~/.claude/commands/golem-powers/` - Skills

---

*Each package is self-contained. Start with its CLAUDE.md, check research for depth.*
