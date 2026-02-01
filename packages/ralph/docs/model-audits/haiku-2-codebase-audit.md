# Claude-Golem Codebase Audit

**Generated:** 2026-01-26 by Haiku 4.5
**Scope:** Complete inventory of commands, functions, flags, and configuration options
**Methodology:** Systematic exploration of ralph.zsh, lib/*.zsh, and ralph-ui/src/index.tsx

---

## Table of Contents

1. [Main Commands (ralph.zsh)](#main-commands)
2. [Helper Commands (lib/ralph-commands.zsh)](#helper-commands)
3. [Ralph-UI Flags (ralph-ui/src/index.tsx)](#ralph-ui-flags)
4. [Environment Variables](#environment-variables)
5. [Undocumented/Hidden Features](#undocumented-features)
6. [Configuration Files](#configuration-files)

---

## Main Commands

### ralph [iterations] [options]

**File:** `/lib/ralph.zsh` (lines 99-231)

The main autonomous loop command. Full documentation in README.md.

**Documented Flags:**
```
-O, --opus          Use Opus model (default)
-S, --sonnet        Use Sonnet model
-H, --haiku         Use Haiku model
-K, --kiro          Use Kiro model (kiro-cli)
-G, --gemini        Use Gemini Flash model
-L, --local         Use local Ollama model (via Aider)
-QN, --notify       Enable ntfy notifications
-q, --quiet         Quiet mode (no UI)
-v, --verbose       Verbose output
-V, --version       Show version
--help              Show help
```

**Hidden/Undocumented:**
- No additional CLI flags found in ralph() function
- Model selection, iterations, and gap all passed to bun via environment variables
- Uses config.json from `~/.config/ralphtools/` for model/notification defaults
- Supports legacy user-prefs.json fallback

**Special Variables Exported:**
```bash
RALPH_MODEL          # Selected model
RALPH_ITERATIONS     # Number of iterations to run
RALPH_SLEEP_SECONDS  # Gap between iterations (default 5s)
RALPH_NTFY_TOPIC     # Notification topic (auto-generated or configured)
RALPH_SESSION        # Unique session ID (ralph-${timestamp}-$$)
RALPH_NOTIFY         # Set if --notify flag used
```

---

## Helper Commands

### ralph-session [--paths]

**File:** `lib/ralph-commands.zsh` (lines 15-93)

Show current Ralph session state and data locations.

**Flags:**
- `--paths` - Show all data file paths

**Output:**
- Active/dead Ralph sessions from `/tmp/ralph-status-*.json`
- Last 10 lines of output for each session
- Progress file status if present
- Optional: Shows locations of temporary and persistent data

**Data Locations Shown:**
```
/tmp/ralph-status-$$.json      # State, lastActivity, error, retryIn
/tmp/ralph_output_$$.txt       # Claude output (current iteration)
~/.config/ralphtools/logs/     # Crash logs
./progress.txt                 # Story progress (per-repo)
./prd-json/                    # Story definitions
```

---

### ralph-kill-orphans [--all]

**File:** `lib/ralph-commands.zsh` (lines 98-188)

Kill Ralph-related orphan processes.

**Flags:**
- `--all` - Also kill processes by name pattern (fswatch, bun ui) even if not tracked

**Behavior:**
- Kills tracked orphans from `$RALPH_PID_TRACKING_FILE`
- With `--all`: searches for untracked fswatch and bun processes
- Cleans up stale entries from tracking file
- Removes tracking file if empty

---

### ralph-logs [count]

**File:** `lib/ralph-commands.zsh` (lines 192-240)

List recent Ralph crash logs.

**Arguments:**
- `[count]` - Number of recent logs to show (default: 5)

**Behavior:**
- Reads from `$RALPH_LOGS_DIR` (typically `~/.config/ralphtools/logs/`)
- Shows file names, sizes, and modification times
- Can tail specific log to view details

---

### ralph-help

**File:** `lib/ralph-commands.zsh` (lines 243-340)

Comprehensive help showing all commands, model routing, and cost tracking.

**Content:**
- Command list with descriptions
- Model routing explanation (US→Sonnet, V→Haiku, etc.)
- Cost tracking information
- Configuration examples

---

### ralph-whatsnew

**File:** `lib/ralph-commands.zsh` (lines 343-360)

Show recent changes and improvements.

---

### ralph-watch [filter]

**File:** `lib/ralph-commands.zsh` (lines 362-390)

Live tail of Ralph output/progress with filtering.

**Arguments:**
- `[filter]` - Optional grep filter (e.g., "error", "iteration")

**Behavior:**
- Tails latest output file with ANSI colors
- Supports filtering by pattern
- Uses `-f` for continuous follow mode

---

### ralph-session (alternative)

**Also documented in lib/ralph-commands.zsh** (lines 393-410)

Show current session info, state, last activity, error messages.

---

### ralph-pids

**File:** `lib/ralph-watcher.zsh` (lines 245-280)

List tracked Ralph process IDs.

**Format:**
```
PID  TYPE              TIMESTAMP           PARENT_PID
1234 main-iteration   2026-01-26T14:23:45 1200
1235 claude-instance  2026-01-26T14:23:47 1234
```

---

### ralph-terminal-check

**File:** `lib/ralph-watcher.zsh` (lines 283-310)

Verify terminal environment and PTY support.

---

## Ralph-UI Flags

**File:** `ralph-ui/src/index.tsx` (lines 100-282)

The TypeScript/Bun UI accepts these flags in addition to the shell wrapper:

### Runner Mode
```
--run, -r                    Enable iteration runner
--iterations, -n <num>       Number of iterations (default: 100)
--gap, -g <seconds>          Seconds between iterations (default: 5)
--model <model>              Model: haiku, sonnet, opus, kiro, gemini-flash, gemini-pro
--quiet, -q                  Suppress UI output
--verbose, -v                Enable verbose logging
--notify                     Send ntfy notifications
--pty                        Use PTY for live output (default, enables streaming)
--no-pty                     Use child_process spawning (legacy mode)
```

### Display Mode (without --run)
```
--mode, -m <mode>            Mode: startup, iteration, or live (default: live)
```

### Common Options
```
--prd-path, -p <path>        Path to prd-json directory
--working-dir, -w <path>     Working directory for Claude
--iteration, -i <num>        Current iteration number for display
--start-time <ms>            Start timestamp in milliseconds
--ntfy-topic <topic>         Ntfy notification topic
--help, -h                   Show help message
```

### Display Modes
- **startup** - Show initial PRD status and exit
- **iteration** - Show iteration status with progress
- **live** - Watch for file changes and update in real-time

### Models Supported
- haiku
- sonnet
- opus
- gemini-flash
- gemini-pro
- kiro

**NOTE:** PTY mode is enabled by default only if supported by the OS. Bun currently doesn't support PTY mode (falls back to `--no-pty` automatically).

---

## Environment Variables

### Config-Related
```bash
RALPH_CONFIG_DIR              ~/.config/ralphtools (default)
RALPH_CONFIG_FILE             $RALPH_CONFIG_DIR/config.json
RALPH_USER_PREFS_FILE         $RALPH_CONFIG_DIR/user-prefs.json (legacy)
RALPH_SCRIPT_DIR              Directory where ralph.zsh is located
RALPH_LIB_DIR                 $RALPH_SCRIPT_DIR/lib
RALPH_UI_PATH                 $RALPH_SCRIPT_DIR/ralph-ui/src/index.tsx
```

### Runtime
```bash
RALPH_VERSION                 Version from VERSION file
RALPH_DEFAULT_MODEL           Default model (from config or env, default: opus)
RALPH_MAX_ITERATIONS          Max iterations allowed (default: 100)
RALPH_SLEEP_SECONDS           Gap between iterations (default: 5)
RALPH_NTFY_PREFIX             Prefix for generated topics (default: etanheys-ralph)
RALPH_NTFY_TOPIC              Explicit ntfy topic override
RALPH_NOTIFY_ENABLED          Set if notifications enabled in config
```

### Iteration-Time (set by ralph() function)
```bash
RALPH_MODEL                   Selected model for iteration
RALPH_ITERATIONS              Number of iterations to run
RALPH_SLEEP_SECONDS           Gap between iterations
RALPH_NTFY_TOPIC              Topic for this session
RALPH_SESSION                 Unique session ID
RALPH_NOTIFY                  Set if --notify used
```

### Colors (ralph-ui.zsh)
```bash
RALPH_COLOR_CYAN              Cyan color code
RALPH_COLOR_GREEN             Green color code
RALPH_COLOR_YELLOW            Yellow color code
RALPH_COLOR_RED               Red color code
RALPH_COLOR_GRAY              Gray color code
RALPH_COLOR_RESET             Reset color code
```

### Watcher/Debug
```bash
RALPH_DEBUG_LIVE              Set to "true" to enable live update debugging
RALPH_LIVE_ENABLED            Set to false to disable live updates
RALPH_DEBOUNCE_MS             Debounce interval for file watching (default: 500ms)
RALPH_WATCHER_PID             PID of file watcher process
RALPH_WATCHER_FIFO            FIFO file for watcher communication
RALPH_WATCHER_PIDFILE         File storing watcher PID
RALPH_PID_TRACKING_FILE       File tracking all Ralph processes
RALPH_LOGS_DIR                Directory for crash logs
```

### Model Routing (from config.json)
```bash
RALPH_MODEL_STRATEGY          "single" or "smart" (default: single)
RALPH_MODEL_US                Model for US-* stories (default: sonnet)
RALPH_MODEL_V                 Model for V-* stories (default: haiku)
RALPH_MODEL_TEST              Model for TEST-* stories (default: haiku)
RALPH_MODEL_BUG               Model for BUG-* stories (default: sonnet)
RALPH_MODEL_AUDIT             Model for AUDIT-* stories (default: opus)
RALPH_MODEL_MP                Model for MP-* stories (default: opus)
RALPH_UNKNOWN_TASK_MODEL      Fallback model for unknown types (default: sonnet)
RALPH_RUNTIME                 "bun" or "bash" (default: bun)
```

---

## Undocumented Features

### 1. Debug Logging for Live Updates
**Feature:** Real-time file watching debug output
**Activation:** `export RALPH_DEBUG_LIVE=true`
**Output File:** `/tmp/ralph-live-debug.log`
**Use:** Debugging fswatch/inotifywait integration
**Status:** Undocumented in README, but mentioned in code comments

### 2. Process Tracking and Orphan Management
**File:** `lib/ralph-watcher.zsh`
**Features:**
- Tracks all Ralph-related PIDs in `$RALPH_PID_TRACKING_FILE`
- Stores: PID, type (main-iteration, claude-instance, etc.), timestamp, parent PID
- `ralph-kill-orphans --all` goes beyond tracked processes
- Cleans up stale entries automatically
- Removes tracking file when empty

**Not documented in README**

### 3. Crash Log Collection
**File:** `lib/ralph-commands.zsh`
**Location:** `~/.config/ralphtools/logs/`
**Features:**
- Automatic crash log collection
- Recent crash analysis via `ralph-logs`
- Accessible but not mentioned in README

### 4. File Watcher Platform Detection
**File:** `lib/ralph-watcher.zsh` (lines 26-36)
**Features:**
- Detects fswatch (macOS) vs inotifywait (Linux)
- Falls back gracefully if neither available
- Uses FIFO for inter-process communication
- Debouncing with 500ms default

**Not documented in README**

### 5. Monorepo Support (Partial)
**File:** `lib/ralph-registry.zsh`
**Features:**
- `repoGolem` function generates launchers for multiple projects
- Reads from config.json projects section
- Creates dynamic functions: run${ProjectName}, open${ProjectName}, etc.
- Support for per-project contexts

**Mentioned in README (line 104: "ralph <app> N") but implementation details undocumented**

### 6. Custom Registry Launchers
**File:** `lib/ralph-registry.zsh`
**Features:**
- Dynamically generates launchers from config.json projects
- Each project gets: run/open/claude functions
- Supports per-project MCP configuration
- Supports per-project context loading

**Implementation exists but not documented in detail**

### 7. 1Password Integration with Environments
**File:** `lib/ralph-secrets.zsh`
**Features:**
- `_ralph_op_*` functions for 1Password CLI integration
- Environment variable detection and mapping
- Vault organization support
- Global vs project-scoped secrets

**Mentioned in README but implementation details sparse**

### 8. Context Migration on Setup
**File:** `lib/ralph-setup.zsh` (function: `_ralph_setup_context_migration`)
**Features:**
- Auto-migrates contexts from global ~/.claude/ to project
- Detects tech stacks and enables relevant contexts
- Updates AGENTS.md based on available skills/prompts

**Not documented in README**

### 9. MCP Definition Management
**File:** `lib/ralph-setup.zsh` (functions: `_ralph_setup_manage_mcp_definitions`, etc.)
**Features:**
- Add/view/remove custom MCP definitions
- Per-project MCP configuration
- Stores in config.json under projects[].mcps

**Not documented in README**

### 10. Obsidian MCP Setup Wizard
**File:** `lib/ralph-setup.zsh` (function: `_ralph_setup_obsidian_mcp`)
**Features:**
- Interactive setup for Obsidian MCP plugin
- Port configuration
- 1Password integration for URL storage

**Mentioned in README section but wizard implementation details undocumented**

### 11. CodeRabbit Configuration per Project
**File:** `lib/ralph-setup.zsh` (function: `_ralph_setup_configure_coderabbit`)
**Features:**
- Per-project CodeRabbit enable/disable
- Repo whitelisting
- Wildcard support (*) for all repos

**Mentioned in README but not detailed**

### 12. Worktree Sync Configuration (`.worktree-sync.json`)
**File:** README.md (lines 123-148), `lib/ralph-worktrees.zsh`
**Features:**
- Custom file sync rules: `sync.files`
- Symlink instead of copy: `sync.symlinks`
- Post-setup commands: `sync.commands`

**Documented in README but implementation details sparse**

### 13. Ralph Start with Installation Modes
**File:** `lib/ralph-worktrees.zsh` (function: `ralph-start`)
**Flags Not in README:**
```bash
--install           # Run package manager install in worktree
--dev               # Start dev server in background
--symlink-deps      # Symlink node_modules (faster)
--1password         # Use 1Password injection
--no-env            # Skip .env copying
```

These ARE in README (lines 111-121) but could be clearer

### 14. NPM/BUN/PNPM Auto-Detection
**File:** `lib/ralph-worktrees.zsh`
**Features:**
- Auto-detects package manager from lock files
- Priority: bun.lockb > pnpm-lock.yaml > yarn.lock > npm (default)

**Documented in README line 121 but briefly**

### 15. Smart Context Loading
**File:** `lib/ralph-registry.zsh` (function: `_ralph_setup_mcps`)
**Features:**
- Per-project contexts loaded based on detection
- Tech stack detection (Next.js, Convex, Supabase, etc.)
- Stores in config.json under projects[].contexts

**Documented conceptually but implementation details sparse**

---

## Configuration Files

### ~/.config/ralphtools/config.json

**Schema:** Full structure in `schemas/config.schema.json`

**Key Sections:**
```json
{
  "defaultModel": "opus",
  "runtime": "bun",
  "modelStrategy": "single",
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
    "enabled": false,
    "ntfyTopic": "auto"
  },

  "defaults": {
    "maxIterations": 100,
    "sleepSeconds": 5
  },

  "contexts": {
    "directory": "~/.claude/contexts",
    "additional": ["workflow/testing.md"]
  },

  "projects": {
    "my-app": {
      "path": "~/projects/my-app",
      "contexts": ["tech/nextjs.md"],
      "mcps": {...},
      "disableChrome": false
    }
  },

  "coderabbit": {
    "enabled": true,
    "repos": ["*"]
  }
}
```

### ~/.config/ralphtools/ralph-config.local (Optional)

**Purpose:** Local shell variable overrides
**Format:** Shell variables (sourced by ralph.zsh)
**Not standard** - rarely used

### ~/.config/ralphtools/user-prefs.json (Legacy)

**Purpose:** Old preference file (now in config.json)
**Format:** JSON with defaultModel, ntfyTopic
**Status:** Deprecated, but still supported as fallback

### .worktree-sync.json (Per-Repo)

**Location:** Repo root
**Purpose:** Custom worktree sync rules

**Schema:**
```json
{
  "sync": {
    "files": ["secrets.json", "config/local.yaml"],
    "symlinks": [".cache", "data"],
    "commands": ["cp .env.example .env", "make setup"]
  }
}
```

### VERSION (Ralph Version)

**Location:** `$RALPH_SCRIPT_DIR/VERSION`
**Format:** Single line: `X.Y.Z`
**Fallback:** "0.0.0" if not found

---

## Statistics

| Category | Count | Status |
|----------|-------|--------|
| Main commands | 1 (ralph) | Documented |
| Helper commands | 15+ | Partially documented |
| Ralph-UI flags | 20+ | Documented |
| Environment variables | 40+ | Mostly undocumented |
| Undocumented features | 15+ | See section above |
| Functions (internal) | 35+ | Source documented |
| Configuration sections | 8+ | Schema documented |

---

## Gaps & Issues

### In README.md
1. **ralph-session** - Listed but minimal documentation
2. **ralph-kill-orphans** - Not listed at all
3. **ralph-logs** - Not listed at all
4. **ralph-watch** - Listed but no detail
5. **RALPH_DEBUG_LIVE** - No documentation
6. **Process tracking** - Undocumented
7. **Crash logs** - Undocumented
8. **File watcher details** - Undocumented

### In Configuration Documentation
1. **Models section in config.json** - Should be documented
2. **MCP definitions per-project** - Not explained
3. **.worktree-sync.json** - Documented but could be clearer
4. **Contexts auto-detection** - Not detailed

### In Code Quality
1. **ralph-start flags** - Listed in README but not in help text
2. **PTY mode documentation** - Mentioned but support status unclear (Bun doesn't support it)
3. **Model routing** - Works but only documented in README, not in code

---

## Recommendations

1. Update README to include all commands in the "Commands" table
2. Document environment variables section (at least the most important ones)
3. Add subsections for undocumented features (process tracking, debug logging)
4. Clarify PTY mode support on different platforms
5. Add examples for common workflows (debug mode, orphan cleanup, monorepo setup)
6. Document .worktree-sync.json schema more clearly
7. List all config.json sections in README
