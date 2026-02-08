# Scaffold a New Plan

> Creates a folder-based plan structure from a description.

## Inputs

1. **Plan name** — short kebab-case name (e.g., `auth-overhaul`)
2. **Plan directory** — where to create it (default: `docs/plan/` or `~/.claude/plans/`)
3. **Phases** — list of phase names and descriptions
4. **Depends-on** — which phases depend on which

## Steps

### 1. Gather Phase Information

Ask the user (or parse from description):
- How many phases?
- Name and one-line goal for each
- Dependencies between phases
- Which CLI helpers to use for research/code per phase

### 2. Create Directory Structure

Run the scaffold script:

```bash
bash ~/.claude/commands/golem-powers/large-plan/scripts/scaffold-plan.sh \
  "<plan-dir>" "<plan-name>" <phase-count>
```

Or create manually:

```
<plan-dir>/
  README.md
  phase-1-<name>/
    README.md
    findings.md
  phase-2-<name>/
    README.md
    findings.md
  ...
```

### 3. Fill In Main README

The main README.md should have:

```markdown
# Plan Name

## Progress

| # | Phase | Folder | Status | Notes |
|---|-------|--------|--------|-------|
| 1 | Name | [phase-1-name](phase-1-name/) | ... | ... |
| 2 | Name | [phase-2-name](phase-2-name/) | ... | ... |

## Execution Rules
(copy from SKILL.md or link to it)

## Cross-Phase Knowledge
- Looking for X? See phase-Y/findings.md
```

### 4. Fill In Phase READMEs

Each phase README follows the template from SKILL.md:
- Goal (one sentence)
- Tools (research helper, code helper, MCPs)
- Steps (numbered checklist)
- Depends On
- Status (checkbox list)

### 5. Initialize Findings Files

Each findings.md starts with:

```markdown
# Phase N Findings

## Decisions

## Research

## Task Board
| Task | Owner | Status |
|------|-------|--------|

## Notes
```

### 6. Output

Tell the user:
- Plan created at `<plan-dir>/`
- `N` phases scaffolded
- Next: start with phase 1 by running `/large-plan execute`
