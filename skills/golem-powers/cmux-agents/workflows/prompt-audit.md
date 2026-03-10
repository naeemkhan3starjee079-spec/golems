# Prompt Audit — Before Sending Any Prompt to Another Claude

> Run this checklist before spawning agents or writing handoff/kickoff prompts. Catches the gaps that cause agent failures, duplicate work, and missing best practices.

## Why This Exists

Every time we skip this, agents miss something: no TDD mandate, no PR loop, no mention of prior work, wrong merge policy. We've stored this lesson in BrainLayer at importance 9 twice. This workflow turns "things we always forget" into a checklist.

## The Checklist

### 1. Prior Work — Don't Rebuild What Exists

Before agents start from scratch, check what's already done:

```
brain_search("<project> <domain> components built")
brain_search("<project> recent agent work results")
git log --oneline -20 -- <relevant-paths>
```

Add to the prompt: "Check git log for recently built components before flagging anything as missing."

### 2. Skill Combos — What Should Agents Invoke?

Scan the skill index for skills that fit the task. Common combos:

| Task Type | Skills to Include |
|-----------|------------------|
| Building components | `/superpowers:test-driven-development`, `/figma-loop`, `/context7` |
| Full feature work | `/superpowers:test-driven-development`, `/pr-loop`, `/coderabbit:review` |
| Figma decomposition | `/figma-swarm`, `/figma-loop` |
| Research/audit | `/research`, `/coderabbit:review` |
| Collab work | `/large-plan`, `/pr-loop` |

Add a "Skill Combos" table to the prompt listing which skills agents should invoke and when.

### 3. Mandatory Sections

Every agent prompt MUST include:

**TDD Mandate:**
```
When building anything, use /superpowers:test-driven-development — write a failing test FIRST, then implement, then green. No code without a RED test.
```

**PR Loop:**
```
When work is done, use /pr-loop — branch → test → PR → review → fix → merge.
```

**Merge Policy** (ask the user which one):
- `autonomous` — agent merges after CI + CodeRabbit pass
- `review-required` — orchestrator or user merges
- `ask-on-each` — agent asks before each merge

**BrainLayer Checkpoints:**
```
brain_store your progress at each milestone:
- After setup/discovery → store what was found
- After main work → store what was done, test counts
- After PR → store PR number, files changed
```

### 4. Monitoring Instructions

If spawning cmux agents, the orchestrator prompt must include:

```
YOU ARE THE PARENT. Monitor your agents:
- Use agent-status or cmux capture-pane --surface surface:N every 3-5 min
- Capture results immediately when an agent finishes
- Don't wait for agents to message you — proactively check
- The user should NEVER have to ask "what happened?"
```

### 5. BrainLayer Best Practices Search

Run these searches to catch project-specific gotchas:

```
brain_search("<project> mistakes corrections")
brain_search("<project> architecture decisions")
brain_search("behavior correction <relevant-skill>")
```

If BrainLayer returns corrections or anti-patterns, add them as "Important Notes" in the prompt.

### 6. Collab Best Practices (if multi-agent or collab-based work)

If the task involves collab files or multiple agents coordinating:

**Start from the template:**
```
cat ~/Gits/orchestrator/collab/TEMPLATE.md
```
Copy it. Fill in the specifics. Never write a collab from scratch — the template has DO NOT REMOVE sections with PR loop, TDD, eval pack, and checkpoint protocol baked in.

**Sync protocol** — add to agent prompts:
```
After every PR merge or completed task, re-read the collab file before starting the next task.
Scan for @mentions directed at you. @agentName is a routing signal, not decoration.
```

**Blocker protocol** — add to agent prompts:
```
When blocked: write full context in collab (what you need, why stuck, who can unblock, suggested resolution).
Set up fswatch on the collab file and WAIT. Do NOT exit silently. Do NOT move on.
```

**Self-write detection:**
```
After writing to collab, sleep 2 seconds before arming fswatch (your own write triggers the watch otherwise).
If watch fires and the last message is from you — re-arm silently.
```

**Mission = MERGED, not "PR created":**
```
Your job isn't done until the PR is MERGED. Not created. Not reviewed. MERGED.
If blocked on merge, write the blocker. Do NOT exit.
```

### 7. Context Files

Check if the project has relevant inventory/reference files the agents need:
- Component inventories
- Reuse maps
- Design token files
- Screen inventories
- Existing plans/PRDs

List them explicitly with paths. Agents can't find files they don't know about.

## Quick Version (for simple spawns)

Not every agent needs the full checklist. For quick one-off tasks (research, audits, small fixes), at minimum include:

- [ ] Prior work check (brain_search)
- [ ] TDD mandate (if building anything)
- [ ] brain_store when done

## Anti-Patterns

- **Sending a bare task description** — agents have no context about existing work, skills, or standards
- **Assuming agents know the project** — they start fresh every session. Spell out file paths.
- **Skipping merge policy** — agents either merge without asking or never merge at all
- **No checkpoints** — agent does 45 minutes of work, session dies, nothing stored in BrainLayer
- **Writing collabs from scratch** — use the template. It has mandatory sections for a reason.
- **No blocker protocol** — agent gets stuck, exits silently, user finds out 30 min later
- **"PR created" = done** — mission is MERGED. PR created is halfway.
