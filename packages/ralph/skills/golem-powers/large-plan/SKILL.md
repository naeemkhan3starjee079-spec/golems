---
name: large-plan
description: Scaffold and execute folder-based multi-phase plans with async agent collaboration. Use when planning large features, multi-PR workflows, or coordinating parallel agent work across phases. NOT for: single-file changes, simple bugs, quick tasks.
---

# /large-plan

> Scaffold folder-based plans with phase folders, execute them through the branch-PR-review cycle, and coordinate async agent collaboration.

## Quick Actions

| What you want to do | Workflow |
|---------------------|----------|
| Create a new plan from a description | [workflows/scaffold.md](workflows/scaffold.md) |
| Execute the next phase in a plan | [workflows/execute-phase.md](workflows/execute-phase.md) |
| Run pre-merge Cursor audit | Use `golem-powers:cursor-audit` skill |
| Start async collab on a phase | [workflows/collab.md](workflows/collab.md) |

## Core Concept

One folder per phase, each containing README.md (steps) + findings.md (shared knowledge).

```
plan-dir/
  README.md              # Index: progress table, routing
  phase-1-name/
    README.md            # Steps for this phase
    findings.md          # Shared knowledge (agents write here)
  phase-2-name/
    ...
```

**Lifecycle:** Scaffold → Execute phase 1 → PR + merge → Execute phase 2 → ...
**Branch per phase:** master → feature/phase-N → implement → PR → review → merge

## Scripts

| Script | Usage |
|--------|-------|
| `scripts/scaffold-plan.sh` | `bash scripts/scaffold-plan.sh <plan-dir> <plan-name> <phase-count>` |
