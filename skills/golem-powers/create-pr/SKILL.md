---
name: create-pr
description: Use when ready to submit work for review. Pushes branch and creates PR via gh CLI. Covers create PR, submit PR, push and PR. NOT for: git commits only (use git directly), reviewing PRs (use coderabbit).
execute: scripts/create-pr.sh
---

# Create PR

Push the current branch to origin and create a pull request against the target branch (default: `main`).

## Prerequisites

- `gh` CLI installed (`brew install gh`)
- Authenticated: `gh auth login`
- On a feature/fix branch (not main/master/dev)
- All changes committed

## Usage

```bash
# Basic usage (auto-generates title and body from commits)
./scripts/create-pr.sh

# With custom title and body
./scripts/create-pr.sh --title "feat: add new feature" --body "Description of changes"

# Against different base branch
./scripts/create-pr.sh --base dev
```

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--title` | PR title | Auto-generated from branch name |
| `--body` | PR description | Template with summary prompt |
| `--base` | Target branch | `main` |

## What It Does

1. **Validates branch** - Ensures you're not on main/master/dev
2. **Checks for uncommitted changes** - Warns if working directory is dirty
3. **Checks for existing PR** - Shows existing PR if one exists
4. **Pushes branch** - `git push -u origin HEAD`
5. **Creates PR** - Using `gh pr create`
6. **Outputs result** - Markdown with PR URL and details

## Edge Cases

- **On main/dev/master branch**: Exits with warning
- **Uncommitted changes**: Exits with warning
- **PR already exists**: Shows existing PR URL instead of creating new one

## Example Output

```markdown
## PR Created Successfully

**Title:** feat: add create-pr skill
**URL:** https://github.com/user/repo/pull/123
**Base:** main ← feature/create-pr

### Summary
- Pushed branch to origin
- Created PR #123
```

## IMPORTANT: This Is Only Step 7

Creating a PR is **step 7 of 11** in the full PR loop. After creating the PR, you MUST:
- **Wait for review** (60-90s for bots, or run `coderabbit:code-reviewer` subagent)
- **Read review comments** (`gh pr view <N> --comments`)
- **Fix real bugs** and push again
- **Only then merge** (`gh pr merge <N> --squash --delete-branch`)

**If you just created a PR and stopped — you're not done.** Invoke `/pr-loop` for the full flow.

## Related Skills

- [pr-loop](/pr-loop) - **The FULL loop** (this skill is just one step)
- [never-fabricate](/never-fabricate) - Read review before claiming clean
- [github](/github) - Full GitHub CLI reference
- [worktrees](/worktrees) - Create isolated worktrees for features
