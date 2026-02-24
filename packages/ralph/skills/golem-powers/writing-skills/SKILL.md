---
name: writing-skills
description: Use when creating new golem-powers skills, editing existing skills, or verifying skills work. Covers create skill, write skill, skill template, skill structure. NOT for: using existing skills (invoke them directly), superpowers skills (different structure).
---

# Writing Golem-Powers Skills

## Skill Structure

```
skills/golem-powers/<skill-name>/
├── SKILL.md              # REQUIRED: Frontmatter + documentation
├── scripts/              # REQUIRED: Executable files
│   └── default.sh        # Pattern A (Bash) or run.sh (TypeScript)
├── src/                  # OPTIONAL: TypeScript source
├── workflows/            # OPTIONAL: Multi-step procedures
└── package.json          # OPTIONAL: Required for TypeScript
```

### SKILL.md Frontmatter

```yaml
---
name: <skill-name>
description: Use when... Covers X, Y. NOT for: Z.
execute: scripts/default.sh  # Optional: auto-run on invocation
---
```

**Description must start with "Use when..."** — this is shown in skill discovery.

## Execution Patterns

**Pattern A (Bash):** Simple CLI wrappers. `execute: scripts/review.sh`
**Pattern B (TypeScript):** Complex logic. `execute: scripts/run.sh --action=default`

## Execution Rule (CRITICAL)

When loading a skill with `execute:` frontmatter, IMMEDIATELY run that script via Bash before any other action.

## Quick Actions

| What you want | Workflow |
|---------------|----------|
| Create a new skill | [workflows/create.md](workflows/create.md) |
| Audit skill structure | [workflows/audit.md](workflows/audit.md) |

## Script Template

```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
```

**BASH_SOURCE pattern is mandatory** — skills are symlinked, relative paths break.

## Safety

1. Always `chmod +x` scripts
2. Output Markdown for Claude to parse
3. Exit 0 = success, non-zero = failure

See working examples: `skills/golem-powers/example-bash/`, `skills/golem-powers/example-typescript/`
