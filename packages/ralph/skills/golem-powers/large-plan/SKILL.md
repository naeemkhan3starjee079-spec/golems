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
  collab.md              # Created when parallel phases exist (see below)
  phase-1-name/
    README.md            # Steps for this phase
    findings.md          # Shared knowledge room (agents write here)
  phase-2-name/
    README.md
    findings.md
  ...
```

### Execution Decision: Sequential vs Parallel

**EVERY plan must decide this at scaffold time.** Analyze the dependency graph:

```
Phases with NO cross-dependencies  →  Parallel (collab.md + multiple agents)
Phases that depend on each other   →  Sequential (execute-phase, one at a time)
Mixed                              →  Rounds (parallel within round, sequential between rounds)
```

**Decision tree:**
1. Draw the dependency graph from phase `Depends On` fields
2. Group independent phases into **rounds** (phases in the same round can run in parallel)
3. If ANY round has 2+ phases → create `collab.md` at plan root
4. Add `## Execution Strategy` to the main README.md showing rounds and parallelism

Example:
```markdown
## Execution Strategy

| Round | Phases | Mode | Agents |
|-------|--------|------|--------|
| 1 | Phase 1, Phase 2 | **parallel** (collab) | brainClaude, golemsClaude |
| 2 | Phase 3 (depends on 1+2) | sequential | mainClaude |
| 3 | Phase 4, Phase 5 | **parallel** (collab) | brainClaude, golemsClaude |
```

When a round has parallel phases, the orchestrator:
1. Creates/updates `collab.md` using the [collab protocol](workflows/collab.md)
2. Spawns one agent per phase (Task tool or CLI agents)
3. Each agent's kickoff prompt includes the collab.md path
4. Orchestrator monitors collab.md and advances rounds when all phases are done

### Plan Lifecycle

```
Scaffold plan  →  Analyze dependencies  →  Group into rounds
                                                |
                    ┌───────────────────────────┘
                    ▼
              Round has 1 phase?  →  Execute sequentially (execute-phase)
              Round has 2+ phases? → Create collab.md, spawn agents in parallel
                    |
                    ▼
              All round phases done  →  Advance to next round  →  Repeat
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

## Round
Round M (parallel with Phase X, Phase Y) OR Round M (sequential).

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

## Parallel Execution (Collab Protocol)

When a round has 2+ independent phases, use the **full collab protocol** defined in [workflows/collab.md](workflows/collab.md).

**The orchestrator MUST:**
1. Create `collab.md` at plan root using the template from the collab workflow
2. Fill in all mandatory sections (Goal, Agents, Task Board, Constraints, Gates)
3. Spawn agents with collab path in their kickoff prompt
4. Monitor collab.md and advance rounds when all agents report `done`

**Key rule:** If the human has to tell you to update the collab file, the collab has failed. Agents must self-coordinate.

**Complexity tiers** (from collab workflow):
- **Lightweight** (~40 lines): 2 agents, fully independent work
- **Standard** (~100 lines): 2-3 agents, some dependencies
- **Complex** (~200 lines): 3+ agents, multi-repo, round-based

See [workflows/collab.md](workflows/collab.md) for the full protocol, mandatory sections, update gates, message format, and anti-patterns.

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
