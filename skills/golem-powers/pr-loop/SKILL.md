---
name: pr-loop
description: "The complete PR loop — branch, implement, test, commit, push, PR, WAIT FOR REVIEW, fix, merge, cleanup. Includes PR creation and review comment fetching. Use whenever creating a PR or finishing work. This is NOT optional. Every change goes through this loop. No exceptions."
---

# PR Loop

> The full loop. Not "create PR." Not "push and move on." The FULL loop through MERGED.

## The Iron Law

```
MISSION = MERGED
Not "tests pass." Not "PR created." Not "pushed."
Done = PR merged + branch deleted + main pulled.
```

## The Full Loop

```
1. BRANCH    git checkout main && git pull && git checkout -b feat/name
2. IMPLEMENT Write code (invoke /superpowers:test-driven-development)
3. TEST      Run full test suite — ALL must pass
4. VERIFY    Invoke /superpowers:verification-before-completion
5. COMMIT    git add <specific files> && git commit (invoke /commit)
6. PUSH      git push -u origin feat/name
7. PR        Create PR (see "Creating the PR" below)
8. REVIEW    Fetch + read review comments (see "Reading Reviews" below)
9. FIX       Address real bugs from review
10. MERGE    gh pr merge <N> --squash --delete-branch
11. CLEANUP  git checkout main && git pull
```

---

## Step 7: Creating the PR

### Prerequisites

- `gh` CLI installed (`brew install gh`)
- Authenticated: `gh auth login`
- On a feature/fix branch (not main/master/dev)
- All changes committed

### Create the PR

```bash
# Push branch first
git push -u origin HEAD

# Create PR with structured body
gh pr create --title "feat: description" --body "$(cat <<'EOF'
## Summary
- What changed and why

## Test plan
- [ ] Tests pass
- [ ] Manual verification done

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Edge Cases

- **On main/dev/master**: Don't create PR. Switch to a branch first.
- **Uncommitted changes**: Commit first.
- **PR already exists**: Use `gh pr view` to check, don't create duplicate.
- **Custom base branch**: `gh pr create --base dev`

---

## Step 8: REVIEW (The Critical Step)

**This is NOT optional. This is NOT "auto-merge."**

### For private repos (no bot reviewers):

```bash
# Option A: Use coderabbit:code-reviewer subagent
Agent(subagent_type="coderabbit:code-reviewer", prompt="Review PR #N")

# Option B: Use cr CLI
cr review --plain
```

### For public repos (bot reviewers configured):

```bash
# Option A (preferred): Use /loop to poll for review comments
# /loop 2m gh pr view <N> --comments | tail -20

# Option B: Use CronCreate to schedule review checks
# CronCreate(schedule="*/2 * * * *", command="gh pr view <N> --comments | tail -20")

# Option C (manual): Wait and check once
sleep 90
gh pr view <N> --comments
```

### Reading Review Comments

Fetch comments from all review sources with full context:

```bash
# Quick view of all comments
gh pr view <N> --comments

# Detailed: get review comments with diff context
gh api repos/{owner}/{repo}/pulls/{N}/comments
```

**Review sources (coverage stack):**

| Source | Type | How to Trigger / Check |
|--------|------|----------------------|
| CodeRabbit | AI review + auto-summaries | Auto on PR. Also: CodeRabbit plugin or `cr review --plain` |
| Cursor Bugbot | Bug detection | Comment `@cursor @bugbot review` on PR. For re-review after fixes: `@cursor @bugbot re-review`. Bot responds as `cursor[bot]`. |
| Greptile | AI review + codebase understanding | Greptile Claude Code plugin: `list_merge_request_comments` (trial may expire) |
| DeepSource | Static analysis | Check via CI status |

**IMPORTANT: Trigger Cursor Bugbot on EVERY PR.** Don't wait for it to show up automatically — it requires the `@cursor @bugbot review` comment. After fixing review feedback, trigger `@cursor @bugbot re-review` for another pass.

### Classify each review comment:

| Type | Action |
|------|--------|
| **Real bug** | FIX immediately. Push fix. Re-review. |
| **Security issue** | FIX immediately. This is critical. |
| **Style preference** | Fix if genuinely better. Skip if bikeshed. |
| **Over-engineering suggestion** | SKIP. Note why in PR comment. |
| **False positive** | SKIP. Note why. |

**Severity assessment:**
- **HIGH** = real bug → must fix before merge
- **MEDIUM** = valid improvement → fix if straightforward
- **LOW** = style/nitpick → fix only if genuinely better
- **INFO** = skip

Max 3 review-fix rounds — skip persistent nitpicks after that.

### After addressing reviews:

```bash
git add <files> && git commit -m "fix: address review feedback"
git push
# Wait for another review cycle if changes were significant
```

### Only THEN merge:

```bash
gh pr merge <N> --squash --delete-branch
git checkout main && git pull
```

### After Merge: Update Tracking (MANDATORY)

**Every merged PR MUST update its tracking. No exceptions.**

1. **Collab file** — If this PR is part of a collab, update the task board status to ✅ Done with PR number
2. **Roadmap** — If this PR completes a roadmap phase, update `~/Gits/orchestrator/roadmap/README.md`
3. **BrainLayer** — `brain_store` what changed and why (tagged `pr-merged`, `<project>`)

```
WRONG: Merge PR, exit silently               ← Tracking drift!
WRONG: "I'll update the collab later"         ← You won't. Do it NOW.
WRONG: Only update one of collab/roadmap/BL   ← Update ALL relevant trackers.
```

If you are an autonomous agent, this step is NON-NEGOTIABLE. The orchestrator should NEVER discover completed work by accident.

---

## What NOT To Do

```
WRONG: gh pr create && gh pr merge --auto    ← No review!
WRONG: gh pr create && gh pr merge --squash  ← Same message, no review!
WRONG: "PR created, done!"                   ← Mission is MERGED, not created
WRONG: Skip review "because it's a small change" ← Small changes break things too
```

## Finishing a Branch (Alternative Endings)

Not every branch goes through the full PR flow. When implementation is done:

1. **Verify tests pass** before offering options
2. **Present options:**

| Option | When to Use | Commands |
|--------|-------------|----------|
| **Create PR** (default) | Most cases — full review loop | Continue with steps 7-11 above |
| **Merge locally** | Small team, already reviewed | `git checkout main && git merge <branch> && git branch -d <branch>` |
| **Keep as-is** | Need to park work | Just stop. Worktree preserved. |
| **Discard** | Wrong approach, start over | Requires typed "discard" confirmation. `git branch -D <branch>` |

**Worktree cleanup:** For options 1 (after merge), 3 (never), and 4 (after discard):
```bash
# Check if in worktree
git worktree list | grep $(git branch --show-current)
# If yes, after merging/discarding:
git worktree remove <worktree-path>
```

---

---

## After Merge: Store Component Reasoning

For every NEW file > 50 lines created in this PR:
1. Read `~/Gits/orchestrator/standards/component-reasoning-template.md`
2. Fill in the schema for the new component
3. Run `brain_store` with the filled schema
4. Tag: `["component-reasoning", "{repo}", "{file-slug}", "pr-{number}"]`

**Why this matters:** Future Claude sessions spend zero time opening files to understand "why was X built this way." The reasoning is in BrainLayer, queryable in <1 second.

**Threshold:** Files > 50 lines or files with non-obvious architecture decisions (why pure function? why no LLM calls? why merged instead of split?).

---

## Composability

This skill is referenced by:
- `/large-plan` — every phase goes through this loop
- `/commit` — commit is step 5, this skill is the FULL loop
- Collab files — all autonomous work requires this loop

This skill references:
- `/commit` — step 5 (commit with CodeRabbit review)
- `/superpowers:test-driven-development` — step 2 (implement with TDD)
- `/superpowers:verification-before-completion` — step 4 (verify before claiming)
- `/never-fabricate` — never claim review is green without reading it

## Quick Reference

```bash
# The whole loop in commands:
git checkout main && git pull
git checkout -b feat/my-feature
# ... implement with TDD ...
bun test  # or npm test
git add src/changed-file.ts tests/new-test.ts
git commit -m "feat: description

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push -u origin feat/my-feature
gh pr create --title "feat: description" --body "## Summary\n..."
# WAIT for review (60-90s for bots, or run coderabbit:code-reviewer)
gh pr view <N> --comments  # READ the review
# Fix any real bugs, push again if needed
gh pr merge <N> --squash --delete-branch
git checkout main && git pull
```
