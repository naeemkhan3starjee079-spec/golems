# Async Agent Collaboration

> Strict coordination protocol for parallel Claude Code sessions sharing a collab file.

## When to Use

- 2+ Claude sessions working on a plan in parallel
- Overnight/async autonomous work (human asleep or away)
- Any multi-agent task where agents must coordinate without human intervention

## The Rule

**If the human has to tell you to update the collab file, the collab has failed.** The whole point is autonomous coordination. The human gives ONE instruction, you scaffold the collab, launch agents, and they self-coordinate through this file.

---

## Collab File Structure (MANDATORY)

Every collab file MUST have these sections in this order. Copy this template.

```markdown
# [Project Name] Collab

> [One-line purpose]. All agents: read this file every 5 min. Update BEFORE every commit.

## References

- Plan: `path/to/README.md`
- Phase docs: `path/to/phase-N/`
- Collab rules: `<collab-protocol-path>` (usually `skills/golem-powers/large-plan/workflows/collab.md` or `~/.claude/commands/golem-powers/large-plan/workflows/collab.md`)

## Goal

[One sentence. What are we trying to accomplish?]

## Orchestrator

**[agentName]** advances rounds and resolves conflicts. All other agents report to this file.

## Agents

| Agent | Role | Repo/CWD | Status |
|-------|------|----------|--------|
| agentA | Phase 1, 3 | ~/Gits/repo-a | idle |
| agentB | Phase 2, 4 | ~/Gits/repo-b | idle |

Status values: `idle` | `ready` | `learning` | `working` | `blocked:reason` | `done` | `signed-off`

## Task Board

| Phase/Task | Owner | Status | PR |
|------------|-------|--------|----|
| Phase 1: Description | agentA | pending | — |
| Phase 2: Description | agentB | pending | — |

This is the SINGLE source of truth for progress. Messages are supplementary.

## Key Constraints

### agentA
- Phase 3 depends on Phase 2 (agentB must finish first)
- Works in ~/Gits/repo-a only — no cross-repo writes

### agentB
- Independent of agentA — can start immediately
- CPU constraint: don't run heavy tasks while diarization is active

## Shared Context

- Design tokens: accent=#8B5CF6, bg=#0A0E1A
- Paths: audio at ~/data/audio/, output at ~/data/output/
- Known bugs: [list any known issues agents should watch for]
- Env vars: HF_TOKEN at ~/.huggingface/token

## Update Gates (MANDATORY)

| Checkpoint | What to Write | Where |
|------------|---------------|-------|
| Pre-flight done | Status -> `learning`. "Pre-flight: N tests green." | Agents + Messages |
| Starting work | Status -> `working`. "Starting [task]." | Agents + Messages |
| Before EVERY commit | One-line summary of changes | Messages |
| Before creating PR | Read other agents' Messages for cross-refs | Messages |
| Phase complete | Status -> `done`. PR link added. **Next: [what's next]** | Task Board + Messages |
| Blocked | Status -> `blocked:reason`. What's needed + from whom | Agents + Messages |
| Done for session | "agentX signing off." Status -> `signed-off` | Agents + Messages |

**Enforcement:** If you git commit without a corresponding Messages entry, you are violating the protocol. Update collab FIRST, then commit.

## Round Advancement

[Only needed for round-based sprints. Delete for simple parallel work.]

| Round | Advance When |
|-------|-------------|
| 0 -> 1 | All agents report `learning` or `ready` |
| 1 -> 2 | All Round 1 PRs merged |

Orchestrator announces: `**ADVANCING TO ROUND N.** [per-agent directives]`

## Decisions

<!-- Decisions are FINAL once written. Don't revisit without new information. -->

- [timestamp] Decided: [what] ([reasoning])

## Messages

<!-- Format: - [agentName ISO-timestamp] Short update. Bold status. -->

- [agentA 2026-02-25T14:00] Pre-flight: 42 tests green. Starting Phase 1.
```

---

## Scaffolding a Collab

When you create a collab file, follow these steps:

### 1. Scope it

The collab file is for **coordination only**. These DO NOT belong in a collab file:
- Health/biometrics data
- Calendar schedules
- Workout plans
- Side project specs
- Implementation details (put in PR descriptions or phase findings files)
- Debugging notes (put in agent-specific findings files)

If content doesn't help an agent answer "what should I do next?" — it doesn't belong.

### 2. Declare the orchestrator

One agent (usually the one that created the collab) is the orchestrator. Their job:
- Advance rounds when criteria are met
- Triage review feedback into actionable items
- Resolve conflicts between agents
- Write per-agent directives in Messages using `@agentName:`

### 3. Define agent isolation

Every agent must know:
- Which repo/directory it owns
- What depends on its output
- What it can run in parallel
- Resource constraints (CPU, GPU, RAM)

### 4. Set polling cadence

State it in the file header: `"read this file every N min"`. Typical values:
- 5 min: active overnight work, agents need tight coordination
- 15 min: daytime parallel work, agents mostly independent
- On-demand: agents only check when they finish a task

### 5. Launch agents with the collab path in their prompt

Every agent's kickoff prompt MUST include:
```
Coordination file: <path>/collab.md — read it now, update it at every checkpoint.
```

---

## Message Format

Short. Timestamped. Bold status keywords. One line per update.

**Good:**
```
- [brainClaude 2026-02-25T04:30] **Phase 1 — DONE. PR #13 merged.** 266 tests pass. Next: Phase 2.
- [golemsClaude 2026-02-25T04:45] **ADVANCING TO ROUND 2.** @brainClaude: start Phase 2. @voiceClaude: start Phase 5.
- [voiceClaude 2026-02-25T05:00] **blocked:human** — pyannote needs HF license acceptance. URLs in Key Constraints.
- [brainClaude 2026-02-25T06:00] brainClaude signing off. All phases done.
```

**Bad:**
```
- mainClaude: I've been working on the enrichment pipeline and it seems like the
  MLX backend is working well. I processed about 500 chunks and 440 were ok which
  is an 88% success rate. The JSON parse failures were about 12%...
```

---

## Anti-Patterns (DO NOT DO THESE)

1. **Collab as shared notepad** — agents write whenever they feel like it, in whatever format. No structure = human must micromanage.
2. **Decisions buried in Messages** — use the `## Decisions` section. Messages scroll; decisions must be findable.
3. **Unbounded findings in collab** — detailed analysis goes in `agent-specific.md` files. Collab has one-line summaries only.
4. **Freeform status prose** — "I'm working on the thing and it's going well" is not a status update. Use the gate format.
5. **No sign-off** — without explicit sign-off, other agents keep polling for updates that will never come.
6. **No pre-flight** — always verify tests pass before starting work. Report the count.
7. **No forward-looking handoff** — "Phase 1 done" is incomplete. "Phase 1 done. **Next: Phase 2 (agentB unblocked).**" is correct.
8. **Scope creep** — health data, calendar schedules, workout plans, side project specs DO NOT BELONG in a collab file.
9. **No orchestrator** — someone must advance rounds and resolve conflicts. If nobody is designated, nobody does it.
10. **Human writes the protocol at 4am** — if the coordination protocol wasn't in the collab BEFORE agents started, the collab was set up wrong.
11. **Status drift** — agents invent new statuses (`in-progress`, `almost done`) instead of using the defined values. Stick to the status list.
12. **Dual sources of truth** — collab Task Board says one thing, plan README says another. The collab Task Board is authoritative during execution. Plan README gets updated after merge.
13. **Concurrent edit clobbering** — two agents edit collab.md simultaneously, one overwrites the other. Messages section is append-only. For the rest, each agent edits only their own rows.
14. **Stale `working` status** — agent crashes or hangs, status stays `working` forever. If no Messages update for 30+ min from a `working` agent, orchestrator should check on them.
15. **Missing MCP servers in cross-repo agents** — agent launched in repo B has no access to MCP servers configured in repo A's `.mcp.json`. ALWAYS use `--mcp-config` when launching agents in different repos. See scaffold step 9 for CLI template.
16. **Registering hooks before creating the file** — Agent adds a hook to `settings.json` pointing to a file that doesn't exist yet. Hook runner returns exit code 2 (file not found), which blocks ALL tool calls for ALL agents in the repo. **Rule: create the hook file first, register it second. Never the reverse.**

---

## Overnight Autonomous Work

When agents work while the human sleeps:

1. **Scaffold the collab BEFORE the human goes to sleep.** All sections filled, all constraints declared.
2. **Each agent sets a background polling timer** — `sleep 300` loop to read the collab file for updates.
3. **CPU/thermal safety rules in Key Constraints** — which heavy processes can run simultaneously.
4. **Blocker escalation** — if blocked on human action, update status to `blocked:human` with exactly what's needed. Don't keep retrying.
5. **Sign off when done** — prevents other agents from waiting for you.
6. **The human should wake up to a clean collab file** where Messages show exactly what happened, Task Board shows what's done, and Decisions capture anything learned.

---

## Complexity Tiers

**Always-required sections** (every tier): Goal, Agents, Task Board, Update Gates, Decisions, Messages.

### Lightweight (2 agents, independent work, ~40 lines)
Required: Goal, Agents, Task Board, Update Gates, Decisions, Messages.
Optional: References, Key Constraints, Shared Context, Orchestrator.
Skip: Round Advancement.
Note: If Orchestrator section is omitted, the agent that created the collab is implicitly the orchestrator.
Example: `project-mini-sites/collab.md`

### Standard (2-3 agents, some dependencies, ~80-100 lines)
Required: All always-required + Orchestrator, Key Constraints, Shared Context, References.
Skip: Round Advancement (no rounds needed).
Example: `sprint-3-collab.md`

### Complex (3+ agents, multi-repo, round-based, ~150-200 lines)
Required: All sections including Round Advancement.
Plus: Per-agent findings in separate files. Archive old messages when >50 lines.
Example: `brainlayer-v2-launch/collab.md` + `v2-fix-sprint/collab.md`
