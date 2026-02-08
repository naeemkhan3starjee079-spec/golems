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
| Start async collab on a phase | [workflows/collab.md](workflows/collab.md) |

---

## Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/scaffold-plan.sh` | Create folder-based plan structure | `bash scripts/scaffold-plan.sh <plan-dir> <plan-name> <phase-count>` |

---

## Core Concept

Large plans are folder-based: one folder per phase, each containing a README.md (steps) and findings.md (shared knowledge). A main README.md acts as the index with a progress table and routing.

```
plan-dir/
  README.md              # Index: progress table, routing, execution rules
  phase-1-name/
    README.md            # Steps for this phase
    findings.md          # Shared knowledge room (agents write here)
  phase-2-name/
    README.md
    findings.md
  ...
```

### Plan Lifecycle

```
Scaffold plan  ->  Execute phase 1  ->  PR + merge  ->  Execute phase 2  ->  ...
                       |                                     |
                   Branch lifecycle              Branch lifecycle
                   (one branch per phase)        (one branch per phase)
```

### Branch Lifecycle (per phase)

```
master -> feature/phase-N-name -> implement -> commit -> push -> PR
  ^                                                            |
  |__ merge <-- approve <-- fix <-- review (CodeRabbit + Cursor Bugbot + DeepSource)
```

### Phase Template

Each phase README follows this template:

```markdown
# Phase N: Name

> [Back to main plan](../README.md)

## Goal
One sentence describing what this phase achieves.

## Tools
- **Research:** [gemini|cursor|codex] — what to research
- **Code:** [cursor|haiku|sonnet] — what to implement
- **MCPs:** [list relevant MCP servers]

## Steps
1. Step one
2. Step two
3. ...

## Depends On
- Phase X (for Y reason)

## Status
- [ ] Step one
- [ ] Step two
```

### Findings Template

Each phase findings.md is the shared collaboration room:

```markdown
# Phase N Findings

## Decisions
- [timestamp] Decision: ...

## Research
- [timestamp] Agent: Found that ...

## Task Board
| Task | Owner | Status |
|------|-------|--------|
| Research X | gemini | done |
| Implement Y | cursor | in progress |
```

---

## Async Collab Protocol

For phases that benefit from multi-agent collaboration:

### Rules for Agents

1. **You have your OWN data file** — dump detailed findings to `findings.md` or `agent-{name}.md`
2. **Append short updates** to the phase `findings.md` under the appropriate section
3. **Check back** — see what others found, build on it
4. **Pick a name** — identify yourself in updates
5. **Timestamp everything** — `[HH:MM]` prefix
6. **React to each other** — this is COLLAB not parallel work

### Collab File Structure

```markdown
# Phase N Findings

## Decisions
- [14:30] gemini: Recommends approach A over B because...
- [14:45] cursor: Agrees, approach A is cleaner. Implementing.

## Task Board
| Task | Owner | Status |
|------|-------|--------|
| Research best auth pattern | gemini | done |
| Implement auth middleware | cursor | in progress |
| Write tests | haiku | pending |

## Notes
- [14:32] gemini: Important: the existing middleware uses X pattern
- [14:50] cursor: Found a gotcha — Y doesn't support Z, using W instead
```

---

## Integration with Other Skills

| Skill | When to use |
|-------|-------------|
| `/critique-waves` | Verify phase output with parallel agents |
| `/test-plan` | Generate test plans per phase |
| `/prd` | Create PRDs from phase specs |
| `/commit` | CodeRabbit review + atomic commit |
| `/create-pr` | Create PR with proper format |

---

## PR Review Cycle (per phase)

After push, automated reviewers comment. Classify each:

| Type | Action |
|------|--------|
| **Real bug** | FIX immediately |
| **Style preference** | Fix if genuinely better |
| **Over-engineering** | SKIP |
| **Out of context** | Comment explaining why |

Repeat push-fix cycle until no real bugs remain.

---

## Quality Gates (before marking phase done)

| Gate | Check |
|------|-------|
| Typed right | No `any`, proper interfaces |
| Documented | JSDoc on exports, CLAUDE.md updated if needed |
| DRY | No duplicated logic |
| Tests pass | `bun test` / `npm test` green |
| Build passes | No compile errors |
