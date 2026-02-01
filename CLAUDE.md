# OpenCode Golem Instructions

> This is the equivalent of CLAUDE.md for OpenCode.
> Auto-loaded as context when OpenCode runs in this directory.

## 📚 Required Contexts

**Always load these contexts based on mode:**

| Mode | Context File | Key Rules |
|------|--------------|-----------|
| **Interactive** | `contexts/workflow/interactive.md` | CLAUDE_COUNTER (count down from 10), git safety |
| **Ralph** | `contexts/workflow/ralph.md` | Autonomous execution, story completion |
| **All** | `contexts/base.md` | Notifications, scratchpad, AIDEV-NOTE |

**Load on start:**
```
@contexts/base.md
@contexts/workflow/interactive.md  (if chatting with user)
@contexts/workflow/ralph.md        (if running autonomously)
```

---

## About This Project

This is **Ralph** (claude-golem) - an autonomous AI coding loop.

Core loop:
```
while stories remain:
  spawn fresh AI -> read prd-json/ -> implement story -> review -> commit
done
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `ralph.zsh` | Main entry - ALL COMMANDS |
| `lib/` | Modular zsh library |
| `ralph-ui/` | React Ink dashboard |
| `bun/` | TypeScript story management |
| `skills/golem-powers/` | Skills for Claude (reference only) |
| `contexts/` | Shared context rules |
| `prd-json/` | PRD stories |

## Available Commands

Run `./ralph.zsh --help` for full list. Key ones:

| Command | Purpose |
|---------|---------|
| `ralph N` | Run N iterations |
| `ralph -G` | Gemini mode |
| `ralph -ui` | Dashboard mode |
| `ralph --prd path/` | Use specific PRD |

## JQ Escaping Workaround

Use double quotes with escaped inner quotes:
```bash
# Correct:
jq ".pending | map(select(. != \"FOO\"))" file.json

# Use jqf helper for complex filters:
jqf '.pending | map(select(. != "FOO"))' file.json -i
```

## Testing

Always run tests before committing:
```bash
./tests/test-ralph.zsh
```

## Commit Rules

- NEVER push without explicit permission
- NEVER commit unless explicitly told
- Use conventional commits: feat/fix/docs/refactor

## 📱 Telegram Notifications

**Notify user when finishing significant tasks:**

```bash
curl -s -X POST http://localhost:3847/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Task Complete","body":"Brief description","source":"claude","priority":"default"}'
```

Sources: `claude` (🤖), `ralph` (🔄), `nightshift` (🌙). Keep title 2-4 words, body 1 sentence max.

## Skills Reference

Skills are in `skills/golem-powers/`. Key ones:
- `prd` - Create/manage PRDs
- `coderabbit` - Code review
- `commit` - Atomic commits
- `context-audit` - Verify context references

To use: Read the SKILL.md file and follow instructions.

## Related Projects

### Zikaron (Memory Layer)
Located at `~/Gits/zikaron/` - indexes Claude Code conversations for search/retrieval.
- **Communication Style Analysis**: `zikaron/data/archives/style-*/master-style-guide.md`
- Provides style data for GolemsZikaron bot

### GolemsZikaron (Moltbook Bot)
Located at `~/Gits/golems-zikaron/` - autonomous Telegram bot + Moltbook presence.
- Posts about Zikaron/Claude-Golem to AI social network
- Runs Night Shift (3am autonomous improvements)
- Uses your communication style from Zikaron analysis
- Persona: `golems-zikaron/SOUL.md`

### Owner Communication Style
From Zikaron analysis (`data/archives/style-2026-01-31-2121/`):
- **Formality: 2/10** - Very casual
- **Code-switching:** Hebrew ↔ English
- **Brief, direct messages** - No walls of text
- **Emojis:** 🫶 sparingly
- **Tone:** Friendly, sometimes playful sarcasm

Use this knowledge when generating user-facing content or bot responses.

---

## Files to Never Edit

- `~/.claude/*` - Claude Code config (separate system)
- `node_modules/`
- `*.lock` files (unless fixing deps)
