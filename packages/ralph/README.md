# Claude Golem (Ralph)

### *The Autonomous Engineering Loop for Claude Code*

[![Shell](https://img.shields.io/badge/Shell-Zsh-blue.svg)](https://www.zsh.org/)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-black.svg)](https://bun.sh/)
[![Engine](https://img.shields.io/badge/Engine-Claude--Code-orange.svg)](https://github.com/anthropics/claude-code)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Claude Golem** (codenamed `ralph`) is an autonomous wrapper and context-engineering framework for [Claude Code](https://github.com/anthropics/claude-code). It transforms Claude from a chat-based assistant into a persistent, self-correcting agent capable of executing complex PRDs through iterative development loops.

---

## Key Features

- **🔄 Autonomous Iteration:** Runs Claude in a continuous loop with self-correction and state persistence.
- **📊 Real-time Dashboard:** A React-based TUI (built with Bun/Ink) to monitor progress, costs, and model performance.
- **🛡️ Process Management:** Built-in tools to manage worktrees, clean up orphaned processes, and handle "context rot."
- **🔀 Smart Model Routing:** Automatically switch between Opus (planning), Sonnet (implementation), and Haiku (validation) to optimize cost and speed.
- **🔐 1Password Integration:** Securely injects environment variables and API keys directly from your vaults.
- **📋 Spec-Driven Workflow:** Native support for User Stories (US), Bugs, and PRDs with automated context loading.
- **⚡ Live Criteria Sync:** `fswatch` file watching with ANSI cursor updates for a seamless dev experience.

---

## Quick Start

### 1. Installation

```bash
git clone https://github.com/EtanHey/claude-golem.git ~/Gits/claude-golem
cd ~/Gits/claude-golem

# Run the interactive setup wizard
source ralph.zsh && ralph-setup
```

### 2. First Run

Start an autonomous loop for 50 iterations using Sonnet:

```bash
ralph 50 --sonnet
```

---

## Table of Contents

- [Command Reference](#-command-reference)
- [CLI Flags Reference](#-cli-flags-reference)
- [Environment Variables](#-environment-variables)
- [Configuration Files](#-configuration-files)
- [Smart Model Routing](#-smart-model-routing)
- [Story Types & Prefixes](#-story-types--prefixes)
- [Worktree Usage Guide](#-worktree-usage-guide)
- [Notification Setup (ntfy)](#-notification-setup-ntfy)
- [Cost Tracking](#-cost-tracking)
- [Parallel Verification](#-parallel-verification)
- [Monorepo Support](#-monorepo-support)
- [1Password Integration](#-1password-integration)
- [Project Structure](#-project-structure)
- [Changelog](#-changelog)

---

## Command Reference

### Core Commands

| Command | Description |
| --- | --- |
| `ralph [n]` | Start the autonomous loop for `n` iterations (default: 100) |
| `ralph-status` | Show PRD progress, blocked stories, next story |
| `ralph-live` | Open the live React-Ink dashboard |
| `ralph-stop` | Gracefully stop the current Ralph session |
| `ralph-watch` | Live tail of current Ralph output |

### Worktree Commands

| Command | Description |
| --- | --- |
| `ralph-start` | Create a worktree for isolated Ralph session |
| `ralph-cleanup` | Merge changes and remove worktree |

### Maintenance Commands

| Command | Description |
| --- | --- |
| `ralph-kill-orphans` | Kill orphaned processes from crashed sessions |
| `ralph-kill-orphans --all` | Also kill untracked Ralph processes |
| `ralph-logs [n]` | Show n recent crash logs (default: 5) |
| `ralph-session` | Show current Ralph session state |
| `ralph-session --paths` | Show all data file paths |
| `ralph-terminal-check` | Verify terminal supports the TUI |
| `ralph-terminal-check --save` | Save terminal profile to config |

### PRD & Archive Commands

| Command | Description |
| --- | --- |
| `ralph-init` | Generate PRD structure from prompt file |
| `ralph-archive` | Archive completed stories to docs.local/ |
| `ralph-archive --keep` | Archive only, skip cleanup prompt |
| `ralph-archive --clean` | Archive and auto-cleanup without prompt |

### Configuration Commands

| Command | Description |
| --- | --- |
| `ralph-setup` | Interactive configuration wizard |
| `ralph-setup --configure` | Configure user preferences directly |
| `ralph-secrets setup` | Configure 1Password vault |
| `ralph-secrets status` | Show 1Password configuration |
| `ralph-secrets migrate .env` | Migrate .env file to 1Password |
| `ralph-costs` | Show cost tracking summary |

---

## 🚩 CLI Flags Reference

### Model Selection Flags

| Flag | Description | Model |
| --- | --- | --- |
| `-O`, `--opus` | Use Opus model (default) | `opus` |
| `-S`, `--sonnet` | Use Sonnet model (faster, cheaper) | `sonnet` |
| `-H`, `--haiku` | Use Haiku model (fastest, cheapest) | `haiku` |
| `-G`, `--gemini` | Use Gemini 2.5 Flash | `gemini-flash` |
| `-GL`, `--gemini-lite` | Use Gemini 2.5 Flash-Lite (fast) | `gemini-flash-lite` |
| `-G3`, `--gemini3` | Use Gemini 3 Flash Preview | `gemini-3-flash` |
| `-K`, `--kiro` | Use Kiro model (Amazon's CLI) | `kiro` |
| `-L`, `--local` | Use local Ollama model (via Aider) | `ollama` |

### Behavior Flags

| Flag | Description |
| --- | --- |
| `-QN`, `--notify` | Enable ntfy notifications |
| `-q`, `--quiet` | Quiet mode (no UI) |
| `-v`, `--verbose` | Verbose output |
| `-V`, `--version` | Show version |
| `--help` | Show help |

### TypeScript UI Flags (ralph-ui)

| Flag | Description | Default |
| --- | --- | --- |
| `--run`, `-r` | Enable iteration runner mode | off |
| `--iterations`, `-n <num>` | Number of iterations | 100 |
| `--gap`, `-g <seconds>` | Seconds between iterations | 5 |
| `--model <model>` | Model to use | from config |
| `--mode`, `-m <mode>` | Display mode: startup, iteration, live | live |
| `--prd-path`, `-p <path>` | Path to prd-json directory | ./prd-json |
| `--working-dir`, `-w <path>` | Working directory for Claude | cwd |
| `--pty` | Use PTY for live output (default) | on |
| `--no-pty` | Use child_process spawning | off |
| `--ntfy-topic <topic>` | Ntfy notification topic | from env |

---

## Environment Variables

### Core Variables

| Variable | Description | Default |
| --- | --- | --- |
| `RALPH_CONFIG_DIR` | Config directory path | `~/.config/ralphtools` |
| `RALPH_DEFAULT_MODEL` | Default model for iterations | `opus` |
| `RALPH_MAX_ITERATIONS` | Maximum iterations per run | `100` |
| `RALPH_SLEEP_SECONDS` | Gap between iterations (seconds) | `5` |
| `RALPH_MODEL` | Current model override | (none) |
| `RALPH_ITERATIONS` | Iterations override | (none) |

### Notification Variables

| Variable | Description | Default |
| --- | --- | --- |
| `RALPH_NTFY_TOPIC` | Ntfy topic for notifications | (none) |
| `RALPH_NTFY_PREFIX` | Prefix for auto-generated topics | `etanheys-ralph` |
| `RALPH_NOTIFY` | Enable notifications (set to `1`) | (none) |
| `RALPH_NOTIFY_ENABLED` | Enable notifications from config | (none) |

### Session Variables

| Variable | Description | Default |
| --- | --- | --- |
| `RALPH_SESSION` | Current session ID | auto-generated |
| `RALPH_UI_MODE` | UI mode: live, iteration, startup | `live` |
| `RALPH_RUNTIME` | Runtime: bash or bun | `bun` |

### Smart Routing Variables (set by config)

| Variable | Description | Default |
| --- | --- | --- |
| `RALPH_MODEL_STRATEGY` | Routing strategy: single or smart | `smart` |
| `RALPH_MODEL_US` | Model for US-* stories | `sonnet` |
| `RALPH_MODEL_V` | Model for V-* stories | `haiku` |
| `RALPH_MODEL_TEST` | Model for TEST-* stories | `haiku` |
| `RALPH_MODEL_BUG` | Model for BUG-* stories | `sonnet` |
| `RALPH_MODEL_AUDIT` | Model for AUDIT-* stories | `opus` |
| `RALPH_MODEL_MP` | Model for MP-* stories | `opus` |
| `RALPH_UNKNOWN_TASK_MODEL` | Model for unknown prefixes | `sonnet` |

### Error Handling Variables

| Variable | Description | Default |
| --- | --- | --- |
| `RALPH_MAX_RETRIES` | Max retries on error | `5` |
| `RALPH_NO_MSG_MAX_RETRIES` | Max retries for "no messages" | `3` |
| `RALPH_GENERAL_COOLDOWN` | Cooldown seconds after error | `15` |
| `RALPH_NO_MSG_COOLDOWN` | Cooldown for "no messages" | `30` |

### Parallel Verification Variables

| Variable | Description | Default |
| --- | --- | --- |
| `RALPH_PARALLEL_VERIFICATION` | Enable parallel verification | `false` |
| `RALPH_PARALLEL_AGENTS` | Number of parallel agents | `2` |

### Color Scheme Variables

| Variable | Description | Default |
| --- | --- | --- |
| `RALPH_COLOR_SCHEME` | Color scheme: default, dark, light, minimal, none, custom | `default` |
| `NO_COLOR` | Disable all colors (standard env var) | (none) |

---

## Configuration Files

### config.json

The primary configuration file at `~/.config/ralphtools/config.json`:

```json
{
  "$schema": "https://github.com/EtanHey/claude-golem/blob/main/config.schema.json",
  "schemaVersion": "1.0.0",
  "runtime": "bun",
  "uiMode": "live",

  "modelStrategy": "smart",
  "defaultModel": "opus",
  "unknownTaskType": "sonnet",
  "models": {
    "US": "sonnet",
    "V": "haiku",
    "TEST": "haiku",
    "BUG": "sonnet",
    "AUDIT": "opus",
    "MP": "opus"
  },

  "notifications": {
    "enabled": true,
    "ntfyTopic": "my-ralph-notifications",
    "events": ["all_complete", "error", "blocked"]
  },

  "defaults": {
    "maxIterations": 100,
    "sleepSeconds": 5
  },

  "errorHandling": {
    "maxRetries": 5,
    "noMessagesMaxRetries": 3,
    "generalCooldownSeconds": 15,
    "noMessagesCooldownSeconds": 30
  },

  "parallelVerification": false,
  "parallelAgents": 2,

  "colorScheme": "default",

  "secrets": {
    "provider": "1password",
    "vault": "Private"
  },

  "costEstimation": {
    "enabled": true,
    "warnThreshold": 10.00
  }
}
```

### registry.json

Project registry at `~/.config/ralphtools/registry.json`:

```json
{
  "version": "1.0.0",
  "global": {
    "mcps": {
      "context7": {
        "command": "npx",
        "args": ["-y", "@context7/mcp-server"]
      }
    }
  },
  "projects": {
    "myproject": {
      "path": "/Users/me/projects/myproject",
      "displayName": "My Project",
      "mcps": ["figma", "supabase"],
      "secrets": {
        "SUPABASE_ACCESS_TOKEN": "op://Private/Supabase/token"
      },
      "created": "2024-01-15T10:30:00Z"
    }
  },
  "mcpDefinitions": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-figma"],
      "env": {
        "FIGMA_PERSONAL_ACCESS_TOKEN": "op://Private/Figma/credential"
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {}
    }
  }
}
```

### user-prefs.json

User preferences at `~/.config/ralphtools/user-prefs.json`:

```json
{
  "uiMode": "live",
  "defaultModel": "opus",
  "ntfyTopic": "my-notifications",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## Smart Model Routing

Smart model routing automatically selects the optimal model based on story type prefixes:

| Story Prefix | Default Model | Use Case |
| --- | --- | --- |
| `US-*` | Sonnet | User stories, feature implementation |
| `V-*` | Haiku | Verification stories, quick checks |
| `TEST-*` | Haiku | Test writing, simple validations |
| `BUG-*` | Sonnet | Bug fixes, debugging |
| `AUDIT-*` | Opus | Code audits, complex analysis |
| `MP-*` | Opus | Master plans, architecture work |
| Unknown | Sonnet | Fallback for unknown prefixes |

### Enabling Smart Routing

```json
{
  "modelStrategy": "smart",
  "models": {
    "US": "sonnet",
    "V": "haiku"
  }
}
```

### Story-Level Override

Individual stories can override the model in their JSON:

```json
{
  "id": "US-001",
  "title": "Complex feature",
  "model": "opus"
}
```

---

## Story Types & Prefixes

| Prefix | Type | Description |
| --- | --- | --- |
| `US-*` | User Story | Feature implementation |
| `BUG-*` | Bug Fix | Bug fixes and debugging |
| `V-*` | Verification | UI verification, manual checks |
| `TEST-*` | Test | Test writing, TDD |
| `AUDIT-*` | Audit | Code review, security audit |
| `MP-*` | Master Plan | Architecture, infrastructure |

---

## 🌳 Worktree Usage Guide

Ralph pollutes Claude `/resume` history. Running in a git worktree gives Ralph its own separate Claude session.

### Workflow

```bash
# 1. Create isolated worktree for Ralph
ralph-start

# 2. Follow the output command to enter worktree
cd ~/worktrees/myproject/ralph-session && source ~/.config/ralphtools/ralph.zsh && ralph

# 3. When done, merge and cleanup
ralph-cleanup
```

### ralph-start Flags

| Flag | Description |
| --- | --- |
| `--install` | Run package manager install in worktree |
| `--dev` | Start dev server in background after setup |
| `--symlink-deps` | Symlink node_modules (faster than install) |
| `--1password` | Use 1Password injection (.env.template) |
| `--no-env` | Skip copying .env files |

### .worktree-sync.json

Configure custom sync rules for your project:

```json
{
  "sync": {
    "files": [".env.local", "configs/special.json"],
    "symlinks": ["data/fixtures"],
    "commands": ["bun run codegen"]
  }
}
```

---

## 🔔 Notification Setup (ntfy)

Ralph uses [ntfy.sh](https://ntfy.sh) for push notifications.

### Quick Setup

1. Install ntfy app on your phone
2. Subscribe to your topic
3. Configure Ralph:

```bash
ralph-setup  # Choose "Configure user preferences"
```

Or set directly in config.json:

```json
{
  "notifications": {
    "enabled": true,
    "ntfyTopic": "your-unique-topic-name",
    "events": ["all_complete", "error", "blocked"]
  }
}
```

### Using Notifications

```bash
# Enable for this run
ralph 50 -QN

# Or set in environment
export RALPH_NTFY_TOPIC="my-topic"
ralph 50 --notify
```

### Notification Events

- `all_complete` - All stories finished
- `error` - Iteration failed with error
- `blocked` - All remaining stories blocked
- `iteration` - Each iteration progress (low priority)
- `max_iterations` - Hit iteration limit

### Notification Format

```
Title: [Ralph] Complete
Body:
  myproject
  5 US-001 sonnet
  26 stories 129 criteria $0.28
```

---

## 💰 Cost Tracking

Ralph tracks token usage and estimated costs per iteration.

### View Costs

```bash
ralph-costs
```

Output:
```
Ralph Cost Tracking

Total Stories: 45
Total Cost: $12.34
(28 with actual token data, rest estimated)

By Model:
   sonnet: 30 stories
   haiku: 10 stories
   opus: 5 stories

Recent Runs (last 10):
   2024-01-15 US-001 [sonnet] $0.28 ok
   2024-01-15 V-002 [haiku] $0.05 ok
```

### Cost Data Location

- File: `~/.config/ralphtools/costs.json`
- Reset: `rm ~/.config/ralphtools/costs.json`

### Pricing (per million tokens)

| Model | Input | Output | Cache Create | Cache Read |
| --- | --- | --- | --- | --- |
| Haiku | $1 | $5 | $1.25 | $0.10 |
| Sonnet | $3 | $15 | $3.75 | $0.30 |
| Opus | $15 | $75 | $18.75 | $1.50 |
| Gemini | $0.075 | $0.30 | - | - |

---

## Parallel Verification

For V-* verification stories, Ralph can spawn multiple parallel agents with different focus areas.

### Configuration

```json
{
  "parallelVerification": true,
  "parallelAgents": 3
}
```

### Agent Focus Areas

1. **Desktop viewport** (1920x1080) - Full-width layout verification
2. **Mobile viewport** (375x812) - Responsive behavior, touch targets
3. **Accessibility** - Keyboard navigation, ARIA labels, contrast

### Results Aggregation

- All agents must pass for the story to pass
- Failure reasons logged to progress.txt
- Results stored in `/tmp/ralph_parallel_{story_id}_{pid}/`

---

## 📦 Monorepo Support

Ralph supports monorepo structures with per-app PRDs.

### Directory Structure

```
mymonorepo/
├── apps/
│   ├── web/
│   │   └── prd-json/    # Web app stories
│   ├── mobile/
│   │   └── prd-json/    # Mobile app stories
│   └── api/
│       └── prd-json/    # API stories
├── packages/
└── prd-json/            # Root-level stories
```

### Running on Specific App

```bash
# From monorepo root
cd apps/web
ralph 50

# Or specify path
ralph 50 --prd-path ./apps/web/prd-json
```

### App-Specific Archives

```bash
# Archive specific app
ralph-archive web

# Archives to: docs.local/prd-archive/web-20240115-123456/
```

---

## 1Password Integration

Ralph integrates with 1Password for secure secrets management.

### Setup

```bash
# 1. Install 1Password CLI
brew install 1password-cli

# 2. Sign in
eval $(op signin)

# 3. Configure Ralph
ralph-secrets setup
```

### Migrate Existing .env

```bash
# Preview migration
ralph-secrets migrate .env --dry-run

# Execute migration
ralph-secrets migrate .env

# Override service detection
ralph-secrets migrate .env --service backend
```

### Using 1Password Environments

After migration, secrets are stored as `op://` references:

```bash
# .env.template
DATABASE_URL=op://Private/myproject/database/password
API_KEY=op://Private/myproject/api/credential
```

Load secrets:
```bash
source <(op inject -i .env.template)
# or
op run --env-file .env.template -- your-command
```

### MCP Secrets

MCP servers can use 1Password references:

```json
{
  "mcpDefinitions": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-figma"],
      "env": {
        "FIGMA_PERSONAL_ACCESS_TOKEN": "op://Private/Figma/credential"
      }
    }
  }
}
```

---

## 📂 Project Structure

```
ralph/
├── ralph.zsh              # Main entry point
├── lib/                   # Core Zsh modules
│   ├── ralph-commands.zsh # Helper commands (stop, help, watch)
│   ├── ralph-models.zsh   # Smart routing, costs, ntfy
│   ├── ralph-registry.zsh # Project registry, MCP config
│   ├── ralph-secrets.zsh  # 1Password integration
│   ├── ralph-setup.zsh    # Setup wizard
│   ├── ralph-ui.zsh       # Color schemes, gum detection
│   ├── ralph-watcher.zsh  # File watching
│   └── ralph-worktrees.zsh # Worktree management
├── ralph-ui/              # TypeScript/Ink dashboard
│   └── src/
│       ├── index.tsx      # Entry point
│       ├── components/    # React Ink components
│       ├── hooks/         # Custom hooks
│       ├── runner/        # Iteration runner
│       └── utils/         # Config utilities
├── bun/                   # TypeScript story management
├── skills/golem-powers/   # Skills for Claude
├── contexts/              # Shared context rules
├── tests/                 # Test suite
└── prd-json/              # Story definitions (per-repo)
```

### Data Locations

| Path | Purpose |
| --- | --- |
| `~/.config/ralphtools/` | Config directory |
| `~/.config/ralphtools/config.json` | Main configuration |
| `~/.config/ralphtools/registry.json` | Project registry |
| `~/.config/ralphtools/costs.json` | Cost tracking data |
| `~/.config/ralphtools/logs/` | Crash logs |
| `/tmp/ralph-status-*.json` | Session state |
| `/tmp/ralph_output_*.txt` | Iteration output |
| `./prd-json/` | Story definitions (per-repo) |
| `./progress.txt` | Story progress (per-repo) |

---

## 🤝 Contributing

1. Check `ralph-logs` for any current system bugs
2. Run `ralph-terminal-check` to verify your environment
3. Use the spec-driven workflow: create story in `prd-json/`, run `ralph`
4. Run tests before committing: `./tests/test-ralph.zsh`

---

## The Ecosystem

* **[Zikaron](https://github.com/EtanHey/zikaron):** The memory engine. Indexes conversation logs for a searchable local knowledge base.
* **[Songscript](https://github.com/EtanHey/songscript):** A language-learning app built using the Claude Golem autonomous loop.

---

## 🔄 Changelog

### v2.0.0
**Major architecture update with React Ink UI, modular codebase, and layered prompts.**

- **React Ink UI** - Modern terminal dashboard with live-updating progress
- **Modular codebase** - `ralph.zsh` split into `lib/*.zsh` modules
- **Layered AGENTS prompt** - Story-type-specific prompts (US.md, BUG.md, V.md)
- **`AGENTS.md` auto-update** - Prompts refresh when skills are modified
- **CodeRabbit integration** - CR findings become BUG stories if unfixable
- **`MP` story type** - Master Plan stories for infrastructure work
- **Comprehensive test suite** - 156+ ZSH tests + 83 Bun tests
- Config-driven approach via `ralph-setup` wizard
- Orphan process cleanup and crash logging

### v1.5.0
- **`golem-powers` skills** - Unified skill namespace
- **Modular context system** - Layered `CLAUDE.md` with auto-detection
- **`prd-manager` skill** - Atomic PRD operations
- **1Password vault organization** - Development vault for global tools
- **Commit conventions** - Story-type based (feat/fix/test/refactor)

### v1.4.0
- **Smart Model Routing** - `AUDIT`→`opus`, `US`→`sonnet`, `V`→`haiku`
- **Live criteria sync** - `fswatch` file watching, ANSI cursor updates
- **1Password Environments** - `op run --env-file` integration
- **`ralph-setup` wizard** - `gum`-based first-run experience
- Per-iteration cost tracking with model-aware pricing

### v1.3.0
- **JSON-based PRD format** (`prd-json/` replaces markdown PRD)
- **Smart model routing** for story types
- **Configuration system** (`ralph-config.local` for project settings)

### v1.2.0
- **Comprehensive documentation** for open source release
- **Skills documentation** with `/prd`, `/archive` commands

### v1.1.0
- **Browser tab checking** for MCP verification stories
- **Learnings directory** support (`docs.local/learnings/`)
- **Pre-commit/pre-push hooks** with Claude Haiku validation

### v1.0.0
- Initial Ralph tooling release
- Core loop: spawn fresh Claude, read PRD, implement story, commit
- `ntfy` notification support (`-QN` flag)

---

## ⚖️ License

MIT © EtanHey

---

### *"Give Claude a body, and it will build you a world."*
