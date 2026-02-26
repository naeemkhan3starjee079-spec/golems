#!/bin/zsh
# ═══════════════════════════════════════════════════════════════════
# RALPH UI - Minimal color constants and helpers
# ═══════════════════════════════════════════════════════════════════
# Part of the Ralph modular system. Sourced by ralph.zsh
# The main UI/dashboard has moved to TypeScript (ralph-ui/).
# This file keeps only color constants and basic helpers needed by
# other lib/ modules.
# ═══════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════
# GLOBAL COLOR CONSTANTS (ANSI escape codes)
# ═══════════════════════════════════════════════════════════════════
RALPH_COLOR_RESET='\033[0m'
RALPH_COLOR_BOLD='\033[1m'
RALPH_COLOR_RED='\033[0;31m'
RALPH_COLOR_GREEN='\033[0;32m'
RALPH_COLOR_YELLOW='\033[1;33m'
RALPH_COLOR_BLUE='\033[0;34m'
RALPH_COLOR_MAGENTA='\033[0;35m'
RALPH_COLOR_CYAN='\033[0;36m'
RALPH_COLOR_GOLD='\033[0;33m'
RALPH_COLOR_PURPLE='\033[0;35m'
RALPH_COLOR_GRAY='\033[0;90m'

# ═══════════════════════════════════════════════════════════════════
# SEMANTIC COLOR HELPERS
# ═══════════════════════════════════════════════════════════════════

# Color a story ID by its type prefix
_ralph_color_story_id() {
  local story_id="$1"
  local prefix="${story_id%%-*}"
  local color=""

  case "$prefix" in
    US)    color="$RALPH_COLOR_BLUE" ;;
    V)     color="$RALPH_COLOR_PURPLE" ;;
    TEST)  color="$RALPH_COLOR_YELLOW" ;;
    BUG)   color="$RALPH_COLOR_RED" ;;
    AUDIT) color="$RALPH_COLOR_MAGENTA" ;;
    MP)    color="$RALPH_COLOR_CYAN" ;;
    *)     color="$RALPH_COLOR_RESET" ;;
  esac

  echo -e "${color}${story_id}${RALPH_COLOR_RESET}"
}

# Color a model name semantically
_ralph_color_model() {
  local model="$1"
  local color=""

  case "$model" in
    opus)   color="$RALPH_COLOR_GOLD" ;;
    sonnet) color="$RALPH_COLOR_CYAN" ;;
    haiku)  color="$RALPH_COLOR_GREEN" ;;
    *)      color="$RALPH_COLOR_RESET" ;;
  esac

  echo -e "${color}${model}${RALPH_COLOR_RESET}"
}

# Color a cost value based on thresholds
_ralph_color_cost() {
  local cost_str="$1"
  local cost_val="${cost_str#\$}"
  local color=""

  if (( $(echo "$cost_val < 0.50" | bc -l 2>/dev/null || echo "0") )); then
    color="$RALPH_COLOR_GREEN"
  elif (( $(echo "$cost_val < 2.00" | bc -l 2>/dev/null || echo "0") )); then
    color="$RALPH_COLOR_YELLOW"
  else
    color="$RALPH_COLOR_RED"
  fi

  echo -e "${color}\$${cost_val}${RALPH_COLOR_RESET}"
}

# Semantic message helpers
_ralph_success() { echo -e "${RALPH_COLOR_GREEN}$1${RALPH_COLOR_RESET}"; }
_ralph_error() { echo -e "${RALPH_COLOR_RED}$1${RALPH_COLOR_RESET}"; }
_ralph_warning() { echo -e "${RALPH_COLOR_YELLOW}$1${RALPH_COLOR_RESET}"; }
_ralph_bold() { echo -e "${RALPH_COLOR_BOLD}$1${RALPH_COLOR_RESET}"; }

# ═══════════════════════════════════════════════════════════════════
# DISPLAY WIDTH CALCULATION
# ═══════════════════════════════════════════════════════════════════

# Calculate display width of a string (handles emojis and ANSI codes)
_ralph_display_width() {
  local str="$1"
  local clean_str=$(echo "$str" | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*[A-Za-z]//g')
  clean_str=$(echo "$clean_str" | sed 's/️//g')
  local width=${#clean_str}

  # Count known emojis (width 2)
  local emoji_count=0
  for emoji in 🚀 📋 🆕 💰 ⏱ 🔄 📚 💵 🏁 🎯 ✨ 🆘 🔴 🟢 🟡 ⚡ ❌ ✅ 🛑 🔥 🔕 🔔 📂 📱 📊 📖 🧠; do
    emoji_count=$((emoji_count + $(echo "$clean_str" | grep -o "$emoji" | wc -l)))
  done
  width=$((width + emoji_count))

  echo "$width"
}

# ═══════════════════════════════════════════════════════════════════
# ELAPSED TIME HELPERS
# ═══════════════════════════════════════════════════════════════════

# Format elapsed time from seconds to human-readable
_ralph_format_elapsed() {
  setopt localoptions noxtrace
  local seconds="$1"
  local hours=$((seconds / 3600))
  local mins=$(((seconds % 3600) / 60))
  local secs=$((seconds % 60))

  if [[ $hours -gt 0 ]]; then
    printf "%dh %dm %ds" $hours $mins $secs
  elif [[ $mins -gt 0 ]]; then
    printf "%dm %ds" $mins $secs
  else
    printf "%ds" $secs
  fi
}
