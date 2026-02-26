# OpenCode Golem Instructions

> This is the equivalent of CLAUDE.md for OpenCode.
> Auto-loaded as context when OpenCode runs in this directory.

## Rules (Auto-Loaded)

Rules in `.claude/rules/` are auto-loaded by Claude Code:
- `golems-base.md` — AIDEV-NOTE, TypeScript safety, architecture decisions
- `ralph-workflow.md` — PRD execution, story types, CodeRabbit rules (targets `packages/ralph/**`)
- `tech-ink.md` — Ink keyboard/stdin setup (targets `ralph-ui/**`)

**Reference docs** (read when needed, not auto-loaded):
- `rules-library/workflow/ralph.md` — Full Ralph workflow documentation
- `rules-library/workflow/interactive.md` — Interactive session rules
- `rules-library/base.md` — Base context (most rules now in `.claude/rules/` or `~/.claude/CLAUDE.md`)

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
| `rules-library/` | Exportable rules/context library |
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
notify "Task Complete" "Brief description"
```

Keep title 2-4 words, body 1 sentence max.

## Skills Reference

Skills are in `skills/golem-powers/`. Key ones:
- `prd` - Create/manage PRDs
- `coderabbit` - Code review
- `commit` - Atomic commits
- `context-audit` - Verify context references

To use: Read the SKILL.md file and follow instructions.

## Related Projects

### BrainLayer (Memory Layer)
Located at `~/Gits/brainlayer/` — indexes Claude Code conversations for search/retrieval.
- **External repo:** [github.com/EtanHey/brainlayer](https://github.com/EtanHey/brainlayer)
- **3 MCP tools** (+ backward-compat aliases) — brain_search, brain_store, brain_recall for search, context, file timeline, regression detection, persistent storage
- **Communication Style Analysis**: `brainlayer/data/archives/style-*/master-style-guide.md`

### Owner Communication Style
From BrainLayer analysis:
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
