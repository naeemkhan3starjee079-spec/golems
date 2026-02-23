# Execute a Plan Phase

> Run through a single phase: branch, implement, audit, PR, review cycle, merge.

## Inputs

1. **Plan directory** — path to the plan folder
2. **Phase number** — which phase to execute (or auto-detect next incomplete)

## Steps

### 1. Read Plan State

```
Read <plan-dir>/README.md
Find the first phase that is NOT marked as done
Read that phase's README.md for steps
```

### 2. Create Branch

```bash
git checkout master && git pull
git checkout -b feature/phase-<N>-<name>
```

### 3. Implement

Follow the phase README steps. For each step:
- Check if research is needed first (use specified CLI helper)
- Implement using **one-test-at-a-time TDD** for logic-heavy code:
  1. Write ONE failing test for the next behavior
  2. Write minimal code to make it pass
  3. Refactor while tests stay green
  4. Repeat for the next behavior
- Do NOT batch-write many tests then one-shot the implementation — this produces low-quality tests that don't guide the design
- Update findings.md with decisions and learnings

**Parallel execution with worktrees:** For phases with independent sub-tasks, spawn Task agents with `isolation: worktree` to work in parallel without file conflicts. Each agent gets its own git worktree and branch. Merge worktree branches back before the PR step.

### 4. Pre-Commit Checks

Run tests:
```bash
bun test   # or npm test
```

### 5. Local CLI Audit (before push!)

Run a CLI agent to audit your changes **before** pushing. This catches issues locally and saves PR review round-trips.

```bash
# Write audit prompt to file
cat > /tmp/phase-audit-prompt.txt << 'EOF'
Audit the files changed in this phase. Look for:
1. Bugs, logic errors, edge cases
2. Security risks (SQL injection, path traversal, etc.)
3. Missing error handling
4. Type safety issues
5. Consistency with surrounding code patterns
Be specific — file paths, line numbers, severity (HIGH/MEDIUM/LOW).
EOF

# Run Cursor audit in background
~/.claude/commands/golem-powers/cli-agents/scripts/run.sh cursor @/tmp/phase-audit-prompt.txt /tmp/phase-audit-result.md
```

Review the output. Fix any HIGH/MEDIUM issues. Re-run tests after fixes.

**Why:** Bot reviewers (CodeRabbit, Cursor Bugbot) take 10-20 minutes. Local audit catches the same issues in one pass, reducing fix-push-wait cycles.

### 6. Commit and Push

```bash
git add <files>
git commit -m "<type>(scope): description"
git push -u origin feature/phase-<N>-<name>
```

### 7. Create PR

Use `/create-pr` skill or:
```bash
gh pr create --title "<type>(scope): phase N description" --body "..."
```

### 8. Review Cycle

Wait ~20 min for reviewers (CodeRabbit, Cursor Bugbot, DeepSource). Start next phase prep while waiting.

For each comment:
- **Real bug** -> Fix it
- **Style preference** -> Fix if better
- **Over-engineering** -> Skip
- **Out of context** -> Reply explaining

Push fixes, repeat until clean.

### 8.5. Cursor Audit (Pre-Merge)

After PR bots are clean, run the structured Cursor audit workflow. See [workflows/cursor-audit.md](cursor-audit.md).

1. Write 8-12 domain-specific audit prompts → `docs.local/prompts/<feature>-audit-prompts.md`
2. User runs in Cursor IDE → results land in `docs.local/logs/audit-*.md`
3. Read results, triage into "fix now" vs "skip/defer"
4. Fix real issues, commit, push
5. Write 3-5 verification prompts → `docs.local/prompts/<feature>-final-verification.md`
6. User runs in Cursor → results land in `docs.local/logs/verify-*.md`
7. All pass → proceed to merge

**Skip this step** for trivial phases (docs-only, config changes, single-file fixes).

### 9. Merge

```bash
gh pr merge <N> --squash
git checkout master && git pull
```

### 10. Update Plan

In `<plan-dir>/README.md`, mark the phase as done:
```
| N | Phase Name | folder | done | PR #XX merged |
```

Update findings.md with final notes.

### 11. Continue

Check if there's a next phase. If yes, go back to step 2.
If all phases done, the plan is complete.
