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
- Implement the code changes
- Write tests for logic-heavy code
- Update findings.md with decisions and learnings

### 4. Pre-Commit Checks

Run tests:
```bash
bun test   # or npm test
```

### 5. Commit and Push

```bash
git add <files>
git commit -m "<type>(scope): description"
git push -u origin feature/phase-<N>-<name>
```

### 6. Create PR

Use `/create-pr` skill or:
```bash
gh pr create --title "<type>(scope): phase N description" --body "..."
```

### 7. Review Cycle

Wait for reviewers (CodeRabbit, Cursor Bugbot, DeepSource).

For each comment:
- **Real bug** -> Fix it
- **Style preference** -> Fix if better
- **Over-engineering** -> Skip
- **Out of context** -> Reply explaining

Push fixes, repeat until clean.

### 8. Merge

```bash
gh pr merge <N> --squash
git checkout master && git pull
```

### 9. Update Plan

In `<plan-dir>/README.md`, mark the phase as done:
```
| N | Phase Name | folder | done | PR #XX merged |
```

Update findings.md with final notes.

### 10. Continue

Check if there's a next phase. If yes, go back to step 2.
If all phases done, the plan is complete.
