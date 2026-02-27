# PR Review Loop Rules

> Full autonomous PR lifecycle: push → create PR → poll reviews → fix issues → merge → clean branch.

## "PR loop" = Fully Autonomous Through Merge

When the user says "PR loop" or "do a PR loop", execute the ENTIRE cycle without stopping to ask:

1. **Branch** — create feature branch from master
2. **Commit** — stage + commit with conventional message
3. **Push** — `git push -u origin <branch>`
4. **Create PR** — `gh pr create` with summary + test plan
5. **Poll reviews** — wait for CodeRabbit/Greptile/DeepSource (see below)
6. **Fix issues** — triage comments, fix HIGH/MEDIUM, push fixes
7. **Re-poll** — check for new issues after fix push
8. **Merge** — `gh pr merge --squash` when clean
9. **Clean up** — `git checkout master && git pull && git branch -d <branch> && git push origin --delete <branch>`

**DO NOT stop to ask "want me to merge?" — that defeats the purpose. Merge when reviews are clean.**

## Timer Management

Background timers ARE allowed — they keep the foreground free for other work. The rules:

1. **MAX 1 timer per purpose.** Before setting a new "wait for review" timer, clear any existing one for the same PR.
2. **Clear timers when the event already happened.** If the user merged the PR, or you checked and reviews are already in — cancel the timer immediately. Don't let it fire as "stale."
3. **Clear timers on context switch.** If Claude was triggered by user input and the PR is already merged/handled, clear all review timers.
4. **Background timer is the default.** Use `Bash(sleep 600, run_in_background: true)` (10 min) to wait for reviews — keeps foreground free for other work. When it completes, poll `gh api` once to check.
5. **Foreground polling for quick checks.** Use `for` loop with `sleep 30` only when you need the result immediately (e.g., about to merge).

**Anti-pattern:** Setting 5-6 background sleep tasks that all fire after compaction as "stale timer" notifications. This was the Sprint 3 issue.

## Polling Pattern (golems)

```bash
# Poll for CodeRabbit review — max 3 min (6 × 30s)
for i in $(seq 1 6); do
  review=$(gh api repos/EtanHey/golems/pulls/NUMBER/reviews \
    --jq '.[] | select(.user.login == "coderabbitai") | .state' 2>/dev/null)
  if [ -n "$review" ]; then echo "CodeRabbit: $review"; break; fi
  sleep 30
done

# Check which bots commented
gh api repos/EtanHey/golems/pulls/NUMBER/comments --jq '.[].user.login' | sort -u
```

## Polling Pattern (brainlayer)

Same but with `repos/EtanHey/brainlayer/pulls/NUMBER/...`

## CodeRabbit Quota

| Plan | Reviews/Hour | Notes |
|------|-------------|-------|
| Free | 3/hour | Shared between CLI and PR reviews |
| Pro | 8/hour | Per-developer |

- CodeRabbit typically posts within **30-90 seconds** for small PRs
- If rate-limited: wait 20 min, then retry
- CLI `cr review` and GitHub PR reviews share the same quota

## After Review

1. Use `/pr-comments` skill or `gh api` to fetch inline comments
2. Triage: HIGH = real bugs (fix), MEDIUM = judgment call, LOW/style = skip
3. Push fixes → re-poll (same pattern, or reuse existing timer — NOT a new stacked timer)
4. Merge when clean

## Teaching Reviewers

When CodeRabbit raises a recurring false positive, add a learning comment:
```
@coderabbitai This pattern is intentional because [reason]. Please learn this for future reviews.
```
