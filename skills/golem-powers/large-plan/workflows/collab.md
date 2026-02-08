# Async Agent Collaboration

> Coordinate multiple agents working on a phase using shared findings files.

## When to Use

- Phase requires research from multiple sources
- Phase has independent sub-tasks that can run in parallel
- Phase benefits from multi-perspective analysis

## Setup

### 1. Identify Agents

Pick agents based on the work:

| Agent | Best For | Cost |
|-------|----------|------|
| gemini | Research, opinions, comparison | Free |
| kiro | Research, knowledge base | Free |
| codex | Code generation, analysis | ChatGPT Plus |
| cursor | Code with @codebase context | $20/mo |
| haiku | Quick code tasks | $ |

### 2. Create Agent Files (optional)

For complex phases, each agent gets a data file:

```
phase-N-name/
  findings.md          # Shared room
  agent-gemini.md      # Gemini's detailed findings
  agent-cursor.md      # Cursor's detailed findings
```

### 3. Define Tasks

In findings.md, create the task board:

```markdown
## Task Board
| Task | Owner | Status |
|------|-------|--------|
| Research best approach for X | gemini | pending |
| Implement core module | cursor | pending |
| Write tests | haiku | pending |
```

## Execution

### 4. Launch Agents in Parallel

```bash
# Agent 1: Research
gemini "Research: What's the best approach for X in 2026? Compare A vs B vs C. \
  Write findings to <path>/findings.md under ## Research" &

# Agent 2: Code
cursor agent "Implement X based on the plan in <path>/README.md. \
  Update findings.md task board when done." \
  --output-format text > <path>/agent-cursor.md &

wait
```

### 5. Integrate Findings

After agents finish:
1. Read all agent output files
2. Synthesize into findings.md under ## Decisions
3. Resolve any conflicts between agents
4. Update task board statuses

### 6. Act on Findings

Use the synthesized findings to:
- Make implementation decisions
- Write code informed by research
- Update the phase README with new information

## Agent Communication Rules

1. **Short updates** in findings.md — one line per update, timestamped
2. **Detailed dumps** in agent-specific files — full analysis, quotes, comparisons
3. **Decisions** are final once written — don't revisit without new information
4. **Conflicts** escalate to the orchestrator (Opus) for resolution
5. **Build on each other** — agent B should read agent A's findings before starting

## Example Collab Session

```markdown
# Phase 5 Findings

## Decisions
- [14:30] Decided: Use approach A (gemini recommended, cursor confirmed feasibility)
- [15:00] Decided: Skip feature Y for now (out of scope per plan)

## Research
- [14:15] gemini: Compared 3 auth libraries. Recommendation: use library X because...
- [14:25] gemini: Found gotcha with library X — needs polyfill for Node 18

## Task Board
| Task | Owner | Status |
|------|-------|--------|
| Research auth libraries | gemini | done |
| Implement auth middleware | cursor | done |
| Write auth tests | haiku | done |

## Notes
- [14:40] cursor: Implementing with library X. Using polyfill per gemini's finding.
- [15:10] haiku: 12 tests written. All pass. Edge case: expired tokens return 401.
```
