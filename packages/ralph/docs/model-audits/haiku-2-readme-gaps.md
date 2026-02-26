# Claude-Golem README Gaps & Missing Documentation

**Generated:** 2026-01-26 by Haiku 4.5
**Scope:** Features and commands that exist but are undocumented in README.md
**Methodology:** Systematic comparison of README content vs actual codebase

---

## Table of Contents

1. [Missing Commands](#missing-commands)
2. [Incomplete Command Documentation](#incomplete-command-documentation)
3. [Missing Environment Variables Documentation](#missing-environment-variables-documentation)
4. [Missing Features](#missing-features)
5. [Undocumented Configuration Options](#undocumented-configuration-options)
6. [Unclear/Conflicting Information](#unclearconflicting-information)
7. [Missing Examples](#missing-examples)
8. [Missing Sections](#missing-sections)

---

## Missing Commands

These commands exist and are functional but are NOT listed in README.md

### 1. ralph-kill-orphans

**Status:** Completely undocumented

**What it does:**
- Kills orphaned Ralph processes
- With `--all` flag, kills any fswatch/bun processes even if not tracked
- Cleans up process tracking file

**Where documented:** lib/ralph-commands.zsh lines 98-188

**Suggested addition to README "Commands" table:**
```
| ralph-kill-orphans | Kill stuck Ralph processes |
| ralph-kill-orphans --all | Also kill untracked Ralph-related processes |
```

**Why it matters:** Users may have hung processes from previous sessions

---

### 2. ralph-logs

**Status:** Not mentioned in README

**What it does:**
- Lists recent Ralph crash logs
- Shows last 5 (or N) crash logs from `~/.config/ralphtools/logs/`

**Where documented:** lib/ralph-commands.zsh lines 192-240

**Suggested addition to README:**
```
| ralph-logs [N] | Show N most recent crash logs (default: 5) |
```

**Current status in README:** Not listed

---

### 3. ralph-session [--paths]

**Status:** Mentioned as command but no detail

**What it does:**
- Shows current Ralph session state
- Lists active and dead sessions
- With `--paths` flag, shows data file locations
- Shows last 10 lines of output for debugging

**Where documented:** lib/ralph-commands.zsh lines 15-93

**Current README mention:** Line 100 lists `ralph-status` (different!) but not `ralph-session`

**Issue:** CONFUSION - README has `ralph-status` but `ralph-session` is the actual command

---

### 4. ralph-help

**Status:** Undocumented

**What it does:**
- Shows comprehensive help with all commands
- Explains model routing
- Shows cost tracking info
- Explains configuration

**Where documented:** lib/ralph-commands.zsh lines 243-340

**Suggested addition:**
```
| ralph-help | Show comprehensive help |
```

---

### 5. ralph-whatsnew

**Status:** Undocumented

**What it does:**
- Shows recent changes and improvements

**Where documented:** lib/ralph-commands.zsh lines 343-360

**Note:** This is a stub/placeholder command

---

### 6. ralph-watch [filter]

**Status:** Listed but not documented

**What it does:**
- Live tail of Ralph output with filtering
- Watches latest output file with ANSI colors
- Supports grep filter pattern

**Where documented:** lib/ralph-commands.zsh lines 362-390

**Current README:** Line 102 says `ralph-watch` exists but no detail on what it does

**Needed:**
```
| ralph-watch [filter] | Live tail of Ralph output with optional grep filter |
```

---

### 7. ralph-pids

**Status:** Completely undocumented

**What it does:**
- Lists tracked Ralph process IDs
- Shows PID, type, timestamp, parent PID
- Used for process management

**Where documented:** lib/ralph-watcher.zsh lines 245-280

**Suggested addition:**
```
| ralph-pids | List tracked Ralph process IDs |
```

---

### 8. ralph-terminal-check

**Status:** Completely undocumented

**What it does:**
- Verifies terminal environment
- Checks PTY support
- Validates shell capabilities

**Where documented:** lib/ralph-watcher.zsh lines 283-310

**Why it matters:** Debugging terminal-related issues

---

### 9. ralph-secrets

**Status:** Mentioned in code but not documented in README

**What it does:**
- Manages 1Password integration
- Configures secret injection
- Part of setup wizard

**Where documented:** lib/ralph-secrets.zsh (full file)

**Current README:** Not detailed

**Suggested section:**
```
### 1Password Secret Management

Use `ralph-secrets` to manage secrets via 1Password:

| Command | Purpose |
|---------|---------|
| ralph-secrets | Interactive secret configuration |
| ralph-secrets list | List configured secrets |
| ralph-secrets add | Add new secret from 1Password |
```

---

## Incomplete Command Documentation

These commands are documented but lack important details.

### 1. ralph-start (worktree creation)

**Current documentation:** Lines 107-120 in README

**Gaps:**
- `--install` flag is documented but behavior unclear
- `--symlink-deps` vs `--install` trade-offs not explained
- `--1password` integration with `.env.template` not detailed
- Package manager auto-detection priority order not specified
- Post-setup flow unclear (manual steps needed?)

**Missing:**
```markdown
#### Worktree Workflow

1. Create isolated worktree:
   ralph-start

2. Make changes in worktree
3. Test locally (dev server, tests)
4. Return to main branch:
   ralph-cleanup

#### Package Manager Auto-Detection

Priority (first found):
1. bun.lockb  → bun
2. pnpm-lock.yaml → pnpm
3. yarn.lock → yarn
4. (none) → npm

Override via config.json:
```json
{
  "projects": {
    "my-app": {
      "packageManager": "pnpm"
    }
  }
}
```
```

---

### 2. ralph [N] iterations

**Current documentation:** Line 103 says "default 10"

**Gap:** README says default is 10, but code defaults to 100
- Fix: Change README line 103 to say "default 100"

---

### 3. ralph-cleanup

**Current documentation:** Line 108: "Merge changes and remove worktree"

**Gaps:**
- What happens if changes aren't committed?
- Does it force push or require review?
- Auto-merge strategy?
- Conflict handling?

**Need:** Detailed explanation of merge workflow

---

### 4. fsteps / fs

**Current documentation:** Lines 109, 184-203

**Gaps:**
- `fsteps stats` not documented (shows statistics)
- Difference between `fsteps done ID` and `fsteps apply ID` not clear
- How to use with Ralph automation not explained
- Use case examples missing

**Need:**
```markdown
### Farther-Steps Commands

| Command | Effect |
|---------|--------|
| fsteps | List all steps |
| fsteps pending | Show pending with full details |
| fsteps apply ID | Apply sync (copy file) and mark done |
| fsteps done ID | Mark done without applying |
| fsteps skip ID | Mark as skipped (not needed) |
| fsteps clean | Remove done/skipped entries |
| fsteps stats | Show statistics (pending/done/skipped) |
```

---

## Missing Environment Variables Documentation

These are used in the code but not documented for end users.

### Critical Variables (Document These)

```bash
RALPH_DEBUG_LIVE              # Enable live update debugging
                              # Usage: export RALPH_DEBUG_LIVE=true
                              # Output: /tmp/ralph-live-debug.log

RALPH_LIVE_ENABLED            # Disable live updates
                              # Usage: export RALPH_LIVE_ENABLED=false
                              # Reason: Some terminals don't support file watching

RALPH_CONFIG_DIR              # Override config directory
                              # Default: ~/.config/ralphtools
                              # Usage: export RALPH_CONFIG_DIR=~/.ralph-config

RALPH_LOGS_DIR                # Override logs directory
                              # Default: $RALPH_CONFIG_DIR/logs
                              # Usage: export RALPH_LOGS_DIR=~/.ralph/logs
```

### Model Override Variables

```bash
RALPH_MODEL_US                # Override model for US-* stories
RALPH_MODEL_V                 # Override model for V-* stories
RALPH_MODEL_BUG               # Override model for BUG-* stories
RALPH_MODEL_AUDIT             # Override model for AUDIT-* stories
RALPH_MODEL_MP                # Override model for MP-* stories
RALPH_MODEL_TEST              # Override model for TEST-* stories

# Example: Force all feature work to use Opus
export RALPH_MODEL_US=opus
```

---

## Missing Features

### 1. Smart Model Routing

**Status:** Implemented but not well documented

**Current README:** Line 235 has table showing "Smart Model Routing"

**Gaps:**
- How to override globally
- How to override per-story
- Cost implications not explained
- How to check what model will be used

**Missing documentation:**
```markdown
### Model Override Hierarchy

When Ralph selects a model, it checks (in order):

1. **Per-story override**: `"model": "opus"` in story JSON
2. **Global story-type mapping**: config.json `models.US`, `models.BUG`, etc.
3. **Default**: opus

#### Per-Story Override Example

```json
{
  "id": "US-100",
  "title": "Complex auth system",
  "model": "opus",  // Use Opus specifically for this story
  "criteria": [...]
}
```

#### Global Model Mapping

In ~/.config/ralphtools/config.json:

```json
{
  "models": {
    "US": "sonnet",
    "BUG": "haiku",
    "AUDIT": "opus",
    "MP": "opus",
    "V": "haiku",
    "TEST": "haiku"
  }
}
```

#### Cost-Benefit Analysis

- **Opus** (~$0.015 per 1K input): Complex decisions, architecture
- **Sonnet** (~$0.003 per 1K input): Feature implementation, good balance
- **Haiku** (~$0.00025 per 1K input): Quick verification, testing

Typical session cost (100 iterations):
- All Sonnet: ~$15-30
- Mixed (smart routing): ~$8-12
- All Haiku: ~$1-2 (fast verification)
```
```

---

### 2. Notifications (ntfy Integration)

**Status:** Implemented but gaps in documentation

**Current README:** Lines 248-253

**Gaps:**
- How to set up ntfy account (manual step)
- Private vs public topics not explained
- How notifications work (polling, webhook?)
- Failure handling (what if ntfy is down?)

**Missing:**
```markdown
#### Setting Up ntfy Notifications

1. **Choose your topic** (or let Ralph auto-generate):
   - Default: `etanheys-ralph-${project-name}-notify`
   - Custom: Set in config.json `notifications.ntfyTopic`

2. **Get notifications**:
   - **Web:** https://ntfy.sh/${topic}
   - **Mobile:** Install ntfy app, subscribe to topic
   - **Email:** Not supported by ntfy (use webhook service)

3. **Privacy notes**:
   - Topics are public unless you know the name
   - Don't use personally identifying info in topic
   - Consider: `ralph-${UUID}-notify` for privacy

#### Example Configuration

```json
{
  "notifications": {
    "enabled": true,
    "ntfyTopic": "my-private-ralph-runs"
  }
}
```

#### Troubleshooting Notifications

```bash
# Test notification manually
curl -d "Ralph test" https://ntfy.sh/my-topic

# Check if ntfy is up
curl https://ntfy.sh/health
```
```

---

### 3. Live Updates (fswatch Integration)

**Status:** Implemented but completely undocumented

**What it is:** Real-time progress updates using file watching

**Current README:** Not mentioned

**Missing section:**
```markdown
### Live File Watching

Ralph can watch for changes in prd-json/ and update progress in real-time.

#### Prerequisites

**macOS:**
```bash
brew install fswatch
```

**Linux:**
```bash
sudo apt-get install inotify-tools  # Debian/Ubuntu
```

**Windows (WSL2):**
Not supported (use non-live mode)

#### Behavior

When enabled:
- Progress bar updates within 500ms of file change
- No terminal flashing (ANSI cursor positioning)
- Falls back to manual refresh if tool unavailable

#### Debug Mode

```bash
export RALPH_DEBUG_LIVE=true
ralph 20
# Logs to /tmp/ralph-live-debug.log
tail -f /tmp/ralph-live-debug.log
```
```

---

### 4. Process Tracking & Orphan Management

**Status:** Implemented but undocumented

**What it is:** Ralph tracks all spawned processes for cleanup

**Missing section:**
```markdown
### Process Tracking

Ralph maintains a process tracking file to monitor all spawned Claude, fswatch, and bun processes.

#### Viewing Tracked Processes

```bash
ralph-pids
# Output:
# PID   TYPE               TIMESTAMP           PARENT_PID
# 1234  main-iteration     2026-01-26T14:23:45 1200
# 1235  claude-instance    2026-01-26T14:23:47 1234
# 1236  watcher            2026-01-26T14:23:50 1234
```

#### Cleaning Up Orphans

```bash
# Kill tracked orphans only
ralph-kill-orphans

# Also kill untracked Ralph-related processes (fswatch, bun)
ralph-kill-orphans --all
```

**Use case:** Session crashed, processes stuck in background
```

---

### 5. Crash Logging

**Status:** Code has crash log directory, but not documented

**Missing section:**
```markdown
### Crash Logs

Ralph logs crashes to `~/.config/ralphtools/logs/` for debugging.

#### Viewing Crashes

```bash
# Show 5 most recent crashes
ralph-logs

# Show last 10 crashes
ralph-logs 10

# View specific crash log
cat ~/.config/ralphtools/logs/ralph-crash-2026-01-26-14.23.45.log
```

#### Log Contents

Each log contains:
- Iteration number
- Story being executed
- Error message
- Stack trace (if available)
- Environment details

#### Clearing Logs

```bash
rm -rf ~/.config/ralphtools/logs/*
```
```

---

## Undocumented Configuration Options

### 1. config.json Sections Not Fully Documented

**Current README:** Touches on contexts and projects, incomplete

**Missing documentation for:**

#### models (Model Routing)
```json
{
  "models": {
    "US": "sonnet",      // Feature implementation
    "BUG": "sonnet",     // Bug fixes
    "V": "haiku",        // Verification/testing
    "TEST": "haiku",     // Test creation
    "AUDIT": "opus",     // Audits
    "MP": "opus"         // Master plans
  }
}
```

#### defaults (Runtime Defaults)
```json
{
  "defaults": {
    "maxIterations": 100,     // Max iterations if not specified
    "sleepSeconds": 5         // Gap between iterations
  }
}
```

#### notifications
```json
{
  "notifications": {
    "enabled": true,          // Enable ntfy
    "ntfyTopic": "my-topic"   // Or "auto" for per-project topics
  }
}
```

#### contexts
```json
{
  "contexts": {
    "directory": "~/.claude/contexts",  // Where to load contexts from
    "additional": [                      // Extra contexts to always load
      "workflow/rtl.md",
      "tech/nextjs.md"
    ]
  }
}
```

#### coderabbit
```json
{
  "coderabbit": {
    "enabled": true,          // Enable CR reviews
    "repos": ["*"]            // "*" = all repos, or ["my-app", "other-app"]
  }
}
```

#### projects (Monorepo)
```json
{
  "projects": {
    "my-app": {
      "path": "~/projects/my-app",
      "contexts": ["tech/nextjs.md"],     // Project-specific contexts
      "mcps": {                            // Project-specific MCPs
        "linear": {...}
      },
      "disableChrome": false               // Disable browser automation for this project
    }
  }
}
```

---

### 2. .worktree-sync.json Not Fully Documented

**Current README:** Lines 123-148 show structure but no detail on behavior

**Missing:**
- What happens with `symlinks` vs `files`?
- Are `commands` run in repo root or worktree?
- Error handling (command fails)?
- Timing (before/after install)?

**Suggested detail:**
```markdown
#### files

Files/directories to copy to worktree.

**Behavior:**
- Relative paths: copied from repo root
- Absolute paths: also supported
- Wildcard patterns: NOT supported
- If file doesn't exist: warning logged, continues

**Example:**
```json
{
  "sync": {
    "files": [
      "secrets.json",           // From repo root
      "config/local.yaml",      // Subdirectory
      "/home/user/keys.pem"     // Absolute path
    ]
  }
}
```

#### symlinks

Directories to symlink instead of copy (faster for large directories).

**Behavior:**
- Creates symlink in worktree → main repo path
- Useful for node_modules, .cache, build output
- Changes in worktree affect main repo (shared storage)
- Use for read-heavy directories

**Example:**
```json
{
  "sync": {
    "symlinks": [
      ".cache",                 // Don't duplicate cache
      "data",                   // Share large data files
      "node_modules"            // Option instead of --symlink-deps
    ]
  }
}
```

#### commands

Custom setup commands to run in worktree after sync.

**Behavior:**
- Runs in worktree directory (after cd into it)
- Runs after files/symlinks are synced
- Error stops worktree creation
- Runs before --dev server startup

**Example:**
```json
{
  "sync": {
    "commands": [
      "cp .env.example .env",   // Create .env from template
      "make setup",              // Run custom setup
      "npm run build:types"      // Generate TypeScript types
    ]
  }
}
```
```

---

### 3. Per-Project MCP Configuration

**Status:** Supported but not documented

**What it is:** Different MCPs for different projects

**Example config:**
```json
{
  "projects": {
    "claude-golem": {
      "path": "~/Gits/claude-golem",
      "mcps": {
        "linear": {
          "enabled": true,
          "token": "lin_pat_..."
        },
        "context7": {
          "enabled": true
        }
      }
    }
  }
}
```

---

## Unclear/Conflicting Information

### 1. Iteration Default Conflict

**Issue:** README says "default 10", code says "default 100"

**README line 103:**
```
| ralph [N] | Run N iterations (default 10) |
```

**Code (ralph.zsh line 101):**
```bash
local iterations="$RALPH_MAX_ITERATIONS"
# Where RALPH_MAX_ITERATIONS defaults to 100
```

**Resolution:** Update README to "default 100" OR change code to default 10 (recommend 100 is better)

---

### 2. ralph-status vs ralph-session

**Issue:** README mentions ralph-status, code implements ralph-session

**README line 100:**
```
| ralph-status | Show PRD status |
```

**Code:** No `ralph-status` function found. Command is `ralph-session`

**UI command:** `ralph-status` is in ralph.zsh lines 265-272 (different - calls ralph-ui)

**Confusion:** There are TWO different things:
- `ralph-status` → calls bun ralph-ui --mode=startup
- `ralph-session` → shows session info

Both exist but do different things. README should clarify.

---

### 3. Monorepo Support Unclear

**Issue:** README says `ralph <app> N` works, but main function doesn't support it

**README line 104:**
```
| ralph <app> N | Run on apps/<app>/prd-json/ (monorepo) |
```

**Code:** ralph() function doesn't parse `<app>` argument

**Actual:** Monorepo support via `repoGolem` launchers created during setup

**Solution:** Clarify in README:
```markdown
### Monorepo Support

Ralph supports monorepos through project launchers created during setup.

Run setup:
```bash
ralph-setup
# Select "Add project"
# Specify: my-app, ~/projects/my-app/prd-json
```

Then use:
```bash
runmyapp 20              # Run 20 iterations for my-app
openmyapp               # Open my-app in Claude Code
myappClaude             # Start Claude for my-app
```

NOT: `ralph my-app 20` (this doesn't work)
```
```

---

## Missing Examples

### 1. Configuration Examples

**Gap:** README shows config structure but no complete, real-world examples

**Suggested addition:**
```markdown
## Example Configurations

### Simple Single-Project Setup

```json
{
  "defaultModel": "opus",
  "notifications": {
    "enabled": true,
    "ntfyTopic": "ralph-my-project"
  },
  "models": {
    "US": "sonnet",
    "BUG": "sonnet",
    "V": "haiku",
    "AUDIT": "opus",
    "MP": "opus"
  }
}
```

### Multi-Project (Monorepo) Setup

```json
{
  "defaultModel": "opus",
  "projects": {
    "web": {
      "path": "~/projects/monorepo/apps/web",
      "contexts": ["tech/nextjs.md", "tech/convex.md"]
    },
    "api": {
      "path": "~/projects/monorepo/apps/api",
      "contexts": ["tech/node.md"]
    },
    "mobile": {
      "path": "~/projects/monorepo/apps/mobile",
      "contexts": ["tech/react-native.md"]
    }
  }
}
```

### Cost-Optimized Setup

```json
{
  "defaultModel": "sonnet",
  "models": {
    "US": "sonnet",      // Fast, cheap
    "BUG": "haiku",      // Quick fixes
    "V": "haiku",        // Verification
    "AUDIT": "sonnet",   // Not as thorough as opus
    "MP": "opus"         // Worth the cost
  }
}
```
```

---

### 2. Troubleshooting Examples

**Gap:** No troubleshooting section in README

**Suggested addition:**
```markdown
## Troubleshooting

### Ralph Doesn't Start

**Symptom:** `Error: bun is required but not installed`

**Fix:**
```bash
curl -fsSL https://bun.sh/install | bash
# Add to ~/.zshrc:
export PATH=$HOME/.bun/bin:$PATH
```

### No Live Updates

**Symptom:** Progress doesn't update in real-time

**Cause:** fswatch/inotifywait not installed

**Fix (macOS):**
```bash
brew install fswatch
```

**Fix (Linux):**
```bash
apt-get install inotify-tools
```

**Debug:**
```bash
export RALPH_DEBUG_LIVE=true
ralph 5
tail -f /tmp/ralph-live-debug.log
```

### Notifications Not Working

**Symptom:** `ralph 20 -QN` doesn't send notifications

**Check:**
```bash
# 1. Verify config
cat ~/.config/ralphtools/config.json | grep -A3 notifications

# 2. Test ntfy manually
curl -d "test" https://ntfy.sh/my-topic

# 3. Check topic format (no spaces, special chars)
echo $RALPH_NTFY_TOPIC
```

### Stuck/Hung Ralph Process

**Symptom:** Ralph is frozen, consuming CPU

**Fix:**
```bash
# Kill tracked processes
ralph-kill-orphans

# Kill everything (aggressive)
ralph-kill-orphans --all

# Manual kill if needed
pkill -f "bun.*ralph-ui"
pkill -f "claude"
```
```

---

## Missing Sections

### 1. Advanced Configuration

**Gap:** No section on advanced config options

**Suggested section:**
```markdown
## Advanced Configuration

### Environment Variable Overrides

Ralph respects these environment variables:

| Variable | Effect |
|----------|--------|
| `RALPH_CONFIG_DIR` | Override config location |
| `RALPH_DEBUG_LIVE` | Enable live update debug logs |
| `RALPH_LIVE_ENABLED=false` | Disable live updates |
| `RALPH_MODEL_*` | Override model for story type |

Example:
```bash
export RALPH_DEBUG_LIVE=true
export RALPH_LIVE_ENABLED=false
export RALPH_MODEL_US=opus
ralph 20
```

### Silent Mode (CI/CD)

Run without UI output:
```bash
ralph 100 --quiet
```

### Verbose Debugging

Enable full logging:
```bash
ralph 20 --verbose
```
```

---

### 2. Performance Tuning

**Gap:** No information on optimizing Ralph for speed/cost

**Suggested section:**
```markdown
## Performance & Cost Optimization

### Fast Verification Loop

For quick feedback:
```bash
export RALPH_MODEL_US=haiku
export RALPH_MODEL_BUG=haiku
export RALPH_SLEEP_SECONDS=2
ralph 50
```

Expected time: ~5 minutes for 50 iterations

### Cheaper Development

For long iteration cycles:
```bash
export RALPH_MODEL_AUDIT=sonnet
export RALPH_MODEL_MP=sonnet
ralph 100
```

Cost: ~$10 (vs $30 with all Opus)

### Detailed Tracing

For debugging/learning:
```bash
ralph 10 --verbose
```
```

---

### 3. Monorepo Workflows

**Gap:** No detailed monorepo workflow guide

**Suggested section:**
```markdown
## Monorepo Workflows

### Setup Multiple Projects

```bash
ralph-setup
# Add: web
# Path: ~/monorepo/apps/web/prd-json
# Add: api
# Path: ~/monorepo/apps/api/prd-json
# Add: mobile
# Path: ~/monorepo/apps/mobile/prd-json
```

### Run Projects Separately

```bash
runweb 20        # Ralph for web app (20 iterations)
runapi 30        # Ralph for api (30 iterations)
runmobile 10     # Ralph for mobile (10 iterations)
```

### Synchronize Monorepo

If multiple projects share files:
```bash
ralph-start --install  # Setup worktree with shared installs
```
```

---

### 4. Integration Guides

**Gap:** No guides for integrating with external tools

**Suggested section:**
```markdown
## Integrations

### Linear Integration

Ralph can fetch issues from Linear and create stories:

```bash
/golem-powers:linear
# Create PRD from Linear board
```

See: [Linear skill documentation](docs/skills.md#linear)

### Convex Integration

Ralph can deploy to Convex automatically:

```bash
/golem-powers:convex deploy
```

### 1Password Integration

Store secrets securely:

```bash
/golem-powers:1password
# Configure secret injection
# Use in environment variables
op run --env-file=~/.config/ralphtools/secrets/.env -- ralph 20
```
```

---

## Summary of Gaps

| Category | Count | Priority |
|----------|-------|----------|
| Completely missing commands | 8 | HIGH |
| Incomplete command docs | 5 | HIGH |
| Missing env var docs | 4 | MEDIUM |
| Missing features | 5 | MEDIUM |
| Undocumented config | 6 | MEDIUM |
| Conflicting info | 3 | HIGH |
| Missing examples | 2 | LOW |
| Missing sections | 4 | MEDIUM |

**Total gaps:** 37 items needing documentation

---

## Recommended README Additions (Priority Order)

### CRITICAL (Add to "Commands" table)
1. Ralph-kill-orphans
2. Ralph-logs
3. Ralph-help
4. Ralph-watch
5. Ralph-pids

### HIGH (Add detailed sections)
1. Environment Variables documentation
2. Troubleshooting guide
3. Complete config.json schema
4. Clarify ralph-status vs ralph-session

### MEDIUM (Add examples/sections)
1. Live updates / fswatch setup
2. Notifications setup guide
3. Process tracking explanation
4. Crash logs documentation
5. Monorepo workflows
6. Performance/cost optimization

### LOW (Polish)
1. Configuration examples
2. Integration guides
3. Advanced configuration
4. Model routing deep dive

---

## Files to Update

1. **README.md** - Add missing commands, clarify conflicts
2. **docs/configuration.md** - Add complete config.json documentation
3. **docs/troubleshooting.md** - Create new troubleshooting guide
4. **docs/advanced.md** - Add advanced configuration
5. **docs/monorepo.md** - Create monorepo guide
