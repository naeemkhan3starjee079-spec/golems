#!/usr/bin/env zsh
# ═══════════════════════════════════════════════════════════════════
# RALPH-MODELS.ZSH - Model routing, cost tracking, and notifications
# ═══════════════════════════════════════════════════════════════════
# Part of the Ralph modular architecture.
# Contains: Smart model routing, cost tracking, ntfy notifications.
#
# Dependencies: Requires RALPH_CONFIG_DIR, RALPH_CONFIG_FILE to be set.
# ═══════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════
# SMART MODEL ROUTING
# ═══════════════════════════════════════════════════════════════════

# Load config from config.json
_ralph_load_config() {
  if [[ -f "$RALPH_CONFIG_FILE" ]]; then
    # Export config values as environment variables for easy access
    # Runtime: bash or bun (default: bun)
    RALPH_RUNTIME=$(jq -r '.runtime // "bun"' "$RALPH_CONFIG_FILE" 2>/dev/null)

    RALPH_MODEL_STRATEGY=$(jq -r '.modelStrategy // "single"' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_DEFAULT_MODEL_CFG=$(jq -r '.defaultModel // "opus"' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_UNKNOWN_TASK_MODEL=$(jq -r '.unknownTaskType // "sonnet"' "$RALPH_CONFIG_FILE" 2>/dev/null)

    # Load model mappings for smart routing
    RALPH_MODEL_US=$(jq -r '.models.US // "sonnet"' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_MODEL_V=$(jq -r '.models.V // "haiku"' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_MODEL_TEST=$(jq -r '.models.TEST // "haiku"' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_MODEL_BUG=$(jq -r '.models.BUG // "sonnet"' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_MODEL_AUDIT=$(jq -r '.models.AUDIT // "opus"' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_MODEL_MP=$(jq -r '.models.MP // "opus"' "$RALPH_CONFIG_FILE" 2>/dev/null)

    # Load notification settings
    local notify_enabled=$(jq -r '.notifications.enabled // false' "$RALPH_CONFIG_FILE" 2>/dev/null)
    if [[ "$notify_enabled" == "true" ]]; then
      local config_topic=$(jq -r '.notifications.ntfyTopic // ""' "$RALPH_CONFIG_FILE" 2>/dev/null)
      # Empty string or "auto" means use per-project topics (don't set RALPH_NTFY_TOPIC)
      # Any other value is an explicit override
      if [[ -n "$config_topic" && "$config_topic" != "auto" && "$config_topic" != "null" ]]; then
        RALPH_NTFY_TOPIC="$config_topic"
      fi
    fi

    # Load defaults
    local max_iter=$(jq -r '.defaults.maxIterations // empty' "$RALPH_CONFIG_FILE" 2>/dev/null)
    local sleep_sec=$(jq -r '.defaults.sleepSeconds // empty' "$RALPH_CONFIG_FILE" 2>/dev/null)
    [[ -n "$max_iter" && "$max_iter" != "null" ]] && RALPH_MAX_ITERATIONS="$max_iter"
    [[ -n "$sleep_sec" && "$sleep_sec" != "null" ]] && RALPH_SLEEP_SECONDS="$sleep_sec"

    # Load parallel verification settings
    RALPH_PARALLEL_VERIFICATION=$(jq -r '.parallelVerification // false' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_PARALLEL_AGENTS=$(jq -r '.parallelAgents // 2' "$RALPH_CONFIG_FILE" 2>/dev/null)

    # Load error handling settings (with defaults for backwards compatibility)
    RALPH_MAX_RETRIES=$(jq -r '.errorHandling.maxRetries // 5' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_NO_MSG_MAX_RETRIES=$(jq -r '.errorHandling.noMessagesMaxRetries // 3' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_GENERAL_COOLDOWN=$(jq -r '.errorHandling.generalCooldownSeconds // 15' "$RALPH_CONFIG_FILE" 2>/dev/null)
    RALPH_NO_MSG_COOLDOWN=$(jq -r '.errorHandling.noMessagesCooldownSeconds // 30' "$RALPH_CONFIG_FILE" 2>/dev/null)

    # Load color scheme setting
    RALPH_COLOR_SCHEME=$(jq -r '.colorScheme // "default"' "$RALPH_CONFIG_FILE" 2>/dev/null)

    # Check if custom scheme is provided
    local custom_scheme=$(jq -r '.customColorScheme // empty' "$RALPH_CONFIG_FILE" 2>/dev/null)
    if [[ -n "$custom_scheme" && "$custom_scheme" != "null" ]]; then
      COLOR_SCHEMES[custom]="$custom_scheme"
      RALPH_COLOR_SCHEME="custom"
    fi

    # Load context loading settings
    local contexts_dir=$(jq -r '.contexts.directory // empty' "$RALPH_CONFIG_FILE" 2>/dev/null)
    [[ -n "$contexts_dir" && "$contexts_dir" != "null" ]] && RALPH_CONTEXTS_DIR="$contexts_dir"

    # Load additional contexts to append (space-separated list)
    local additional_contexts=$(jq -r '.contexts.additional // [] | join(" ")' "$RALPH_CONFIG_FILE" 2>/dev/null)
    [[ -n "$additional_contexts" && "$additional_contexts" != "null" ]] && RALPH_ADDITIONAL_CONTEXTS="$additional_contexts"

    return 0
  fi
  return 1
}

# Get model for a story based on smart routing
# Usage: _ralph_get_model_for_story "US-001" [cli_primary] [cli_verify] [prd_json_dir]
# Returns: model name (haiku, sonnet, opus, gemini, kiro)
_ralph_get_model_for_story() {
  local story_id="$1"
  local cli_primary="$2"   # CLI override for primary model
  local cli_verify="$3"    # CLI override for verify model
  local prd_json_dir="$4"  # Optional: prd-json dir for story-level override

  # Extract prefix (everything before the dash and number)
  local prefix="${story_id%%-*}"

  # Story JSON "model" field wins first (for sensitive stories like 1Password)
  if [[ -n "$prd_json_dir" && -f "$prd_json_dir/stories/${story_id}.json" ]]; then
    local story_model=$(jq -r '.model // empty' "$prd_json_dir/stories/${story_id}.json" 2>/dev/null)
    if [[ -n "$story_model" ]]; then
      echo "$story_model"
      return
    fi
  fi

  # CLI flags win if specified
  if [[ -n "$cli_primary" || -n "$cli_verify" ]]; then
    case "$prefix" in
      V)
        echo "${cli_verify:-${cli_primary:-haiku}}"
        ;;
      *)
        echo "${cli_primary:-opus}"
        ;;
    esac
    return
  fi

  # No CLI override - use config-based routing
  if [[ "$RALPH_MODEL_STRATEGY" == "smart" ]]; then
    case "$prefix" in
      US)
        echo "${RALPH_MODEL_US:-sonnet}"
        ;;
      V)
        echo "${RALPH_MODEL_V:-haiku}"
        ;;
      TEST)
        echo "${RALPH_MODEL_TEST:-haiku}"
        ;;
      BUG)
        echo "${RALPH_MODEL_BUG:-sonnet}"
        ;;
      AUDIT)
        echo "${RALPH_MODEL_AUDIT:-opus}"
        ;;
      MP)
        echo "${RALPH_MODEL_MP:-opus}"
        ;;
      *)
        # Unknown prefix - use fallback
        echo "${RALPH_UNKNOWN_TASK_MODEL:-sonnet}"
        ;;
    esac
  else
    # Single model strategy - use default for everything
    echo "${RALPH_DEFAULT_MODEL_CFG:-opus}"
  fi
}

# Show current routing config
_ralph_show_routing() {
  local strategy="${RALPH_MODEL_STRATEGY:-single}"

  if [[ "$strategy" == "smart" ]]; then
    echo "Smart Model Routing:"
    echo -e "   $(_ralph_color_story_id "US")   -> $(_ralph_color_model "${RALPH_MODEL_US:-sonnet}")"
    echo -e "   $(_ralph_color_story_id "V")    -> $(_ralph_color_model "${RALPH_MODEL_V:-haiku}")"
    echo -e "   $(_ralph_color_story_id "TEST") -> $(_ralph_color_model "${RALPH_MODEL_TEST:-haiku}")"
    echo -e "   $(_ralph_color_story_id "BUG")  -> $(_ralph_color_model "${RALPH_MODEL_BUG:-sonnet}")"
    echo -e "   $(_ralph_color_story_id "AUDIT")-> $(_ralph_color_model "${RALPH_MODEL_AUDIT:-opus}")"
    echo -e "   $(_ralph_color_story_id "MP")   -> $(_ralph_color_model "${RALPH_MODEL_MP:-opus}")"
    echo -e "   ???  -> $(_ralph_color_model "${RALPH_UNKNOWN_TASK_MODEL:-sonnet}")"
  else
    echo -e "Single Model: $(_ralph_color_model "${RALPH_DEFAULT_MODEL_CFG:-opus}")"
  fi
}

# ═══════════════════════════════════════════════════════════════════
# COST TRACKING
# ═══════════════════════════════════════════════════════════════════

RALPH_COSTS_FILE="${RALPH_CONFIG_DIR}/costs.json"

# Initialize costs.json if it doesn't exist
_ralph_init_costs() {
  if [[ ! -f "$RALPH_COSTS_FILE" ]]; then
    cat > "$RALPH_COSTS_FILE" << 'EOF'
{
  "runs": [],
  "totals": {
    "stories": 0,
    "estimatedCost": 0,
    "byModel": {}
  },
  "avgTokensObserved": {
    "US": { "input": 0, "output": 0, "samples": 0 },
    "V": { "input": 0, "output": 0, "samples": 0 },
    "TEST": { "input": 0, "output": 0, "samples": 0 },
    "BUG": { "input": 0, "output": 0, "samples": 0 },
    "AUDIT": { "input": 0, "output": 0, "samples": 0 }
  }
}
EOF
  fi
}

# Get token usage from Claude's JSONL for a specific session
# Usage: _ralph_get_session_tokens "session-uuid"
# Returns: "input_tokens output_tokens cache_create cache_read" (space-separated)
_ralph_get_session_tokens() {
  local session_id="$1"
  local project_path="${2:-$(pwd)}"

  # Convert project path to Claude's project directory format
  # e.g., /Users/foo/project -> -Users-foo-project
  local claude_project=$(echo "$project_path" | tr '/' '-')
  local jsonl_dir="$HOME/.claude/projects/$claude_project"

  if [[ ! -d "$jsonl_dir" ]]; then
    echo "0 0 0 0"
    return
  fi

  # Stream through JSONL files, filter by session, sum tokens
  cat "$jsonl_dir"/*.jsonl 2>/dev/null | \
    grep "$session_id" | grep '"usage"' | \
    jq -r '.message.usage | "\(.input_tokens // 0) \(.output_tokens // 0) \(.cache_creation_input_tokens // 0) \(.cache_read_input_tokens // 0)"' 2>/dev/null | \
    awk '{input+=$1; output+=$2; cache_create+=$3; cache_read+=$4} END {print input, output, cache_create, cache_read}'
}

# Log a story completion with cost data
# Usage: _ralph_log_cost "US-001" "sonnet" "180" "success" [session_id]
_ralph_log_cost() {
  local story_id="$1"
  local model="$2"
  local duration_seconds="$3"
  local run_status="$4"  # success, blocked, error
  local session_id="$5"  # Optional: Claude session UUID for real token tracking

  # Skip cost logging for Kiro - it uses credits, not trackable tokens
  if [[ "$model" == "kiro" ]]; then
    echo "  Cost: (Kiro uses credits - see kiro.dev dashboard)"
    return
  fi

  _ralph_init_costs

  local prefix="${story_id%%-*}"
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Get pricing from config (or use defaults) - per million tokens
  local input_price=3   # Default sonnet input price per M tokens
  local output_price=15 # Default sonnet output price per M tokens
  local cache_create_price=3.75  # Cache creation price (Sonnet)
  local cache_read_price=0.30    # Cache read price (Sonnet)

  case "$model" in
    haiku)   input_price=1;   output_price=5; cache_create_price=1.25; cache_read_price=0.10 ;;
    sonnet)  input_price=3;   output_price=15; cache_create_price=3.75; cache_read_price=0.30 ;;
    opus)    input_price=15;  output_price=75; cache_create_price=18.75; cache_read_price=1.50 ;;
    gemini*) input_price=0.075; output_price=0.30; cache_create_price=0; cache_read_price=0 ;;
    kiro)    input_price=0;   output_price=0; cache_create_price=0; cache_read_price=0 ;;  # Credit-based
  esac

  local input_tokens=0 output_tokens=0 cache_create=0 cache_read=0
  local token_source="estimated"

  # Try to get real tokens from session if session_id provided
  if [[ -n "$session_id" ]]; then
    local token_data=$(_ralph_get_session_tokens "$session_id")
    input_tokens=$(echo "$token_data" | awk '{print $1}')
    output_tokens=$(echo "$token_data" | awk '{print $2}')
    cache_create=$(echo "$token_data" | awk '{print $3}')
    cache_read=$(echo "$token_data" | awk '{print $4}')

    if [[ "$input_tokens" -gt 0 ]] || [[ "$output_tokens" -gt 0 ]]; then
      token_source="actual"
    fi
  fi

  # Fall back to duration-based estimates if no real data
  if [[ "$token_source" == "estimated" ]]; then
    input_tokens=$((duration_seconds * 1000))   # ~1K input tokens/sec
    output_tokens=$((duration_seconds * 500))   # ~500 output tokens/sec
  fi

  # Calculate cost (tokens / 1M * price)
  local cost=$(echo "scale=4; \
    ($input_tokens * $input_price / 1000000) + \
    ($output_tokens * $output_price / 1000000) + \
    ($cache_create * $cache_create_price / 1000000) + \
    ($cache_read * $cache_read_price / 1000000)" | bc 2>/dev/null || echo "0")

  # Update costs.json
  local tmp_file=$(mktemp)
  jq --arg id "$story_id" \
     --arg model "$model" \
     --arg prefix "$prefix" \
     --arg ts "$timestamp" \
     --arg status "$run_status" \
     --arg src "$token_source" \
     --arg sid "${session_id:-}" \
     --argjson duration "$duration_seconds" \
     --argjson input "$input_tokens" \
     --argjson output "$output_tokens" \
     --argjson cache_c "$cache_create" \
     --argjson cache_r "$cache_read" \
     --argjson cost "${cost:-0}" \
     '.runs += [{
       "storyId": $id,
       "model": $model,
       "prefix": $prefix,
       "timestamp": $ts,
       "status": $status,
       "durationSeconds": $duration,
       "tokens": { "input": $input, "output": $output, "cacheCreate": $cache_c, "cacheRead": $cache_r },
       "tokenSource": $src,
       "sessionId": (if $sid == "" then null else $sid end),
       "cost": ($cost | tonumber)
     }] |
     .totals.stories += 1 |
     .totals.cost += ($cost | tonumber) |
     .totals.byModel[$model] = ((.totals.byModel[$model] // 0) + 1) |
     # Update rolling averages only for actual token data
     if $src == "actual" then
       .avgTokensObserved[$prefix] = (
         (.avgTokensObserved[$prefix] // {"input": 0, "output": 0, "samples": 0}) |
         {
           "input": (((.input * .samples) + $input) / (.samples + 1)),
           "output": (((.output * .samples) + $output) / (.samples + 1)),
           "samples": (.samples + 1)
         }
       )
     else . end' \
     "$RALPH_COSTS_FILE" > "$tmp_file" 2>/dev/null && mv "$tmp_file" "$RALPH_COSTS_FILE"

  # Print iteration cost summary
  if [[ "$token_source" == "actual" ]]; then
    echo "  Cost: \$$(printf '%.4f' $cost) (${input_tokens} in ${output_tokens} out ${cache_read} cache)"
  fi
}

# Show cost summary
ralph-costs() {
  local CYAN='\033[0;36m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[1;33m'
  local BOLD='\033[1m'
  local GRAY='\033[0;90m'
  local NC='\033[0m'

  _ralph_init_costs

  echo ""
  echo "${CYAN}${BOLD}Ralph Cost Tracking${NC}"
  echo ""

  if [[ ! -f "$RALPH_COSTS_FILE" ]]; then
    echo "${YELLOW}No cost data yet. Run some stories first.${NC}"
    return
  fi

  local total_stories=$(jq -r '.totals.stories // 0' "$RALPH_COSTS_FILE")
  local total_cost=$(jq -r '.totals.cost // .totals.estimatedCost // 0' "$RALPH_COSTS_FILE")
  local actual_count=$(jq -r '[.runs[] | select(.tokenSource == "actual")] | length' "$RALPH_COSTS_FILE" 2>/dev/null || echo "0")

  echo "${BOLD}Total Stories:${NC} $total_stories"
  local formatted_cost=$(printf '%.2f' $total_cost)
  echo -e "${BOLD}Total Cost:${NC} $(_ralph_color_cost "$formatted_cost")"
  echo "${GRAY}($actual_count with actual token data, rest estimated)${NC}"
  echo ""

  echo "${CYAN}By Model:${NC}"
  jq -r '.totals.byModel | to_entries[] | "   \(.key): \(.value) stories"' "$RALPH_COSTS_FILE" 2>/dev/null

  echo ""
  echo "${CYAN}Recent Runs (last 10):${NC}"
  jq -r '.runs | .[-10:] | reverse | .[] |
    "   \(.timestamp | split("T")[0]) \(.storyId) [\(.model)] $\(.cost // .estimatedCost | . * 100 | floor / 100) \(if .tokenSource == "actual" then "ok" else "~" end)"' \
    "$RALPH_COSTS_FILE" 2>/dev/null

  echo ""
  echo "${GRAY}ok = actual tokens, ~ = estimated${NC}"
  echo "${GRAY}Data: $RALPH_COSTS_FILE${NC}"
  echo "${GRAY}Reset: rm $RALPH_COSTS_FILE${NC}"
}

# ═══════════════════════════════════════════════════════════════════
# NTFY NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════

# Truncate text at word boundary with ellipsis
# Usage: _ralph_truncate_word_boundary "text" max_length
# Returns truncated text with ... if longer than max_length
_ralph_truncate_word_boundary() {
  setopt localoptions noxtrace
  local text="$1"
  local max_len="${2:-40}"

  # If text fits, return as-is
  [[ ${#text} -le $max_len ]] && echo "$text" && return

  # Find last space within max_len (leaving room for ...)
  local truncate_at=$((max_len - 3))
  local last_space=$(echo "${text:0:$truncate_at}" | grep -o ' [^ ]*$' | head -1)

  if [[ -n "$last_space" ]]; then
    # Truncate at last word boundary
    local space_pos=$((truncate_at - ${#last_space} + 1))
    echo "${text:0:$space_pos}..."
  else
    # No space found, hard truncate at max_len - 3
    echo "${text:0:$truncate_at}..."
  fi
}

# Send compact ntfy notification with emoji labels
# Usage: _ralph_ntfy "topic" "event_type" "story_id" "model" "iteration" "remaining_stats" "cost"
# remaining_stats should be "stories criteria" space-separated (from _ralph_json_remaining_stats)
# Body format (3 lines):
#   Line 1: repo name (e.g. 'ralphtools')
#   Line 2: iteration story_id model (e.g. '5 TEST-004 haiku')
#   Line 3: stories criteria cost (e.g. '26 129 $0.28')
_ralph_ntfy() {
  setopt localoptions noxtrace  # Prevent debug output leaking to terminal
  local topic="$1"
  local event="$2"  # complete, blocked, error, iteration, max_iterations
  local story_id="${3:-}"
  local model="${4:-}"
  local iteration="${5:-}"
  local remaining="${6:-}"
  local cost="${7:-}"

  [[ -z "$topic" ]] && return 0

  local project_name=$(basename "$(pwd)")
  local title=""
  local priority="default"
  local tags=""

  case "$event" in
    complete)
      title="[Ralph] Complete"
      tags="white_check_mark,robot"
      priority="high"
      ;;
    blocked)
      title="[Ralph] Blocked"
      tags="stop_button,warning"
      priority="urgent"
      ;;
    error)
      title="[Ralph] Error"
      tags="x,fire"
      priority="urgent"
      ;;
    iteration)
      title="[Ralph] Progress"
      tags="arrows_counterclockwise"
      priority="low"
      ;;
    max_iterations)
      title="[Ralph] Limit Hit"
      tags="warning,hourglass"
      priority="high"
      ;;
    *)
      title="[Ralph]"
      tags="robot"
      ;;
  esac

  # Build compact 3-line body with emoji labels
  # Line 1: repo name (truncate long names at word boundary, max 40 chars)
  local body=$(_ralph_truncate_word_boundary "$project_name" 40)

  # Line 2: iteration + story + model (truncate story_id if very long)
  local line2=""
  [[ -n "$iteration" ]] && line2="$iteration"
  if [[ -n "$story_id" ]]; then
    # Truncate story_id at word boundary if > 25 chars
    local truncated_story=$(_ralph_truncate_word_boundary "$story_id" 25)
    line2+=" $truncated_story"
  fi
  [[ -n "$model" ]] && line2+=" $model"
  [[ -n "$line2" ]] && body+="\n$line2"

  # Line 3: stories left + criteria left + cost
  local line3=""
  if [[ -n "$remaining" ]]; then
    # remaining is "stories criteria" space-separated from _ralph_json_remaining_stats
    local stories=$(echo "$remaining" | awk '{print $1}')
    local criteria=$(echo "$remaining" | awk '{print $2}')
    [[ -n "$stories" ]] && line3+="$stories stories"
    [[ -n "$criteria" ]] && line3+=" $criteria criteria"
  fi
  [[ -n "$cost" ]] && line3+=" \$$cost"
  [[ -n "$line3" ]] && body+="\n$line3"

  # Send with ntfy headers for rich notification
  # Use Markdown format for better rendering in web/desktop apps
  curl -s \
    -H "Title: $title" \
    -H "Priority: $priority" \
    -H "Tags: $tags" \
    -H "Markdown: true" \
    -d "$(echo -e "$body")" \
    "ntfy.sh/${topic}" > /dev/null 2>&1
}
