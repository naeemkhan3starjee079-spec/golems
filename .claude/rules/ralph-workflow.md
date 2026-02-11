---
globs: packages/ralph/**
---

# Ralph Workflow Rules

> Auto-loaded when working in packages/ralph/.

## What is Ralph?

Ralph is an autonomous coding loop that executes PRD stories. The user runs `ralph` commands from their terminal — it's not Claude's job to run Ralph.

## After Creating a PRD

1. **DO NOT implement the stories**
2. **DO NOT spawn subagents**
3. **Tell the user:** "PRD ready. Run `ralph` to execute."

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `ralph.zsh` | Main entry — ALL COMMANDS |
| `lib/` | Modular zsh library |
| `ralph-ui/` | React Ink dashboard |
| `bun/` | TypeScript story management |
| `contexts/` | Shared context rules (DEPRECATED — see .claude/rules/) |

## JQ Escaping Bug Workaround

Claude Code's Bash tool corrupts jq commands containing `!=` and `|`. Always use double quotes with escaped inner quotes:

```bash
# CORRECT:
jq ".pending | map(select(. != \"FOO\"))" file.json

# WRONG (breaks):
jq '.pending | map(select(. != "FOO"))' file.json
```

## Story Types and Model Routing

| Prefix | Type | Default Model |
|--------|------|---------------|
| US-* | User Story | sonnet |
| V-* | Verification | haiku |
| TEST-* | E2E Test | haiku |
| BUG-* | Bug Fix | sonnet |
| AUDIT-* | Audit | opus |
| MP-* | Master Plan | opus |

## Mandatory Story Structure

**Every story's last two criteria MUST be:**
1. `"Run CodeRabbit review - must pass (or create BUG if unfixable)"`
2. `"Commit: {type}: {STORY-ID} {description}"`

CodeRabbit ALWAYS comes BEFORE commit. No exceptions.

## Full Reference

For complete Ralph workflow documentation, see `contexts/workflow/ralph.md`.
