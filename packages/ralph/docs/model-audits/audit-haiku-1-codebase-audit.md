# Claude-Golem Codebase Audit - Commands, Functions & Flags

Generated: 2026-01-26

## Table of Contents
1. Main Commands (ralph.zsh)
2. Helper Commands (lib/ralph-commands.zsh)
3. Function Library Modules
4. TypeScript/Bun CLI Flags
5. Environment Variables
6. Configuration Files
7. Registry & Setup Commands

---

## 1. Main Commands (ralph.zsh)

### Core Command: ralph()
The main autonomous coding loop command.

**Usage:**
```bash
ralph [iterations] [options]
```

**Supported Iterations:**
- Default: 100 (from RALPH_MAX_ITERATIONS)
- Can be set via first numeric argument
- Configurable via config.json

**Model Flags:**
- `-O, --opus` - Use Claude Opus model (default)
- `-S, --sonnet` - Use Claude Sonnet model (faster, cheaper)
- `-H, --haiku` - Use Claude Haiku model (fastest, cheapest)
- `-K, --kiro` - Use Kiro model (kiro-cli)
- `-G, --gemini` - Use Gemini Flash model
- `-L, --local` - Use local Ollama model (via Aider)

**Notification Flags:**
- `-QN, --notify` - Enable ntfy notifications (requires RALPH_NTFY_TOPIC)

**Output Flags:**
- `-q, --quiet` - Quiet mode (no UI output)
- `-v, --verbose` - Verbose logging

**Info Flags:**
- `-V, --version` - Show Ralph version
- `--help, -h` - Show help message

**Exit Code:**
- Returns 1 if prd-json/ directory not found
- Returns 1 if bun not installed
- Returns 1 if ralph-ui not found

### Alias: ralph-V
Shortcut for `ralph --version`

### Alias: fsteps
Shortcut for `$RALPH_HOME/scripts/farther-steps.sh` (deferred actions queue)

### Alias: fs
Shortcut for `fsteps`

---

## 2. Helper Commands (lib/ralph-commands.zsh)

### ralph-session [--paths]
Shows current Ralph session state and data locations.

**Options:**
- `--paths` - Show all data file paths (session, persistent storage locations)

**Output includes:**
- Running Ralph sessions with PIDs
- Session state (active, dead, stale)
- Last activity timestamp
- Associated error messages
- Output file paths and line counts
- Progress.txt current story

**Data locations shown:**
- /tmp/ralph-status-$$.json - Session state file
- /tmp/ralph_output_$$.txt - Current iteration output
- ~/.config/ralphtools/logs/ - Crash logs
- ./progress.txt - Story progress
- ./prd-json/ - Story definitions

### ralph-kill-orphans [--all]
Kill orphan processes from crashed Ralph sessions.

**Options:**
- `--all` - Also kill untracked Ralph processes by pattern

**Without --all:**
- Kills tracked orphans from PID tracking file
- Removes stale entries

**With --all:**
- Also kills fswatch processes watching prd-json
- Also kills bun processes in ralph-ui directory

### ralph-logs [count]
Show recent crash logs.

**Arguments:**
- `count` (optional, default: 5) - Number of recent logs to show

**Output includes:**
- Timestamp, story ID, log file path
- Each log shows last 10 lines of output
- Path to full log file

### ralph-help
Show comprehensive Ralph command reference.

**Shows:**
- All main commands with descriptions
- Flags and their usage
- Session isolation options (ralph-start, ralph-cleanup)
- Maintenance commands
- Color schemes
- JSON mode info

### ralph-stop
Stop all running Ralph processes immediately.

**Details:**
- Kills processes matching "claude --dangerously-skip-permissions"
- Waits 1 second for graceful shutdown
- Reports number killed and remaining processes

**Error message if processes remain:**
- "Try: pkill -9 -f 'claude'"

### ralph-whatsnew [--all]
Show changelog for current or all versions.

**Options:**
- `--all` - Show full version history instead of just current version

**Versions available:**
- 1.3.0, 1.2.0, 1.1.0, 1.0.0 (and more)

### ralph-init [app]
Create PRD JSON structure (prd-json/).

**Arguments:**
- `app` (optional) - App name for monorepo (creates apps/<app>/prd-json/)

**Creates:**
- prd-json/index.json
- prd-json/stories/ directory

### ralph-status
Show PRD progress, blocked stories, and next story.

**Delegates to:**
- `bun "$RALPH_UI_PATH" --mode=startup`

### ralph-live [N]
Live refreshing status (watch mode).

**Arguments:**
- `N` (optional, default: 3) - Refresh interval in seconds

**Delegates to:**
- `bun "$RALPH_UI_PATH" --mode=live`

**Alternative names:**
- `ralph-ui [prd_path]` - Same functionality

### ralph-watch
Live tail of current Ralph output.

**Watches:**
- /tmp/ralph_output_$$.txt (current iteration output)

### ralph-cleanup
Merge changes and remove worktree.

**Used after:**
- `ralph-start` (for isolated sessions)

### ralph-start [options]
Create worktree for isolated Ralph session.

**Options:**
- `--install` - Run package manager install in worktree
- `--dev` - Start dev server in background after setup
- `--symlink-deps` - Symlink node_modules (faster than install)
- `--1password` - Use 1Password injection via .env.template
- `--no-env` - Skip copying .env and .env.local files

**Auto-detects package manager:**
- bun (bun.lockb)
- pnpm (pnpm-lock.yaml)
- yarn (yarn.lock)
- npm (package-lock.json, default)

**Worktree isolation:**
- Creates git worktree for parallel execution
- Can be configured via .worktree-sync.json

### ralph-learnings
Manage learnings in docs.local/learnings/.

### ralph-costs
Show cost tracking summary.

**Shows:**
- Per-iteration costs
- Total costs
- Cost per story
- Cost estimates

### ralph-terminal-check [--save] [--quiet]
Detect terminal capabilities and test UI support.

**Options:**
- `--save` - Save terminal profile to config
- `--quiet` - Suppress output (for scripting)

**Tests:**
- Terminal type detection
- Color support
- Unicode support
- Kitty graphics protocol
- Cursor positioning
- Box drawing characters
- Render speed
- Emoji width handling

---

## 3. Function Library Modules

### lib/ralph-ui.zsh
Terminal UI utilities and colors.

**Functions:**
- `_ralph_color_story_id()` - Format story ID with color
- `_ralph_color_model()` - Format model name with color
- `_ralph_color_cost()` - Format cost with color
- `_ralph_success()` - Print success message in green
- `_ralph_error()` - Print error message in red
- `_ralph_warning()` - Print warning message in yellow
- `_ralph_bold()` - Print bold text
- `_ralph_display_width()` - Get display width of string
- `_ralph_format_elapsed()` - Format elapsed time in human-readable format

**Color Variables:**
- RALPH_COLOR_GREEN
- RALPH_COLOR_RED
- RALPH_COLOR_YELLOW
- RALPH_COLOR_CYAN
- RALPH_COLOR_BOLD
- RALPH_COLOR_RESET
- RALPH_COLOR_GRAY
- RALPH_COLOR_MAGENTA
- RALPH_COLOR_PURPLE
- RALPH_COLOR_GOLD
- RALPH_COLOR_BLUE

**Color Schemes:**
- default (bright colors)
- dark (high-contrast)
- light (muted)
- minimal (red/green only)
- none (no colors)
- custom (defined in config)

### lib/ralph-models.zsh
Model routing and cost tracking.

**Functions:**
- `_ralph_load_config()` - Load config.json and user-prefs.json
- `_ralph_get_model_for_story()` - Route story to appropriate model
- `_ralph_show_routing()` - Display model routing configuration
- `_ralph_init_costs()` - Initialize cost tracking
- `_ralph_get_session_tokens()` - Get token usage for session
- `_ralph_log_cost()` - Log story cost
- `_ralph_ntfy()` - Send ntfy notifications

**Model Routing (smart):**
- US-* → Sonnet
- V-* → Haiku
- TEST-* → Haiku
- BUG-* → Sonnet
- AUDIT-* → Opus
- MP-* → Opus (Master Plan)
- Unknown → configurable via unknownTaskType

### lib/ralph-registry.zsh
Project registry and MCP management.

**Functions:**
- `_ralph_migrate_to_registry()` - Migrate from old config formats
- `_ralph_load_registry()` - Load registry.json
- `_ralph_get_project_config()` - Get config for current project
- `_ralph_current_project()` - Get current project name
- `_ralph_resolve_mcp_secrets()` - Resolve 1Password secrets for MCPs
- `_ralph_build_mcp_config()` - Build MCP configuration
- `_ralph_inject_secrets()` - Inject secrets into environment
- `_ralph_generate_env_1password()` - Generate .env with 1Password refs
- `_ralph_run_parallel_verification()` - Run verification agents in parallel
- `_ralph_aggregate_parallel_results()` - Aggregate results from agents
- `repoGolem()` - Create project launcher function
- `_ralph_generate_launchers_from_registry()` - Auto-generate launchers
- `_ralph_setup_first_run_check()` - First-run setup check
- `_ralph_setup_welcome()` - Welcome message
- `_ralph_generate_launchers()` - Generate launcher commands

**Generated Functions (per project):**
- `run${ProjectName}()` - Run Ralph on project
- `open${ProjectName}()` - Open project in IDE
- `${projectName}Claude()` - Open Claude for project

### lib/ralph-secrets.zsh
1Password integration and secret management.

**Functions:**
- `ralph-secrets` - Main secrets management command
- `_ralph_detect_service()` - Detect service from environment variable name
- `_ralph_normalize_key()` - Normalize key names
- `_ralph_is_global_var()` - Check if variable is global
- `_ralph_check_op_environments()` - Check 1Password environments
- `_ralph_setup_mcps()` - Setup MCPs from config
- `_ralph_get_available_mcps()` - List available MCPs

### lib/ralph-setup.zsh
Interactive setup wizard.

**Functions:**
- `ralph-setup [--skip-context-migration] [--configure]` - Main setup wizard
- Flags:
  - `--skip-context-migration` - Skip context migration step
  - `--configure, -c` - Run user preferences wizard only

**Setup sections:**
1. Project registration
2. MCP configuration (per-project)
3. MCP definitions management
4. 1Password environments setup
5. Secrets migration (.env → 1Password)
6. Environment file generation
7. CodeRabbit configuration
8. Obsidian MCP setup
9. Context migration
10. Configuration viewer
11. User preferences (model routing, colors, notifications)

### lib/ralph-watcher.zsh
File watching and live updates.

**Functions:**
- `_ralph_check_fswatch()` - Check if fswatch is installed
- `_ralph_debug_live()` - Debug live mode
- `_ralph_start_watcher()` - Start fswatch watcher
- `_ralph_stop_watcher()` - Stop watcher
- `_ralph_poll_updates()` - Poll for file changes
- `_ralph_get_cursor_row()` - Get terminal cursor row

### lib/ralph-worktrees.zsh
Git worktree management.

**Functions:**
- Worktree creation, switching, cleanup
- .worktree-sync.json support for custom sync rules

---

## 4. TypeScript/Bun CLI Flags (ralph-ui/src/index.tsx)

These flags are passed to `bun ralph-ui/src/index.tsx [options]`.

### Runner Mode
- `--run, -r` - Enable iteration runner (executes Claude in a loop)

### Iteration Options
- `--iterations, -n <num>` - Number of iterations (default: 100, env: RALPH_ITERATIONS)
- `--gap, -g <seconds>` - Seconds between iterations (default: 5, env: RALPH_SLEEP_SECONDS)
- `--model <model>` - Model: haiku, sonnet, opus, kiro, gemini-flash, gemini-pro (env: RALPH_MODEL)

### Output Options
- `--quiet, -q` - Suppress UI output (runner only)
- `--verbose, -v` - Enable verbose logging
- `--notify` - Send ntfy notifications (env: RALPH_NOTIFY)

### PTY Options
- `--pty` - Use PTY for live output (default if supported)
- `--no-pty` - Use child_process spawning (legacy mode)

### Display Mode
- `--mode, -m <mode>` - Mode: startup, iteration, or live (default: live)

### Path Options
- `--prd-path, -p <path>` - Path to prd-json directory (default: ./prd-json)
- `--working-dir, -w <path>` - Working directory for Claude (default: cwd)

### Display Options
- `--iteration, -i <num>` - Current iteration number for display (default: 1)
- `--start-time <ms>` - Start timestamp in milliseconds (default: now)
- `--ntfy-topic <topic>` - Ntfy notification topic (env: RALPH_NTFY_TOPIC)

### Help
- `--help, -h` - Show help message

### Examples
```bash
# Run iterations with display
bun ralph-ui/src/index.tsx --run --iterations 100 --model opus

# Run quietly (no UI)
bun ralph-ui/src/index.tsx --run --quiet

# Display only (watch mode)
bun ralph-ui/src/index.tsx --mode live

# Display PRD status once
bun ralph-ui/src/index.tsx --mode startup
```

---

## 5. Environment Variables

### User-Set Variables
- `RALPH_CONFIG_DIR` - Config directory (default: $HOME/.config/ralphtools)
- `RALPH_USER_PREFS_FILE` - User preferences file location
- `RALPH_NOTIFY_ENABLED` - Enable notifications in config
- `RALPH_NTFY_PREFIX` - Prefix for ntfy topics (default: etanheys-ralph)
- `RALPH_NTFY_TOPIC` - Notification topic (from config or --notify flag)
- `RALPH_DEFAULT_MODEL` - Default model (from config.json)
- `RALPH_MAX_ITERATIONS` - Max iteration count (default: 100)
- `RALPH_SLEEP_SECONDS` - Gap between iterations (default: 5)

### Runtime Variables (set by ralph.zsh)
- `RALPH_MODEL` - Current model being used
- `RALPH_ITERATIONS` - Number of iterations to run
- `RALPH_NOTIFY` - Set if notifications enabled
- `RALPH_SESSION` - Session ID (ralph-{timestamp}-{pid})

### Runtime Variables (set by bun ralph-ui)
- `RALPH_ITERATIONS` - From CLI
- `RALPH_SLEEP_SECONDS` - From CLI
- `RALPH_MODEL` - From CLI
- `RALPH_NOTIFY` - From CLI
- `RALPH_SESSION` - From parent ralph.zsh

### Model Configuration Variables
- `RALPH_MODEL_STRATEGY` - "single" or "smart"
- `RALPH_MODEL_US` - Model for US-* stories
- `RALPH_MODEL_V` - Model for V-* stories
- `RALPH_MODEL_TEST` - Model for TEST-* stories
- `RALPH_MODEL_BUG` - Model for BUG-* stories
- `RALPH_MODEL_AUDIT` - Model for AUDIT-* stories
- `RALPH_MODEL_MP` - Model for MP-* stories
- `RALPH_UNKNOWN_TASK_MODEL` - Fallback for unknown types
- `RALPH_PARALLEL_VERIFICATION` - Enable parallel V-* execution
- `RALPH_PARALLEL_AGENTS` - Number of parallel agents (1-5)

### UI Variables
- `RALPH_COLOR_SCHEME` - Color scheme (default, dark, light, minimal, none, custom)
- `RALPH_HAS_GUM` - Whether gum CLI is available
- `RALPH_LIVE_ENABLED` - Live mode enabled
- `RALPH_LIVE_RETRY_SECONDS` - Retry interval
- `RALPH_LIVE_MAX_RETRIES` - Max retries
- `RALPH_UI_MODE` - Current UI mode (startup, iteration, live)
- `RALPH_DETECTED_STACK` - Auto-detected tech stack
- `RALPH_DETECTED_MONOREPO` - Monorepo detection

### Internal Variables
- `RALPH_SCRIPT_DIR` - Ralph installation directory
- `RALPH_VERSION` - Ralph version
- `RALPH_LIB_DIR` - Lib modules directory
- `RALPH_LOGS_DIR` - Logs directory
- `RALPH_CONFIG_FILE` - Config file path
- `RALPH_REGISTRY_FILE` - Registry file path
- `RALPH_STATUS_FILE` - Status file for current session
- `RALPH_PID_TRACKING_FILE` - Orphan PID tracking
- `RALPH_CONTEXTS_DIR` - Contexts directory
- `RALPH_HOME` - Ralph home (deprecated)
- `RALPH_COSTS_DIR` - Costs directory
- `RALPH_COSTS_FILE` - Costs file
- `RALPH_PROMPT_FILE` - Prompt file
- `RALPH_WATCHER_PID` - Watcher process ID
- `RALPH_WATCHER_PIDFILE` - Watcher PID file path
- `RALPH_WATCHER_FIFO` - Watcher FIFO path

---

## 6. Configuration Files

### ~/.config/ralphtools/config.json (Primary)
Main Ralph configuration file.

**Key sections:**
- `modelStrategy` - "single" or "smart"
- `defaultModel` - Default model name
- `unknownTaskType` - Fallback model
- `models` - Per-task-type model assignment
- `parallelVerification` - Enable parallel agents
- `parallelAgents` - Number of agents
- `notifications` - Notification settings
- `defaults` - Max iterations, sleep seconds
- `secrets` - Secret provider (file or 1password)
- `pricing` - Cost per million tokens
- `costEstimation` - Cost estimation settings

**Schema:** schemas/config.schema.json

### ~/.config/ralphtools/registry.json (Project Registry)
Centralized project and MCP configuration.

**Key sections:**
- `version` - Schema version
- `global` - Global MCPs
- `projects` - Project configurations
- `mcpDefinitions` - Reusable MCP definitions

**Generated launchers:**
- Per-project `run{Project}()`, `open{Project}()`, `{project}Claude()` functions

**Schema:** schemas/registry.schema.json

### ~/.config/ralphtools/user-prefs.json (Fallback)
Legacy user preferences file (now replaced by config.json).

### ~/.config/ralphtools/ralph-config.local
Optional local overrides for config.json (sourced after loading config.json).

### .worktree-sync.json (Per-repo)
Custom worktree sync rules.

**Sections:**
- `sync.files` - Files/dirs to copy
- `sync.symlinks` - Files/dirs to symlink
- `sync.commands` - Post-setup commands

---

## 7. Registry & Setup Commands

### _ralph_migrate_to_registry [--force]
Migrate from legacy config formats to registry.json.

**Migration sources:**
- projects.json (legacy)
- shared-project-mcps.json (legacy)
- repo-claude-v2.zsh (legacy)

**Options:**
- `--force` - Recreate registry from scratch

### _ralph_setup_add_project
Add project to registry (interactive).

### _ralph_setup_configure_mcps
Configure MCPs globally and per-project (interactive).

### _ralph_setup_configure_mcps_for_project
Configure MCPs for a specific project (interactive).

### _ralph_setup_manage_mcp_definitions
Add/view/remove MCP definitions (interactive).

### _ralph_setup_add_mcp_definition
Add new MCP definition.

### _ralph_setup_view_mcp_definition
View existing MCP definition.

### _ralph_setup_remove_mcp_definition
Remove MCP definition.

### _ralph_setup_configure_op_environments
Setup 1Password environments (interactive).

### _ralph_setup_migrate_secrets
Migrate .env files to 1Password (interactive).

### _ralph_setup_generate_env_files
Generate .env files with 1Password references.

### _ralph_setup_configure_coderabbit
Enable/configure CodeRabbit integration (interactive).

### _ralph_setup_obsidian_mcp
Setup Obsidian MCP integration (interactive).

### _ralph_setup_context_migration
Migrate CLAUDE.md contexts (interactive).

### _ralph_setup_view_config
Show current configuration.

### _ralph_setup_user_preferences
Configure user preferences: model routing, colors, notifications (interactive).

---

## Summary by Category

### Commands for Execution
- `ralph` - Main loop
- `ralph-start` - Isolated worktree
- `ralph-cleanup` - Finish isolated session

### Commands for Monitoring
- `ralph-status` - Show progress
- `ralph-live` - Live watch
- `ralph-session` - Session state
- `ralph-watch` - Output tail
- `ralph-logs` - Crash logs

### Commands for Maintenance
- `ralph-stop` - Kill processes
- `ralph-kill-orphans` - Clean up orphans
- `ralph-terminal-check` - Test terminal

### Commands for Setup
- `ralph-setup` - Interactive wizard
- `ralph-init` - Create PRD

### Commands for Info
- `ralph-help` - Command reference
- `ralph-whatsnew` - Changelog
- `ralph-costs` - Cost tracking
- `ralph-learnings` - Learnings management

### Configuration Management
- `ralph-setup --configure` - User preferences
- Config files: config.json, registry.json, .worktree-sync.json

### Deferred Actions
- `fsteps` / `fs` - Manage farther-steps queue
