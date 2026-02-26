---
globs: packages/ralph/**
---

# Ralph Workflow Rules

## After Creating a PRD

1. **DO NOT implement the stories**
2. **DO NOT spawn subagents**
3. **Tell the user:** "PRD ready. Run `ralph` to execute."

## JQ Escaping Bug

Claude Code's Bash tool corrupts jq commands with `!=` and `|`. Use double quotes:

```bash
# CORRECT:
jq ".pending | map(select(. != \"FOO\"))" file.json

# WRONG (breaks):
jq '.pending | map(select(. != "FOO"))' file.json
```
