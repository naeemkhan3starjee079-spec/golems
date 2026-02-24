---
name: ralph-install
description: Use when setting up Ralph/claude-golem for the first time. Checks dependencies, installs CLIs, configures 1Password tokens. Covers install ralph, setup ralph, dependencies. NOT for: daily Ralph usage (skills already installed).
---

# Ralph Install Wizard

## Quick Start (in order)

| Step | Workflow | Purpose |
|------|----------|---------|
| 1 | [check-deps](workflows/check-deps.md) | Verify required CLIs |
| 2 | [install-deps](workflows/install-deps.md) | Install missing dependencies |
| 3 | [setup-tokens](workflows/setup-tokens.md) | Configure API tokens in 1Password |
| 4 | [setup-symlinks](workflows/setup-symlinks.md) | Create golem-powers symlink |
| 5 | [validate](workflows/validate.md) | Verify installation end-to-end |
| 6 | [wire-project](workflows/wire-project.md) | Add project to registry |

## Scripts

| Script | Usage |
|--------|-------|
| `scripts/check-deps.sh` | `bash scripts/check-deps.sh` |
| `scripts/install-deps.sh` | `bash scripts/install-deps.sh --all` |
| `scripts/validate.sh` | `bash scripts/validate.sh` |

## Required CLIs

`gh`, `op`, `gum`, `fswatch`, `jq`, `git`, `bun`, `cr` (CodeRabbit, optional)

## API Keys (1Password: `claude-golem` item)

- Context7: `op://Private/claude-golem/context7/API_KEY`
- Linear: `op://Private/claude-golem/linear/API_KEY`
