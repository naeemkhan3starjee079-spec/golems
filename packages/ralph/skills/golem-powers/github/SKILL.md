---
name: github
description: Use when doing git operations, creating PRs, or managing GitHub issues. Provides gh CLI commands. Covers git, github, commits, PRs, issues, branches, worktrees. NOT for: Linear issues (use linear), code reviews (use coderabbit).
---

# GitHub & Git Operations

> Use `gh` CLI and git commands. Prerequisites: `gh` installed + `gh auth login`.

## Safety Rules

1. **Never force push to main/master** — always create feature branches
2. **Stage specific files** — avoid `git add -A` which can include secrets
3. **Check before commit** — `git status` + `git diff --staged`
4. **Don't commit secrets** — check for .env, credentials, API keys
5. **Ask before destructive operations** — reset --hard, branch -D, etc.

## Troubleshooting: GITHUB_TOKEN Conflict

**Symptom:** `gh` fails with "Bad credentials" even though `gh auth status` shows logged in.

**Cause:** Old/expired `GITHUB_TOKEN` in `.zshrc` overrides valid keyring auth.

**Fix:**
```bash
grep -r "GITHUB_TOKEN" ~/.zshrc ~/.bashrc ~/.zprofile 2>/dev/null
# Remove that line, then:
unset GITHUB_TOKEN
gh auth status  # Should show "Active account: true"
```
