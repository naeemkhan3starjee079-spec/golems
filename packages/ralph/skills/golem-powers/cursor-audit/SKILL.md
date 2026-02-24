---
name: cursor-audit
description: Use when a PR is ready to merge but needs deeper review beyond CodeRabbit/Bugbot — stale references, missing docs, security, test gaps, dependency hygiene. Run after bot reviews pass, before merge.
---

# Cursor Audit

> Structured pre-merge audit using Cursor IDE agent. Write domain-specific prompts, run in Cursor, read results, triage, fix, verify, then merge.

## When to Use

- **After PR bot review is addressed** but **before merging**
- PR bots catch surface issues; this catches deeper problems
- Skip for trivial phases (docs-only, config changes, single-file fixes)

## Lifecycle

```
PR bot review → fix bot issues → push
  → Write audit prompts (8-12)
  → User runs in Cursor IDE
  → Read results from docs.local/logs/
  → Triage: fix now vs skip/defer
  → Fix real issues → commit → push
  → Write verification prompts (3-5)
  → User runs in Cursor IDE
  → All pass → MERGE
```

## Step 1: Write Audit Prompts

Create `docs.local/prompts/<feature>-audit-prompts.md` with 8-12 prompts. Each prompt MUST include:

```
WRITE YOUR FULL OUTPUT TO: docs.local/logs/audit-N-name.md
```

### Standard Prompt Categories

| # | Category | What It Checks | Model |
|---|----------|---------------|-------|
| 1 | **Stale Reference Sweep** | Old architecture refs across monorepo | Composer 1.5 |
| 2 | **Documentation Audit** | Every doc surface for coverage | Composer 1.5 |
| 3 | **Code Quality** | Bugs, edge cases, robustness | GPT-5.3-Codex |
| 4 | **Test Coverage Gaps** | Untested code paths that matter | GPT-5.3-Codex |
| 5 | **Cross-Project Integration** | Config wiring (.mcp.json, etc.) | Composer 1.5 |
| 6 | **Security & Secrets** | API key exposure, injection, validation | GPT-5.3-Codex |
| 7 | **Agent/Prompt Verification** | Agent prompts match actual code | Composer 1.5 |
| 8 | **Infra Integration** | Doctor/Wizard/health checks | Composer 1.5 |
| 9 | **Dashboard/Docs Page** | Missing pages, draft new content | GPT-5.3-Codex |
| 10 | **Dependencies** | Unused/missing deps, stale scripts | Composer 1.5 |

Not all categories apply to every PR. Skip irrelevant ones. Add domain-specific prompts as needed.

### Model Routing

| Complexity | Model | Use For |
|-----------|-------|---------|
| Search/compare/checklist | **Composer 1.5** | Stale refs, doc checklists, config wiring, deps |
| Deep reasoning/analysis | **GPT-5.3-Codex** | Bug hunting, security, test gap analysis, content drafting |
| Thinking-heavy | **Claude Opus 4.6** | Architecture decisions, complex refactoring plans |

### Prompt Structure

Every prompt should have:
1. **Output path** — `WRITE YOUR FULL OUTPUT TO: docs.local/logs/audit-N-name.md`
2. **GOAL** — One sentence
3. **CONTEXT** — What changed (old vs new architecture, relevant files)
4. **Specific checks** — Numbered list of what to verify
5. **Anti-patterns** — What NOT to flag (known intentional decisions, style preferences)
6. **Output format** — Table with consistent columns (File, Line, Issue, Fix)

## Step 2: User Runs in Cursor

Hand off to the user. They paste each prompt into Cursor agent mode. Results land in `docs.local/logs/`.

## Step 3: Read and Triage Results

Read all `docs.local/logs/audit-*.md` files. Classify each finding:

| Category | Action |
|----------|--------|
| **Real issue** (bugs, stale refs, missing docs, unused deps) | Fix now |
| **Code quality** (MEDIUM+ severity) | Fix now |
| **Style/nitpick** (LOW severity) | Skip |
| **Over-engineering suggestion** | Skip |
| **Deferred** (Doctor/Wizard integration, test coverage) | Note for future PR |
| **False positive** (intentional decisions flagged as issues) | Skip with explanation |

Present triage as two tables: "Fix Now" and "Skip/Defer".

## Step 4: Fix and Push

- Fix all "Fix Now" items
- Run tests
- Commit with descriptive message listing all fixes
- Push to PR branch

## Step 5: Write Verification Prompts

Create `docs.local/prompts/<feature>-final-verification.md` with 3-5 prompts. Fast checks (Composer 1.5) that confirm fixes landed:

1. **Stale refs gone** — Re-run search patterns, expect zero matches
2. **Docs complete** — Check each surface, expect PASS on all
3. **Code fixes applied** — Check specific line numbers for each fix

Each outputs to `docs.local/logs/verify-N-name.md`. Format: "PASS" or "FAIL: [detail]", then summary.

## Step 6: Confirm and Merge

Read `docs.local/logs/verify-*.md`. All pass → merge PR. Any fail → fix and re-verify.

## Templates

### Audit Prompt

```markdown
## Prompt N: [Category Name]

WRITE YOUR FULL OUTPUT TO: docs.local/logs/audit-N-name.md

GOAL: [One sentence describing what to check]

CONTEXT: [What changed and why — old vs new, relevant files]

Read these files:
- @path/to/file1
- @path/to/file2

Check:
1. [Specific check]
2. [Specific check]

DO NOT flag: [Known intentional decisions, style preferences]

OUTPUT FORMAT:
| # | File | Issue | Fix |
|---|------|-------|-----|

If clean, say "[Category] is clean."
```

### Verification Prompt

```markdown
## Prompt N: Verify [Category]

WRITE YOUR FULL OUTPUT TO: docs.local/logs/verify-N-name.md

GOAL: Confirm [specific fixes] are applied.

Check:
1. [File:line] — [expected state]
2. [File:line] — [expected state]

OUTPUT: One line per check. "PASS" or "FAIL: [detail]". Then summary.
```
