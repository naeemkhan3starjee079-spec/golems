#!/bin/zsh
# ═══════════════════════════════════════════════════════════════════
# RALPH COMMANDS - Helper commands for Ralph operations
# ═══════════════════════════════════════════════════════════════════
# Part of the Ralph modular system. Sourced by ralph.zsh
# Contains: ralph-stop, ralph-help, ralph-whatsnew, ralph-watch,
#           ralph-session, ralph-logs, ralph-kill-orphans, etc.
# ═══════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════
# ralph-session - Show current Ralph session state and data locations
# ═══════════════════════════════════════════════════════════════════
# Usage: ralph-session [--paths]
#   --paths : Show all data file paths
ralph-session() {
  local show_paths=false
  [[ "$1" == "--paths" ]] && show_paths=true

  local CYAN='\033[0;36m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local RED='\033[0;31m'
  local NC='\033[0m'

  echo ""
  echo "${CYAN}═══ Ralph Status ═══${NC}"
  echo ""

  # Find running Ralph sessions
  local status_files=(/tmp/ralph-status-*.json(N))

  if [[ ${#status_files[@]} -eq 0 ]]; then
    echo "${YELLOW}No active Ralph sessions found${NC}"
  else
    for sf in "${status_files[@]}"; do
      local pid=$(basename "$sf" | sed 's/ralph-status-//; s/.json//')
      local state=$(jq -r '.state // "unknown"' "$sf" 2>/dev/null)
      local last=$(jq -r '.lastActivity // 0' "$sf" 2>/dev/null)
      local error=$(jq -r '.error // null' "$sf" 2>/dev/null)
      local now=$(date +%s)
      local age=$((now - last))

      # Check if process is alive
      if ps -p "$pid" &>/dev/null; then
        echo "${GREEN}● Session $pid: $state${NC} (active ${age}s ago)"
      else
        echo "${RED}○ Session $pid: $state${NC} (dead, ${age}s stale)"
      fi

      [[ "$error" != "null" && -n "$error" ]] && echo "  Error: $error"

      # Show last output (BUG-029: show last 5-10 lines for debugging)
      local output_file="/tmp/ralph_output_${pid}.txt"
      if [[ -f "$output_file" ]]; then
        local lines=$(wc -l < "$output_file" 2>/dev/null | tr -d ' ')
        local bytes=$(wc -c < "$output_file" 2>/dev/null | tr -d ' ')
        echo "  Output: $output_file ($lines lines, $bytes bytes)"
        if [[ "$lines" -gt 0 ]]; then
          echo ""
          echo "  ${YELLOW}Last 10 lines:${NC}"
          # Filter out ANSI escape codes and show last 10 lines, indented
          tail -10 "$output_file" 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | sed 's/^/    /'
        fi
      fi
      echo ""
    done
  fi

  # Show progress.txt location if in a repo
  if [[ -f "./progress.txt" ]]; then
    local last_story=$(grep "^Story:" ./progress.txt 2>/dev/null | tail -1 | cut -d: -f2 | xargs)
    local last_status=$(grep "^Status:" ./progress.txt 2>/dev/null | tail -1 | cut -d: -f2 | xargs)
    echo "${CYAN}Progress file:${NC} ./progress.txt"
    echo "  Last story: $last_story - $last_status"
    echo ""
  fi

  # Show paths if requested
  if $show_paths; then
    echo "${CYAN}═══ Data Locations ═══${NC}"
    echo ""
    echo "  ${YELLOW}Session (temporary):${NC}"
    echo "    /tmp/ralph-status-\$\$.json  - State, lastActivity, error, retryIn"
    echo "    /tmp/ralph_output_\$\$.txt   - Claude output for current iteration"
    echo ""
    echo "  ${YELLOW}Persistent:${NC}"
    echo "    ~/.config/ralphtools/logs/  - Crash logs"
    echo "    ./progress.txt              - Story progress (per-repo)"
    echo "    ./prd-json/                 - Story definitions (per-repo)"
    echo "    ./prd-json/index.json       - Story order, pending, completed"
    echo ""
  fi
}

# Kill all Ralph-related orphan processes
# Usage: ralph-kill-orphans [--all]
#   --all : Also kill processes by name pattern (fswatch, bun ui) even if not tracked
ralph-kill-orphans() {
  local kill_all=false
  [[ "$1" == "--all" ]] && kill_all=true

  echo ""
  echo "${RALPH_COLOR_CYAN:-\033[0;36m}Ralph Orphan Process Cleanup${RALPH_COLOR_RESET:-\033[0m}"
  echo ""

  # First, kill tracked orphans
  local orphans=$(_ralph_find_orphans)

  if [[ -n "$orphans" ]]; then
    echo "Tracked orphan processes:"
    _ralph_kill_orphans
    echo ""
  else
    echo "No tracked orphan processes found."
  fi

  # If --all flag, also look for Ralph-related processes by name
  if [[ "$kill_all" == "true" ]]; then
    echo ""
    echo "Searching for untracked Ralph-related processes..."

    # Look for common Ralph child processes
    local untracked_count=0

    # fswatch watching prd-json or stories
    local fswatch_pids=$(pgrep -f "fswatch.*prd-json\|fswatch.*stories" 2>/dev/null)
    if [[ -n "$fswatch_pids" ]]; then
      # Use ${(f)...} to split on newlines for safe PID iteration
      for pid in ${(f)fswatch_pids}; do
        [[ -z "$pid" ]] && continue
        echo "  Killing untracked fswatch: PID $pid"
        kill "$pid" 2>/dev/null
        ((untracked_count++))
      done
    fi

    # bun processes in ralph-ui directory
    local bun_pids=$(pgrep -f "bun.*ralph-ui" 2>/dev/null)
    if [[ -n "$bun_pids" ]]; then
      # Use ${(f)...} to split on newlines for safe PID iteration
      for pid in ${(f)bun_pids}; do
        [[ -z "$pid" ]] && continue
        echo "  Killing untracked bun (ralph-ui): PID $pid"
        kill "$pid" 2>/dev/null
        ((untracked_count++))
      done
    fi

    if [[ $untracked_count -eq 0 ]]; then
      echo "  No untracked Ralph processes found."
    else
      echo "  Killed $untracked_count untracked process(es)."
    fi
  fi

  # Clean up stale entries from tracking file
  if [[ -f "$RALPH_PID_TRACKING_FILE" ]]; then
    local stale_count=0
    local tmp="${RALPH_PID_TRACKING_FILE}.tmp"
    > "$tmp"

    while read -r pid type timestamp parent_pid; do
      [[ -z "$pid" ]] && continue
      # Only keep entries for still-running processes
      if kill -0 "$pid" 2>/dev/null; then
        echo "$pid $type $timestamp $parent_pid" >> "$tmp"
      else
        ((stale_count++))
      fi
    done < "$RALPH_PID_TRACKING_FILE"

    mv "$tmp" "$RALPH_PID_TRACKING_FILE"

    if [[ $stale_count -gt 0 ]]; then
      echo ""
      echo "Cleaned up $stale_count stale tracking entries."
    fi

    # Remove file if empty
    if [[ ! -s "$RALPH_PID_TRACKING_FILE" ]]; then
      rm -f "$RALPH_PID_TRACKING_FILE"
    fi
  fi

  echo ""
  echo "${RALPH_COLOR_GREEN:-\033[0;32m}✓ Cleanup complete${RALPH_COLOR_RESET:-\033[0m}"
  echo ""
}

# List recent crash logs
# Usage: ralph-logs [count]
ralph-logs() {
  local count="${1:-5}"

  if [[ ! -d "$RALPH_LOGS_DIR" ]]; then
    echo "No logs directory found at $RALPH_LOGS_DIR"
    return 1
  fi

  local logs=($(find "$RALPH_LOGS_DIR" -name "crash-*.log" 2>/dev/null | sort -r | head -"$count"))

  if [[ ${#logs[@]} -eq 0 ]]; then
    echo "No crash logs found."
    return 0
  fi

  echo ""
  echo "${RALPH_COLOR_CYAN:-\033[0;36m}Recent Ralph Crash Logs:${RALPH_COLOR_RESET:-\033[0m}"
  echo ""

  for log in "${logs[@]}"; do
    local timestamp=$(basename "$log" | sed 's/crash-//; s/\.log$//' | tr '_' ' ')
    local story=$(grep "^Story:" "$log" 2>/dev/null | head -1 | cut -d' ' -f2)
    echo "  📄 $timestamp"
    [[ -n "$story" && "$story" != "unknown" ]] && echo "     Story: $story"
    echo "     Path: $log"
    echo ""
  done

  echo "To view a log: ${RALPH_COLOR_GRAY:-\033[0;90m}cat <path>${RALPH_COLOR_RESET:-\033[0m}"
  echo ""
}

# ralph-stop - Stop any running Ralph loops
ralph-stop() {
  local YELLOW='\033[1;33m'
  local GREEN='\033[0;32m'
  local RED='\033[0;31m'
  local NC='\033[0m'

  echo "${YELLOW}🛑 Stopping Ralph processes...${NC}"

  local count=$(pgrep -f "claude --dangerously-skip-permissions" 2>/dev/null | wc -l | tr -d ' ')

  if [[ "$count" -eq 0 ]]; then
    echo "${GREEN}✓ No Ralph processes running${NC}"
    return 0
  fi

  pkill -f "claude --dangerously-skip-permissions" 2>/dev/null
  sleep 1

  local remaining=$(pgrep -f "claude --dangerously-skip-permissions" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$remaining" -eq 0 ]]; then
    echo "${GREEN}✓ Stopped $count Ralph process(es)${NC}"
  else
    echo "${RED}⚠ $remaining process(es) still running. Try: pkill -9 -f 'claude'${NC}"
  fi
}

# ralph-help - Show all Ralph commands
ralph-help() {
  local CYAN='\033[0;36m'
  local BOLD='\033[1m'
  local GRAY='\033[0;90m'
  local GREEN='\033[0;32m'
  local NC='\033[0m'

  echo ""
  echo "${CYAN}${BOLD}Ralph Commands${NC}"
  echo ""
  echo "  ${BOLD}ralph [N] [sleep]${NC}     Run N iterations (default 10)"
  echo "  ${BOLD}ralph <app> N${NC}         Run on apps/<app>/ with auto branch"
  echo ""
  echo "  ${BOLD}ralph-init [app]${NC}      Create PRD JSON structure (prd-json/)"
  echo "  ${BOLD}ralph-archive [app]${NC}   Archive completed stories to docs.local/"
  echo "  ${BOLD}ralph-status${NC}          Show PRD progress, blocked stories, next story"
  echo "  ${BOLD}ralph-live [N]${NC}        Live refreshing status (default: 3s)"
  echo "  ${BOLD}ralph-learnings${NC}       Manage learnings in docs.local/learnings/"
  echo "  ${BOLD}ralph-watch${NC}           Live tail of current Ralph output"
  echo "  ${BOLD}ralph-stop${NC}            Kill all running Ralph processes"
  echo ""
  echo "${GREEN}Session Isolation:${NC}"
  echo "  ${BOLD}ralph-start${NC}           Create worktree for isolated Ralph session"
  echo "    ${GRAY}--install${NC}           Run package manager install in worktree"
  echo "    ${GRAY}--dev${NC}               Start dev server in background after setup"
  echo "    ${GRAY}--symlink-deps${NC}      Symlink node_modules (faster than install)"
  echo "    ${GRAY}--1password${NC}         Use 1Password injection (.env.template)"
  echo "    ${GRAY}--no-env${NC}            Skip copying .env files"
  echo "  ${BOLD}ralph-cleanup${NC}         Merge changes and remove worktree"
  echo ""
  echo "${GREEN}Maintenance:${NC}"
  echo "  ${BOLD}ralph-kill-orphans${NC}    Kill orphan processes from crashed sessions"
  echo "    ${GRAY}--all${NC}               Also kill untracked Ralph processes"
  echo "  ${BOLD}ralph-logs [N]${NC}        Show N recent crash logs (default: 5)"
  echo "  ${BOLD}ralph-terminal-check${NC}  Detect terminal capabilities and test UI support"
  echo "    ${GRAY}--save${NC}              Save terminal profile to config"
  echo "    ${GRAY}--quiet${NC}             Suppress output (for scripting)"
  echo ""
  echo "${GRAY}Flags:${NC}"
  echo "  ${BOLD}-QN${NC}                   Enable ntfy notifications"
  echo "  ${BOLD}--compact, -c${NC}         Compact output mode (less verbose)"
  echo "  ${BOLD}--debug, -d${NC}           Debug output mode (more verbose)"
  echo "  ${BOLD}--ui-ink${NC}              Use React Ink UI dashboard (default, requires bun)"
  echo "  ${BOLD}--ui-bash${NC}             Force traditional zsh-based UI (fallback)"
  echo ""
  echo "${GREEN}Model Flags:${NC}"
  echo "  ${BOLD}-O${NC}                    Opus (Claude, default)"
  echo "  ${BOLD}-S${NC}                    Sonnet (Claude, faster)"
  echo ""
  echo "${GRAY}Deprecated Flags (use smart routing instead):${NC}"
  echo "  ${GRAY}-H                    Haiku (use config.json)${NC}"
  echo "  ${GRAY}-K                    Kiro CLI (use config.json)${NC}"
  echo "  ${GRAY}-G                    Gemini CLI (use config.json)${NC}"
  echo ""
  echo "${GREEN}Smart Model Routing:${NC}"
  echo "  Configure via ralph-setup or config.json. Story prefixes"
  echo "  auto-select models: US→Sonnet, V→Haiku, BUG→Sonnet, etc."
  echo ""
  echo "${GREEN}Color Schemes:${NC}"
  echo "  Set in config.json via 'colorScheme' field:"
  echo "  - default  Bright colors (recommended)"
  echo "  - dark     High-contrast bright colors"
  echo "  - light    Muted colors for terminals with light backgrounds"
  echo "  - minimal  Only errors (red) and success (green)"
  echo "  - none     Disable all colors (for CI/logs)"
  echo "  - custom   Define custom colors in config.json"
  echo ""
  echo "  NO_COLOR env var automatically disables colors"
  echo ""
  echo "${GREEN}JSON Mode:${NC}"
  echo "  Ralph auto-detects prd-json/ folder for JSON mode."
  echo "  Falls back to PRD.md if prd-json/ not found."
  echo ""
  echo "${GREEN}Info:${NC}"
  echo "  ${BOLD}ralph-costs${NC}            Show cost tracking summary"
  echo "  ${BOLD}ralph-whatsnew${NC}         Show what's new in current version"
  echo "  ${BOLD}ralph --version${NC}        Show Ralph version"
  echo ""
}

# ralph-whatsnew - Show changelog (current version by default, --all for full history)
ralph-whatsnew() {
  local show_all=false

  # Parse arguments
  [[ "$1" == "--all" ]] && show_all=true

  if $show_all; then
    # Show all versions from newest to oldest
    echo ""
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│  📜 Ralph Version History                                   │"
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""

    # Display each version (manually ordered from newest to oldest)
    for version in "1.3.0" "1.2.0" "1.1.0" "1.0.0"; do
      _ralph_show_changelog_version "$version"
    done
  else
    # Show only current version
    _ralph_show_changelog_version "$RALPH_VERSION"
  fi
}

# ralph-watch - Live tail of current Ralph iteration output
ralph-watch() {
  local CYAN='\033[0;36m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[1;33m'
  local RED='\033[0;31m'
  local GRAY='\033[0;90m'
  local BOLD='\033[1m'
  local NC='\033[0m'

  # Find the most recent ralph output file
  local ralph_files=$(ls -t /tmp/ralph_output_*.txt 2>/dev/null | head -5)

  if [[ -z "$ralph_files" ]]; then
    echo "${YELLOW}No Ralph output files found in /tmp/${NC}"
    echo "${GRAY}Start a Ralph loop first: ralph 10${NC}"
    return 1
  fi

  # Show available files
  echo "${CYAN}${BOLD}📺 Ralph Watch${NC}"
  echo ""

  local has_running=false
  local latest_running=""

  echo "${GRAY}Available output files:${NC}"
  local i=1
  echo "$ralph_files" | while read -r file; do
    [[ -z "$file" ]] && continue
    local pid=$(basename "$file" | sed 's/ralph_output_//' | sed 's/.txt//')
    local size=$(wc -c < "$file" 2>/dev/null | tr -d ' ')
    local size_human="$(( size / 1024 ))KB"
    [[ "$size" -lt 1024 ]] && size_human="${size}B"
    local modified=$(stat -f "%Sm" -t "%H:%M:%S" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f2 | cut -d'.' -f1)
    local status_str=""
    if ps -p "$pid" > /dev/null 2>&1; then
      status_str="${GREEN}● RUNNING${NC}"
    else
      status_str="${GRAY}○ finished${NC}"
    fi
    echo "   ${BOLD}[$i]${NC} PID $pid  $status_str  ${GRAY}${size_human}  $modified${NC}"
    i=$((i + 1))
  done
  echo ""

  # Check if any Ralph is currently running (look for tee writing to ralph output)
  local running_pid=$(pgrep -f "tee /tmp/ralph_output" 2>/dev/null | head -1)
  local latest=$(echo "$ralph_files" | head -1)
  local latest_pid=$(basename "$latest" | sed 's/ralph_output_//' | sed 's/.txt//')
  local latest_size=$(wc -c < "$latest" 2>/dev/null | tr -d ' ')

  if [[ -z "$running_pid" ]]; then
    echo "${YELLOW}⚠ No Ralph process currently running${NC}"
    echo ""
    if [[ "$latest_size" -gt 0 ]]; then
      echo "${GRAY}Last output (final 30 lines):${NC}"
      echo "${CYAN}─────────────────────────────────────────────────────────────${NC}"
      tail -30 "$latest"
    else
      echo "${GRAY}Output file is empty${NC}"
    fi
    return 0
  fi

  echo "${GREEN}✓ Ralph is running (PID: $running_pid)${NC}"
  echo "${CYAN}Watching:${NC} $latest"
  echo "${GRAY}Press Ctrl+C to stop${NC}"
  echo ""
  echo "${CYAN}─────────────────────────────────────────────────────────────${NC}"

  # Tail the file with follow
  tail -f "$latest" 2>/dev/null
}

# ═══════════════════════════════════════════════════════════════════
# jqf - Run jq with filter from stdin (avoids shell escaping issues)
# ═══════════════════════════════════════════════════════════════════
# Usage: jqf 'filter' file.json           # prints result
#        jqf 'filter' file.json -i        # in-place edit
#        echo 'filter' | jqf - file.json  # filter from stdin
#
# Examples:
#   jqf '.pending | map(select(. != "FOO"))' index.json
#   jqf '.passes = true' story.json -i
#
# Why: Shell escapes != to \!= breaking jq. This writes filter to
#      temp file, avoiding escaping issues entirely.
jqf() {
  local filter="$1"
  local file="$2"
  local inplace=false
  [[ "$3" == "-i" ]] && inplace=true

  # Handle filter from stdin
  if [[ "$filter" == "-" ]]; then
    filter=$(cat)
  fi

  # Validate
  if [[ -z "$filter" || -z "$file" ]]; then
    echo "Usage: jqf 'filter' file.json [-i]" >&2
    return 1
  fi

  if [[ ! -f "$file" ]]; then
    echo "Error: File not found: $file" >&2
    return 1
  fi

  # Write filter to temp file (avoids shell escaping)
  local tmp_filter=$(mktemp)
  local tmp_output=$(mktemp)
  echo "$filter" > "$tmp_filter"

  # Run jq
  if jq -f "$tmp_filter" "$file" > "$tmp_output" 2>&1; then
    if $inplace; then
      mv "$tmp_output" "$file"
    else
      cat "$tmp_output"
      rm -f "$tmp_output"
    fi
    rm -f "$tmp_filter"
    return 0
  else
    cat "$tmp_output" >&2
    rm -f "$tmp_filter" "$tmp_output"
    return 1
  fi
}

# ═══════════════════════════════════════════════════════════════════
# TERMINAL CAPABILITY DETECTION AND TESTING (US-110)
# ═══════════════════════════════════════════════════════════════════

# Detect terminal emulator from environment variables
# Returns: terminal name (e.g., "iTerm2", "Ghostty", "Kitty", "Unknown")
_ralph_detect_terminal() {
  local term_program="${TERM_PROGRAM:-}"
  local term="${TERM:-}"
  local lc_terminal="${LC_TERMINAL:-}"

  # Check specific terminal environment variables
  case "$term_program" in
    iTerm.app)     echo "iTerm2" ;;
    ghostty)       echo "Ghostty" ;;
    WezTerm)       echo "WezTerm" ;;
    Apple_Terminal) echo "Terminal.app" ;;
    tmux)          echo "tmux" ;;
    vscode)        echo "VS Code" ;;
    *)
      # Check TERM variable for additional info
      case "$term" in
        xterm-kitty)  echo "Kitty" ;;
        alacritty*)   echo "Alacritty" ;;
        warp*)        echo "Warp" ;;
        *)
          # Check LC_TERMINAL for some terminals
          if [[ -n "$lc_terminal" ]]; then
            echo "$lc_terminal"
          elif [[ -n "$term_program" ]]; then
            echo "$term_program"
          elif [[ -n "$term" ]]; then
            echo "$term"
          else
            echo "Unknown"
          fi
          ;;
      esac
      ;;
  esac
}

# Detect color support level
# Returns: "none", "16", "256", or "truecolor"
_ralph_detect_colors() {
  local colorterm="${COLORTERM:-}"
  local term="${TERM:-}"

  # Check for truecolor/24-bit support
  if [[ "$colorterm" == "truecolor" || "$colorterm" == "24bit" ]]; then
    echo "truecolor"
    return
  fi

  # Check TERM for 256-color variants
  if [[ "$term" == *"-256color"* || "$term" == *"256"* ]]; then
    echo "256"
    return
  fi

  # Use tput if available
  if command -v tput &>/dev/null; then
    local colors=$(tput colors 2>/dev/null || echo "0")
    if (( colors >= 16777216 )); then
      echo "truecolor"
    elif (( colors >= 256 )); then
      echo "256"
    elif (( colors >= 16 )); then
      echo "16"
    else
      echo "none"
    fi
    return
  fi

  # Default based on TERM
  if [[ -n "$term" && "$term" != "dumb" ]]; then
    echo "16"
  else
    echo "none"
  fi
}

# Detect Unicode and emoji support
# Returns: "none", "basic", or "full"
_ralph_detect_unicode() {
  local lang="${LANG:-}"
  local lc_all="${LC_ALL:-}"

  # Check for UTF-8 locale
  if [[ "$lang" == *"UTF-8"* || "$lang" == *"utf8"* ||
        "$lc_all" == *"UTF-8"* || "$lc_all" == *"utf8"* ]]; then
    # UTF-8 locale detected, check if terminal supports emoji
    # We'll test this in the actual capability test
    echo "full"
  elif [[ -n "$lang" || -n "$lc_all" ]]; then
    echo "basic"
  else
    echo "none"
  fi
}

# Detect Kitty graphics protocol support
# Returns: "yes" or "no"
_ralph_detect_kitty() {
  local term="${TERM:-}"
  local kitty_window_id="${KITTY_WINDOW_ID:-}"

  # Direct Kitty detection
  if [[ "$term" == "xterm-kitty" || -n "$kitty_window_id" ]]; then
    echo "yes"
    return
  fi

  # Some terminals that support Kitty graphics
  local term_program="${TERM_PROGRAM:-}"
  case "$term_program" in
    WezTerm|ghostty)
      echo "yes"
      return
      ;;
  esac

  echo "no"
}

# Test ANSI cursor positioning
# Returns: 0 on pass, 1 on fail
_ralph_test_cursor_positioning() {
  # Save cursor, move to position, restore cursor
  # If tput works, we assume cursor positioning works
  if command -v tput &>/dev/null; then
    local cup_test=$(tput cup 0 0 2>/dev/null)
    if [[ -n "$cup_test" || $? -eq 0 ]]; then
      return 0
    fi
  fi

  # Fallback: test ANSI escape sequence directly
  # \033[H = cursor home, \033[s = save, \033[u = restore
  if [[ -t 1 ]]; then
    return 0  # Assume TTY supports ANSI
  fi

  return 1
}

# Test box drawing character rendering
# Returns: 0 on pass, 1 on fail (cannot truly test, just checks UTF-8)
_ralph_test_box_drawing() {
  local lang="${LANG:-}"
  local lc_all="${LC_ALL:-}"

  # Box drawing requires UTF-8
  if [[ "$lang" == *"UTF-8"* || "$lang" == *"utf8"* ||
        "$lc_all" == *"UTF-8"* || "$lc_all" == *"utf8"* ]]; then
    return 0
  fi

  return 1
}

# Benchmark live update speed
# Returns: render time in milliseconds
_ralph_test_render_speed() {
  local iterations="${1:-10}"
  local start_ms end_ms duration

  # Get start time in nanoseconds (if available) or seconds
  if command -v gdate &>/dev/null; then
    start_ms=$(gdate +%s%3N)
  elif [[ "$(uname)" == "Darwin" ]]; then
    # macOS date doesn't support %N, use perl
    start_ms=$(perl -MTime::HiRes=time -e 'printf "%d", time * 1000' 2>/dev/null || date +%s)
  else
    start_ms=$(date +%s%3N 2>/dev/null || date +%s)
  fi

  # Simulate rendering with cursor positioning and output
  for ((i=0; i<iterations; i++)); do
    printf '\033[H'  # Cursor home
    printf '\033[2J' # Clear screen
    printf '═══════════════════════════════════════════════════════════════════\n'
    printf '│ Progress: [████████░░] 80%%                                       │\n'
    printf '═══════════════════════════════════════════════════════════════════\n'
    printf '\033[H'  # Reset
  done > /dev/null 2>&1

  # Get end time
  if command -v gdate &>/dev/null; then
    end_ms=$(gdate +%s%3N)
  elif [[ "$(uname)" == "Darwin" ]]; then
    end_ms=$(perl -MTime::HiRes=time -e 'printf "%d", time * 1000' 2>/dev/null || date +%s)
  else
    end_ms=$(date +%s%3N 2>/dev/null || date +%s)
  fi

  # Calculate duration per render
  duration=$(( (end_ms - start_ms) / iterations ))
  echo "$duration"
}

# Test emoji width calculation accuracy
# Returns: 0 if emojis are 2 chars wide (expected), 1 otherwise
_ralph_test_emoji_width() {
  # Simple test: check if terminal handles emoji width
  # This is really a visual test - we can only check locale
  local lang="${LANG:-}"
  local lc_all="${LC_ALL:-}"

  # UTF-8 locale suggests emoji support
  if [[ "$lang" == *"UTF-8"* || "$lang" == *"utf8"* ||
        "$lc_all" == *"UTF-8"* || "$lc_all" == *"utf8"* ]]; then
    return 0
  fi

  return 1
}

# Get terminal known issues and recommendations
# Args: terminal name
# Returns: warning message if known issues, empty if OK
_ralph_get_terminal_issues() {
  local terminal="$1"

  case "$terminal" in
    "Terminal.app")
      echo "Terminal.app has limited Unicode rendering and no truecolor support. Consider iTerm2 or Ghostty."
      ;;
    "Unknown")
      echo "Could not detect terminal. Some UI features may not work correctly."
      ;;
    "tmux")
      echo "Running inside tmux. Ensure TERM=xterm-256color or tmux-256color for best results."
      ;;
    "VS Code")
      echo "VS Code terminal works but may have cursor positioning issues in some configurations."
      ;;
    *)
      echo ""  # No known issues
      ;;
  esac
}

# Get terminal recommendation based on current terminal
_ralph_get_terminal_recommendation() {
  local terminal="$1"
  local color_support="$2"
  local unicode_support="$3"

  # Best terminals for Ralph
  local best_terminals="For best Ralph experience: iTerm2, Ghostty, Kitty, or WezTerm"

  case "$terminal" in
    "iTerm2"|"Ghostty"|"Kitty"|"WezTerm"|"Alacritty")
      echo ""  # Already using a great terminal
      ;;
    "Terminal.app")
      echo "$best_terminals"
      ;;
    *)
      if [[ "$color_support" == "none" || "$unicode_support" == "none" ]]; then
        echo "$best_terminals"
      fi
      ;;
  esac
}

# Save terminal profile to config
# Args: profile JSON object
_ralph_save_terminal_profile() {
  local profile_json="$1"
  local config_file="${RALPH_CONFIG_FILE:-$HOME/.config/ralphtools/config.json}"

  if [[ ! -f "$config_file" ]]; then
    echo "Config file not found: $config_file"
    return 1
  fi

  # Update config with terminal profile
  local tmp_config=$(mktemp)
  if jq --argjson profile "$profile_json" '.terminalProfile = $profile' "$config_file" > "$tmp_config" 2>/dev/null; then
    mv "$tmp_config" "$config_file"
    return 0
  else
    rm -f "$tmp_config"
    return 1
  fi
}

# Check if this is first Ralph startup (no terminal profile in config)
_ralph_is_first_terminal_check() {
  local config_file="${RALPH_CONFIG_FILE:-$HOME/.config/ralphtools/config.json}"

  if [[ ! -f "$config_file" ]]; then
    return 0  # No config = first run
  fi

  local has_profile=$(jq -r '.terminalProfile // empty' "$config_file" 2>/dev/null)
  if [[ -z "$has_profile" ]]; then
    return 0  # No profile = first run
  fi

  return 1  # Has profile
}

# Main terminal check command
ralph-terminal-check() {
  local CYAN='\033[0;36m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[1;33m'
  local RED='\033[0;31m'
  local GRAY='\033[0;90m'
  local BOLD='\033[1m'
  local NC='\033[0m'

  local save_profile=false
  local quiet=false

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --save)   save_profile=true; shift ;;
      --quiet)  quiet=true; shift ;;
      *)        shift ;;
    esac
  done

  if ! $quiet; then
    echo ""
    echo "${CYAN}${BOLD}═══ Ralph Terminal Check ═══${NC}"
    echo ""
  fi

  # === DETECTION ===
  local terminal=$(_ralph_detect_terminal)
  local colors=$(_ralph_detect_colors)
  local unicode=$(_ralph_detect_unicode)
  local kitty=$(_ralph_detect_kitty)

  if ! $quiet; then
    echo "${BOLD}Terminal Detection:${NC}"
    echo "  Terminal:    ${GREEN}$terminal${NC}"
    echo "  Colors:      ${GREEN}$colors${NC}"
    echo "  Unicode:     ${GREEN}$unicode${NC}"
    echo "  Kitty GFX:   ${GREEN}$kitty${NC}"
    echo ""
  fi

  # === CAPABILITY TESTS ===
  local cursor_pass=0 box_pass=0 emoji_pass=0
  local render_speed="N/A"

  _ralph_test_cursor_positioning && cursor_pass=1
  _ralph_test_box_drawing && box_pass=1
  _ralph_test_emoji_width && emoji_pass=1

  # Only run render test if terminal is TTY
  if [[ -t 1 ]]; then
    render_speed=$(_ralph_test_render_speed 5)
  fi

  if ! $quiet; then
    echo "${BOLD}Capability Tests:${NC}"
    if [[ $cursor_pass -eq 1 ]]; then
      echo "  Cursor positioning:  ${GREEN}✓ PASS${NC}"
    else
      echo "  Cursor positioning:  ${RED}✗ FAIL${NC}"
    fi

    if [[ $box_pass -eq 1 ]]; then
      echo "  Box drawing chars:   ${GREEN}✓ PASS${NC}"
    else
      echo "  Box drawing chars:   ${RED}✗ FAIL${NC}"
    fi

    if [[ $emoji_pass -eq 1 ]]; then
      echo "  Emoji width:         ${GREEN}✓ PASS${NC}"
    else
      echo "  Emoji width:         ${RED}✗ FAIL${NC}"
    fi

    if [[ "$render_speed" != "N/A" ]]; then
      if [[ $render_speed -lt 10 ]]; then
        echo "  Render speed:        ${GREEN}✓ ${render_speed}ms/frame${NC}"
      elif [[ $render_speed -lt 50 ]]; then
        echo "  Render speed:        ${YELLOW}○ ${render_speed}ms/frame${NC}"
      else
        echo "  Render speed:        ${RED}✗ ${render_speed}ms/frame (slow)${NC}"
      fi
    else
      echo "  Render speed:        ${GRAY}○ Skipped (not a TTY)${NC}"
    fi
    echo ""
  fi

  # === RECOMMENDATIONS ===
  local issues=$(_ralph_get_terminal_issues "$terminal")
  local recommendation=$(_ralph_get_terminal_recommendation "$terminal" "$colors" "$unicode")

  if ! $quiet && [[ -n "$issues" ]]; then
    echo "${YELLOW}${BOLD}⚠ Known Issues:${NC}"
    echo "  $issues"
    echo ""
  fi

  if ! $quiet && [[ -n "$recommendation" ]]; then
    echo "${CYAN}${BOLD}💡 Recommendation:${NC}"
    echo "  $recommendation"
    echo ""
  fi

  # Calculate overall score
  local tests_passed=$((cursor_pass + box_pass + emoji_pass))
  local total_tests=3

  # Add render speed to score if available
  if [[ "$render_speed" != "N/A" ]]; then
    total_tests=4
    if [[ $render_speed -lt 50 ]]; then
      tests_passed=$((tests_passed + 1))
    fi
  fi

  if ! $quiet; then
    echo "${BOLD}Overall:${NC} ${tests_passed}/${total_tests} tests passed"

    # UI compatibility summary
    echo ""
    if [[ "$colors" == "truecolor" || "$colors" == "256" ]] &&
       [[ "$unicode" == "full" ]] &&
       [[ $cursor_pass -eq 1 ]]; then
      echo "${GREEN}✓ Full Ink UI support${NC}"
    elif [[ $cursor_pass -eq 1 ]] && [[ "$colors" != "none" ]]; then
      echo "${YELLOW}○ Gum/ANSI UI supported, Ink UI may have issues${NC}"
    else
      echo "${RED}✗ Limited UI support - basic text mode recommended${NC}"
    fi
    echo ""
  fi

  # === SAVE TO CONFIG ===
  if $save_profile; then
    local profile_json=$(cat <<EOF
{
  "terminal": "$terminal",
  "colors": "$colors",
  "unicode": "$unicode",
  "kittyGraphics": "$kitty",
  "cursorPositioning": $([[ $cursor_pass -eq 1 ]] && echo "true" || echo "false"),
  "boxDrawing": $([[ $box_pass -eq 1 ]] && echo "true" || echo "false"),
  "emojiWidth": $([[ $emoji_pass -eq 1 ]] && echo "true" || echo "false"),
  "renderSpeed": $([[ "$render_speed" != "N/A" ]] && echo "$render_speed" || echo "null"),
  "checkedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)
    if _ralph_save_terminal_profile "$profile_json"; then
      if ! $quiet; then
        echo "${GREEN}✓ Terminal profile saved to config${NC}"
        echo ""
      fi
    else
      if ! $quiet; then
        echo "${YELLOW}⚠ Could not save terminal profile${NC}"
        echo ""
      fi
    fi
  fi

  # Return exit code based on critical tests
  if [[ $cursor_pass -eq 1 ]] && [[ "$colors" != "none" ]]; then
    return 0
  else
    return 1
  fi
}

# Check terminal on first Ralph startup (called from ralph main function)
_ralph_first_startup_terminal_check() {
  # Only run if this is first time (no terminal profile saved)
  if _ralph_is_first_terminal_check; then
    echo ""
    echo "${RALPH_COLOR_GRAY:-\033[0;90m}First startup - checking terminal capabilities...${RALPH_COLOR_RESET:-\033[0m}"
    ralph-terminal-check --save --quiet

    # If there are issues, show a brief message
    local terminal=$(_ralph_detect_terminal)
    local issues=$(_ralph_get_terminal_issues "$terminal")
    if [[ -n "$issues" ]]; then
      echo "${RALPH_COLOR_YELLOW:-\033[1;33m}⚠ $issues${RALPH_COLOR_RESET:-\033[0m}"
      echo "${RALPH_COLOR_GRAY:-\033[0;90m}Run 'ralph-terminal-check' for details${RALPH_COLOR_RESET:-\033[0m}"
    fi
    echo ""
  fi
}
