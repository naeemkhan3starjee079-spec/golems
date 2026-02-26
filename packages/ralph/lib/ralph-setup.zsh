#!/usr/bin/env zsh
# ═══════════════════════════════════════════════════════════════════
# ralph-setup.zsh - Interactive setup wizard
# ═══════════════════════════════════════════════════════════════════
# Part of the Ralph modular architecture
# Provides: ralph-setup, _ralph_setup_* helper functions
#
# Dependencies:
#   - ralph-ui.zsh (colors, gum detection)
#   - ralph-registry.zsh (project registry management)
#   - ralph-secrets.zsh (1Password integration)
# ═══════════════════════════════════════════════════════════════════

# List of available MCPs for multi-select (fallback if registry not available)
RALPH_AVAILABLE_MCPS=("figma" "linear" "supabase" "browser-tools" "context7")

# User preferences file
RALPH_USER_PREFS_FILE="${RALPH_CONFIG_DIR:-$HOME/.config/ralphtools}/user-prefs.json"

# Get available MCPs from registry mcpDefinitions
function _ralph_get_available_mcps() {
  if [[ -f "$RALPH_REGISTRY_FILE" ]]; then
    local mcps=($(jq -r '.mcpDefinitions | keys[]' "$RALPH_REGISTRY_FILE" 2>/dev/null))
    if [[ ${#mcps[@]} -gt 0 ]]; then
      echo "${mcps[@]}"
      return 0
    fi
  fi
  # Fallback to hardcoded list
  echo "${RALPH_AVAILABLE_MCPS[@]}"
}

function ralph-setup() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local BLUE='\033[0;34m'
  local CYAN='\033[0;36m'
  local RED='\033[0;31m'
  local NC='\033[0m'
  local BOLD='\033[1m'

  # Parse flags
  local skip_context_migration=false
  local run_configure=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --skip-context-migration)
        skip_context_migration=true
        shift
        ;;
      --configure|-c)
        run_configure=true
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  # If --configure flag is passed, run the user preferences wizard directly
  if $run_configure; then
    _ralph_setup_user_preferences
    return $?
  fi

  # Check if 1Password CLI is available and environments are configured
  local has_1password=false
  local op_signed_in=false
  local op_env_configured=false
  if command -v op &>/dev/null; then
    has_1password=true
    if op account list &>/dev/null 2>&1; then
      op_signed_in=true
      # Check if environments are configured in current directory
      if _ralph_check_op_environments "."; then
        op_env_configured=true
      fi
    fi
  fi

  # Main menu loop
  while true; do
    echo ""
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│  🛠️  Ralph Setup Wizard                                      │"
    echo "├─────────────────────────────────────────────────────────────┤"
    if $has_1password; then
      if $op_signed_in; then
        if $op_env_configured; then
          echo "│  🔐 1Password: ${GREEN}Configured (environments ready)${NC}             │"
        else
          echo "│  🔐 1Password: ${YELLOW}CLI ready (environments not configured)${NC}    │"
        fi
      else
        echo "│  🔐 1Password: ${YELLOW}CLI installed, not signed in${NC}              │"
      fi
    else
      echo "│  🔐 1Password: ${YELLOW}Not installed${NC}                               │"
    fi
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""

    local choice=""

    if [[ $RALPH_HAS_GUM -eq 0 ]]; then
      # GUM mode - beautiful interactive menu
      choice=$(gum choose \
        "⚙️  Configure user preferences" \
        "📂 Add new project" \
        "🔧 Configure MCPs for a project" \
        "➕ Manage MCP definitions" \
        "🔐 Configure 1Password Environments" \
        "🔑 Migrate secrets to 1Password" \
        "🐰 Configure CodeRabbit" \
        "📓 Configure Obsidian MCP" \
        "📜 Migrate CLAUDE.md contexts" \
        "📋 View current configuration" \
        "🚪 Exit setup")
    else
      # Fallback mode - numbered menu
      echo "What would you like to do?"
      echo ""
      echo "  1) ⚙️  Configure user preferences"
      echo "  2) 📂 Add new project"
      echo "  3) 🔧 Configure MCPs for a project"
      echo "  4) ➕ Manage MCP definitions"
      echo "  5) 🔐 Configure 1Password Environments"
      echo "  6) 🔑 Migrate secrets to 1Password"
      echo "  7) 🐰 Configure CodeRabbit"
      echo "  8) 📓 Configure Obsidian MCP"
      echo "  9) 📜 Migrate CLAUDE.md contexts"
      echo " 10) 📋 View current configuration"
      echo " 11) 🚪 Exit setup"
      echo ""
      echo -n "Choose [1-11]: "
      read menu_choice
      case "$menu_choice" in
        1) choice="⚙️  Configure user preferences" ;;
        2) choice="📂 Add new project" ;;
        3) choice="🔧 Configure MCPs for a project" ;;
        4) choice="➕ Manage MCP definitions" ;;
        5) choice="🔐 Configure 1Password Environments" ;;
        6) choice="🔑 Migrate secrets to 1Password" ;;
        7) choice="🐰 Configure CodeRabbit" ;;
        8) choice="📓 Configure Obsidian MCP" ;;
        9) choice="📜 Migrate CLAUDE.md contexts" ;;
        10) choice="📋 View current configuration" ;;
        11|*) choice="🚪 Exit setup" ;;
      esac
    fi

    case "$choice" in
      *"Configure user preferences"*)
        _ralph_setup_user_preferences
        ;;
      *"Add new project"*)
        _ralph_setup_add_project
        ;;
      *"Configure MCPs"*)
        _ralph_setup_configure_mcps
        ;;
      *"Manage MCP definitions"*)
        _ralph_setup_manage_mcp_definitions
        ;;
      *"Configure 1Password Environments"*)
        _ralph_setup_configure_op_environments
        # Refresh state after configuration
        if _ralph_check_op_environments "."; then
          op_env_configured=true
        fi
        ;;
      *"Migrate secrets"*)
        if ! $has_1password; then
          echo ""
          echo "${YELLOW}⚠️  1Password CLI not installed${NC}"
          echo "   Install with: brew install 1password-cli"
          echo "   Or skip secrets management for now."
          echo ""
          if [[ $RALPH_HAS_GUM -eq 0 ]]; then
            gum confirm "Continue without 1Password?" || continue
          else
            echo -n "Continue without 1Password? [y/N]: "
            read skip_choice
            [[ "$skip_choice" != [Yy]* ]] && continue
          fi
        elif ! $op_signed_in; then
          echo ""
          echo "${YELLOW}⚠️  Not signed in to 1Password${NC}"
          echo "   Run: op signin"
          echo ""
          continue
        fi
        _ralph_setup_migrate_secrets
        ;;
      *"View current configuration"*)
        _ralph_setup_view_config
        ;;
      *"Configure CodeRabbit"*)
        _ralph_setup_configure_coderabbit
        ;;
      *"Configure Obsidian MCP"*)
        _ralph_setup_obsidian_mcp
        ;;
      *"Migrate CLAUDE.md contexts"*)
        if $skip_context_migration; then
          echo "${YELLOW}Skipping context migration (--skip-context-migration flag)${NC}"
        else
          _ralph_setup_context_migration
        fi
        ;;
      *"Exit"*)
        echo ""
        echo "${GREEN}✓ Setup complete!${NC}"
        echo ""
        return 0
        ;;
    esac
  done
}

# Helper: Add a new project to the registry
function _ralph_setup_add_project() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local RED='\033[0;31m'
  local NC='\033[0m'

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│  📂 Add New Project                                         │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  # Auto-detect from current directory
  local detected_path="$(pwd)"
  local detected_name="$(basename "$detected_path")"

  local project_name=""
  local project_path=""

  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    # GUM mode
    echo "Detected: ${YELLOW}$detected_name${NC} at ${YELLOW}$detected_path${NC}"
    echo ""

    if gum confirm "Use current directory?"; then
      project_path="$detected_path"
      project_name=$(gum input --value "$detected_name" --placeholder "Project name")
    else
      project_path=$(gum input --placeholder "Full path to project (e.g., ~/projects/myapp)")
      project_name=$(gum input --placeholder "Project name")
    fi
  else
    # Fallback mode
    echo "Detected: $detected_name at $detected_path"
    echo ""
    echo -n "Use current directory? [Y/n]: "
    read use_cwd
    if [[ "$use_cwd" != [Nn]* ]]; then
      project_path="$detected_path"
      echo -n "Project name [$detected_name]: "
      read project_name
      [[ -z "$project_name" ]] && project_name="$detected_name"
    else
      echo -n "Full path to project: "
      read project_path
      echo -n "Project name: "
      read project_name
    fi
  fi

  # Validate inputs
  if [[ -z "$project_name" || -z "$project_path" ]]; then
    echo "${RED}Error: Project name and path are required${NC}"
    return 1
  fi

  # Expand ~ in path
  project_path="${project_path/#\~/$HOME}"

  # Validate path exists
  if [[ ! -d "$project_path" ]]; then
    echo "${RED}Error: Path does not exist: $project_path${NC}"
    return 1
  fi

  # Ensure registry exists
  if [[ ! -f "$RALPH_REGISTRY_FILE" ]]; then
    _ralph_migrate_to_registry
  fi

  # Check if project already exists
  local existing=$(jq -r --arg name "$project_name" '.projects[$name] // empty' "$RALPH_REGISTRY_FILE" 2>/dev/null)
  if [[ -n "$existing" ]]; then
    echo "${RED}Error: Project '$project_name' already exists${NC}"
    return 1
  fi

  # Add to registry
  local timestamp=$(/bin/date -u +"%Y-%m-%dT%H:%M:%SZ")
  jq --arg name "$project_name" \
     --arg path "$project_path" \
     --arg created "$timestamp" \
     '.projects[$name] = {path: $path, mcps: [], secrets: {}, created: $created}' \
     "$RALPH_REGISTRY_FILE" > "${RALPH_REGISTRY_FILE}.tmp"
  mv "${RALPH_REGISTRY_FILE}.tmp" "$RALPH_REGISTRY_FILE"

  echo ""
  echo "${GREEN}✓ Project '$project_name' added!${NC}"
  echo "  Path: $project_path"
  echo ""

  # Offer to configure MCPs immediately
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    if gum confirm "Configure MCPs for this project now?"; then
      _ralph_setup_configure_mcps_for_project "$project_name"
    fi
  else
    echo -n "Configure MCPs for this project? [y/N]: "
    read config_mcps
    if [[ "$config_mcps" == [Yy]* ]]; then
      _ralph_setup_configure_mcps_for_project "$project_name"
    fi
  fi

  # Regenerate launchers
  _ralph_generate_launchers_from_registry

  echo ""
}

# Helper: Configure MCPs (select project first, then MCPs)
function _ralph_setup_configure_mcps() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local RED='\033[0;31m'
  local NC='\033[0m'

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│  🔧 Configure MCPs                                          │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  # Ensure registry exists
  if [[ ! -f "$RALPH_REGISTRY_FILE" ]]; then
    echo "${YELLOW}No registry found. Creating one...${NC}"
    _ralph_migrate_to_registry
  fi

  # Get list of projects
  local projects=($(jq -r '.projects | keys[]' "$RALPH_REGISTRY_FILE" 2>/dev/null))

  if [[ ${#projects[@]} -eq 0 ]]; then
    echo "${YELLOW}No projects registered. Add a project first.${NC}"
    return 1
  fi

  local selected_project=""

  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    selected_project=$(printf '%s\n' "${projects[@]}" | gum choose --header "Select a project:")
  else
    echo "Available projects:"
    local i=1
    for proj in "${projects[@]}"; do
      echo "  $i) $proj"
      ((i++))
    done
    echo -n "Choose project [1-${#projects[@]}]: "
    read proj_choice
    if [[ "$proj_choice" =~ ^[0-9]+$ ]] && [[ "$proj_choice" -ge 1 ]] && [[ "$proj_choice" -le ${#projects[@]} ]]; then
      selected_project="${projects[$proj_choice]}"
    else
      echo "${RED}Invalid selection${NC}"
      return 1
    fi
  fi

  if [[ -z "$selected_project" ]]; then
    return 1
  fi

  _ralph_setup_configure_mcps_for_project "$selected_project"
}

# Helper: Configure MCPs for a specific project
function _ralph_setup_configure_mcps_for_project() {
  local project_name="$1"
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local CYAN='\033[0;36m'
  local NC='\033[0m'

  echo ""
  echo "Configuring MCPs for: ${YELLOW}$project_name${NC}"
  echo ""

  # Get available MCPs from registry mcpDefinitions
  local available_mcps=($(_ralph_get_available_mcps))

  # Get current MCPs for this project
  local current_mcps=$(jq -r --arg name "$project_name" '.projects[$name].mcps // [] | join(",")' "$RALPH_REGISTRY_FILE" 2>/dev/null)

  echo "${CYAN}Available MCPs from registry (${#available_mcps[@]}):${NC}"
  echo ""

  local selected_mcps=()

  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    # GUM mode - multi-select with current selections pre-marked
    # Build list with descriptions
    local mcp_options=()
    for mcp in "${available_mcps[@]}"; do
      local marker=""
      [[ "$current_mcps" == *"$mcp"* ]] && marker=" (current)"
      mcp_options+=("${mcp}${marker}")
    done

    local selections=$(printf '%s\n' "${available_mcps[@]}" | gum choose --no-limit --header "Select MCPs (space to select, enter to confirm):")
    while IFS= read -r mcp; do
      [[ -n "$mcp" ]] && selected_mcps+=("$mcp")
    done <<< "$selections"
  else
    # Fallback mode - numbered multi-select
    echo "Available MCPs:"
    local i=1
    for mcp in "${available_mcps[@]}"; do
      local marker=" "
      [[ "$current_mcps" == *"$mcp"* ]] && marker="*"
      echo "  $i) [$marker] $mcp"
      ((i++))
    done
    echo ""
    echo "Enter numbers separated by spaces (e.g., '1 3 5'):"
    echo -n "> "
    read mcp_choices
    for choice in $mcp_choices; do
      if [[ "$choice" =~ ^[0-9]+$ ]] && [[ "$choice" -ge 1 ]] && [[ "$choice" -le ${#available_mcps[@]} ]]; then
        selected_mcps+=("${available_mcps[$choice]}")
      fi
    done
  fi

  # Convert to JSON array
  local mcps_json="[]"
  if [[ ${#selected_mcps[@]} -gt 0 ]]; then
    mcps_json=$(printf '%s\n' "${selected_mcps[@]}" | jq -R . | jq -s .)
  fi

  # Update registry
  jq --arg name "$project_name" \
     --argjson mcps "$mcps_json" \
     '.projects[$name].mcps = $mcps' \
     "$RALPH_REGISTRY_FILE" > "${RALPH_REGISTRY_FILE}.tmp"
  mv "${RALPH_REGISTRY_FILE}.tmp" "$RALPH_REGISTRY_FILE"

  echo ""
  if [[ ${#selected_mcps[@]} -gt 0 ]]; then
    echo "${GREEN}✓ MCPs configured: ${selected_mcps[*]}${NC}"
  else
    echo "${YELLOW}No MCPs selected${NC}"
  fi

  # Regenerate launchers
  _ralph_generate_launchers_from_registry
}

# Helper: Manage MCP definitions in the registry
function _ralph_setup_manage_mcp_definitions() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local CYAN='\033[0;36m'
  local RED='\033[0;31m'
  local NC='\033[0m'

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│  ➕ Manage MCP Definitions                                  │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  # Ensure registry exists
  if [[ ! -f "$RALPH_REGISTRY_FILE" ]]; then
    echo "${YELLOW}No registry found. Creating one...${NC}"
    _ralph_migrate_to_registry
  fi

  # Show current MCP definitions
  local mcp_count=$(jq '.mcpDefinitions | length' "$RALPH_REGISTRY_FILE" 2>/dev/null || echo "0")
  echo "${CYAN}Current MCP definitions ($mcp_count):${NC}"
  echo ""
  jq -r '.mcpDefinitions | keys[] | "  • \(.)"' "$RALPH_REGISTRY_FILE" 2>/dev/null
  echo ""

  local action=""
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    action=$(gum choose \
      "➕ Add new MCP definition" \
      "👁️  View MCP definition details" \
      "🗑️  Remove MCP definition" \
      "⬅️  Back to main menu")
  else
    echo "What would you like to do?"
    echo ""
    echo "  1) ➕ Add new MCP definition"
    echo "  2) 👁️  View MCP definition details"
    echo "  3) 🗑️  Remove MCP definition"
    echo "  4) ⬅️  Back to main menu"
    echo ""
    echo -n "Choose [1-4]: "
    read action_choice
    case "$action_choice" in
      1) action="➕ Add new MCP" ;;
      2) action="👁️  View MCP" ;;
      3) action="🗑️  Remove MCP" ;;
      *) action="⬅️  Back" ;;
    esac
  fi

  case "$action" in
    *"Add new MCP"*)
      _ralph_setup_add_mcp_definition
      ;;
    *"View MCP"*)
      _ralph_setup_view_mcp_definition
      ;;
    *"Remove MCP"*)
      _ralph_setup_remove_mcp_definition
      ;;
    *)
      return 0
      ;;
  esac
}

# Helper: Add a new MCP definition to the registry
function _ralph_setup_add_mcp_definition() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local CYAN='\033[0;36m'
  local RED='\033[0;31m'
  local NC='\033[0m'

  echo ""
  echo "Adding a new MCP definition..."
  echo ""

  local mcp_name=""
  local mcp_command=""
  local mcp_args=""
  local mcp_env=""

  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    mcp_name=$(gum input --placeholder "MCP name (e.g., my-mcp)")
    [[ -z "$mcp_name" ]] && return 1

    mcp_command=$(gum input --placeholder "Command (e.g., npx, node, python)")
    [[ -z "$mcp_command" ]] && return 1

    mcp_args=$(gum input --placeholder "Args as JSON array (e.g., [\"-y\", \"@some/mcp\"])")
    [[ -z "$mcp_args" ]] && mcp_args="[]"

    echo "Environment variables (optional, JSON object):"
    mcp_env=$(gum input --placeholder "{\"KEY\": \"value\"}")
    [[ -z "$mcp_env" ]] && mcp_env="{}"
  else
    echo -n "MCP name (e.g., my-mcp): "
    read mcp_name
    [[ -z "$mcp_name" ]] && return 1

    echo -n "Command (e.g., npx, node, python): "
    read mcp_command
    [[ -z "$mcp_command" ]] && return 1

    echo -n "Args as JSON array (e.g., [\"-y\", \"@some/mcp\"]): "
    read mcp_args
    [[ -z "$mcp_args" ]] && mcp_args="[]"

    echo -n "Environment variables (JSON object, optional): "
    read mcp_env
    [[ -z "$mcp_env" ]] && mcp_env="{}"
  fi

  # Validate JSON
  if ! echo "$mcp_args" | jq -e '.' &>/dev/null; then
    echo "${RED}Error: Invalid JSON for args${NC}"
    return 1
  fi
  if ! echo "$mcp_env" | jq -e '.' &>/dev/null; then
    echo "${RED}Error: Invalid JSON for env${NC}"
    return 1
  fi

  # Check if MCP already exists
  local existing=$(jq -r --arg name "$mcp_name" '.mcpDefinitions[$name] // empty' "$RALPH_REGISTRY_FILE" 2>/dev/null)
  if [[ -n "$existing" ]]; then
    echo "${YELLOW}Warning: MCP '$mcp_name' already exists${NC}"
    if [[ $RALPH_HAS_GUM -eq 0 ]]; then
      gum confirm "Overwrite existing definition?" || return 1
    else
      echo -n "Overwrite existing definition? [y/N]: "
      read overwrite
      [[ "$overwrite" != [Yy]* ]] && return 1
    fi
  fi

  # Add to registry
  jq --arg name "$mcp_name" \
     --arg cmd "$mcp_command" \
     --argjson args "$mcp_args" \
     --argjson env "$mcp_env" \
     '.mcpDefinitions[$name] = {command: $cmd, args: $args, env: $env}' \
     "$RALPH_REGISTRY_FILE" > "${RALPH_REGISTRY_FILE}.tmp"
  mv "${RALPH_REGISTRY_FILE}.tmp" "$RALPH_REGISTRY_FILE"

  echo ""
  echo "${GREEN}✓ MCP definition '$mcp_name' added!${NC}"
  echo ""
}

# Helper: View details of an MCP definition
function _ralph_setup_view_mcp_definition() {
  local CYAN='\033[0;36m'
  local YELLOW='\033[0;33m'
  local NC='\033[0m'

  echo ""
  local mcps=($(jq -r '.mcpDefinitions | keys[]' "$RALPH_REGISTRY_FILE" 2>/dev/null))

  if [[ ${#mcps[@]} -eq 0 ]]; then
    echo "${YELLOW}No MCP definitions found${NC}"
    return 1
  fi

  local selected_mcp=""
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    selected_mcp=$(printf '%s\n' "${mcps[@]}" | gum choose --header "Select MCP to view:")
  else
    echo "Available MCPs:"
    local i=1
    for mcp in "${mcps[@]}"; do
      echo "  $i) $mcp"
      ((i++))
    done
    echo -n "Choose MCP [1-${#mcps[@]}]: "
    read mcp_choice
    if [[ "$mcp_choice" =~ ^[0-9]+$ ]] && [[ "$mcp_choice" -ge 1 ]] && [[ "$mcp_choice" -le ${#mcps[@]} ]]; then
      selected_mcp="${mcps[$mcp_choice]}"
    fi
  fi

  [[ -z "$selected_mcp" ]] && return 1

  echo ""
  echo "${CYAN}MCP: $selected_mcp${NC}"
  echo ""
  jq --arg name "$selected_mcp" '.mcpDefinitions[$name]' "$RALPH_REGISTRY_FILE" 2>/dev/null
  echo ""
}

# Helper: Remove an MCP definition from the registry
function _ralph_setup_remove_mcp_definition() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local RED='\033[0;31m'
  local NC='\033[0m'

  echo ""
  local mcps=($(jq -r '.mcpDefinitions | keys[]' "$RALPH_REGISTRY_FILE" 2>/dev/null))

  if [[ ${#mcps[@]} -eq 0 ]]; then
    echo "${YELLOW}No MCP definitions found${NC}"
    return 1
  fi

  local selected_mcp=""
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    selected_mcp=$(printf '%s\n' "${mcps[@]}" | gum choose --header "Select MCP to remove:")
  else
    echo "Available MCPs:"
    local i=1
    for mcp in "${mcps[@]}"; do
      echo "  $i) $mcp"
      ((i++))
    done
    echo -n "Choose MCP to remove [1-${#mcps[@]}]: "
    read mcp_choice
    if [[ "$mcp_choice" =~ ^[0-9]+$ ]] && [[ "$mcp_choice" -ge 1 ]] && [[ "$mcp_choice" -le ${#mcps[@]} ]]; then
      selected_mcp="${mcps[$mcp_choice]}"
    fi
  fi

  [[ -z "$selected_mcp" ]] && return 1

  # Confirm deletion
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    gum confirm "Remove MCP definition '$selected_mcp'?" || return 1
  else
    echo -n "Remove MCP definition '$selected_mcp'? [y/N]: "
    read confirm
    [[ "$confirm" != [Yy]* ]] && return 1
  fi

  # Remove from registry
  jq --arg name "$selected_mcp" 'del(.mcpDefinitions[$name])' \
     "$RALPH_REGISTRY_FILE" > "${RALPH_REGISTRY_FILE}.tmp"
  mv "${RALPH_REGISTRY_FILE}.tmp" "$RALPH_REGISTRY_FILE"

  echo ""
  echo "${GREEN}✓ MCP definition '$selected_mcp' removed${NC}"
  echo ""

  # Warn about projects using this MCP
  local projects_using=$(jq -r --arg mcp "$selected_mcp" '.projects | to_entries[] | select(.value.mcps | index($mcp)) | .key' "$RALPH_REGISTRY_FILE" 2>/dev/null)
  if [[ -n "$projects_using" ]]; then
    echo "${YELLOW}Warning: The following projects still reference this MCP:${NC}"
    echo "$projects_using" | while read -r proj; do
      echo "  • $proj"
    done
    echo ""
    echo "You may want to reconfigure their MCPs."
    echo ""
  fi
}

# Helper: Configure 1Password Environments for the current project
function _ralph_setup_configure_op_environments() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local CYAN='\033[0;36m'
  local RED='\033[0;31m'
  local NC='\033[0m'

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│  🔐 Configure 1Password Environments                        │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  # Check prerequisites
  if ! command -v op &>/dev/null; then
    echo "${RED}Error: 1Password CLI (op) is not installed${NC}"
    echo ""
    echo "Install with:"
    echo "  ${YELLOW}brew install 1password-cli${NC}"
    echo ""
    return 1
  fi

  if ! op account list &>/dev/null 2>&1; then
    echo "${RED}Error: Not signed in to 1Password${NC}"
    echo ""
    echo "Sign in with:"
    echo "  ${YELLOW}eval \$(op signin)${NC}"
    echo ""
    return 1
  fi

  echo "${GREEN}✓ 1Password CLI installed and signed in${NC}"
  echo ""

  # Check current state
  if _ralph_check_op_environments "."; then
    echo "${GREEN}✓ 1Password Environments already configured!${NC}"
    echo ""
    # Show what's configured
    if [[ -f ".env.1password" ]]; then
      echo "Found: ${CYAN}.env.1password${NC}"
      local op_refs=$(grep -c "op://" ".env.1password" 2>/dev/null || echo "0")
      echo "       Contains $op_refs secret references"
    fi
    local env_files=(".env" ".env.local" ".env.development" ".env.production" ".env.example")
    for env_file in "${env_files[@]}"; do
      if [[ -f "$env_file" ]] && grep -q "op://" "$env_file" 2>/dev/null; then
        local op_refs=$(grep -c "op://" "$env_file" 2>/dev/null || echo "0")
        echo "Found: ${CYAN}$env_file${NC} with $op_refs op:// references"
      fi
    done
    echo ""
    echo "To add more secrets, use:"
    echo "  ${YELLOW}ralph-secrets migrate .env${NC}"
    echo ""
    return 0
  fi

  # Not configured - guide setup
  echo "${YELLOW}1Password Environments not yet configured for this project.${NC}"
  echo ""
  echo "1Password Environments allow you to securely inject secrets into"
  echo "your project using op:// references instead of hardcoded values."
  echo ""
  echo "${CYAN}Setup options:${NC}"
  echo ""
  echo "  ${YELLOW}Option 1:${NC} Migrate existing .env file"
  echo "    Converts hardcoded secrets to op:// references"
  echo "    Command: ${YELLOW}ralph-secrets migrate .env${NC}"
  echo ""
  echo "  ${YELLOW}Option 2:${NC} Create .env.1password manually"
  echo "    Create a file with op:// references like:"
  echo "    ${CYAN}DATABASE_URL=op://Private/Database/password${NC}"
  echo "    ${CYAN}API_KEY=op://Private/MyAPI/credential${NC}"
  echo ""
  echo "  ${YELLOW}Option 3:${NC} Use /1password skill in Claude"
  echo "    Run ${CYAN}/1password${NC} for guided setup"
  echo ""

  # Offer to run migration if .env exists
  if [[ -f ".env" ]]; then
    echo "Detected: ${CYAN}.env${NC} file exists in this project"
    echo ""
    if [[ $RALPH_HAS_GUM -eq 0 ]]; then
      if gum confirm "Would you like to preview migrating .env to 1Password?"; then
        echo ""
        ralph-secrets migrate .env --dry-run
      fi
    else
      echo -n "Would you like to preview migrating .env to 1Password? [y/N]: "
      read migrate_choice
      if [[ "$migrate_choice" == [Yy]* ]]; then
        echo ""
        ralph-secrets migrate .env --dry-run
      fi
    fi
  fi

  echo ""
}

# Helper: Migrate secrets (invokes 1Password workflow)
function _ralph_setup_migrate_secrets() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local CYAN='\033[0;36m'
  local RED='\033[0;31m'
  local NC='\033[0m'

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│  🔑 Migrate Secrets to 1Password                            │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  # Scan for .env files in current directory
  local env_files=()
  local env_secrets_count=0

  echo "${CYAN}Scanning for .env files...${NC}"
  echo ""

  for env_file in .env .env.local .env.development .env.production .env.staging .env.test; do
    if [[ -f "$env_file" ]]; then
      # Count non-comment, non-empty lines with = (secrets)
      local secrets=$(grep -v "^#" "$env_file" 2>/dev/null | grep -v "^$" | grep "=" | wc -l | tr -d ' ')
      # Count lines already using op://
      local op_refs=$(grep "op://" "$env_file" 2>/dev/null | wc -l | tr -d ' ')
      local plain_secrets=$((secrets - op_refs))

      if [[ "$plain_secrets" -gt 0 ]]; then
        env_files+=("$env_file")
        env_secrets_count=$((env_secrets_count + plain_secrets))
        echo "  📄 ${YELLOW}$env_file${NC}: ${plain_secrets} secrets (${op_refs} already using op://)"
      elif [[ "$secrets" -gt 0 ]]; then
        echo "  ✅ ${GREEN}$env_file${NC}: All $secrets secrets already use op://"
      fi
    fi
  done

  if [[ ${#env_files[@]} -eq 0 ]]; then
    echo "  ${GREEN}✓ No .env files with plain secrets found${NC}"
    echo ""
    echo "All secrets are either migrated or you don't have .env files."
    echo ""
    return 0
  fi

  echo ""
  echo "Found ${YELLOW}$env_secrets_count${NC} plain secrets in ${#env_files[@]} file(s)"
  echo ""

  local migrate_choice=""

  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    migrate_choice=$(gum choose \
      "🔍 Scan .env files (preview migration)" \
      "📄 Migrate .env file to 1Password" \
      "⚙️  Migrate MCP config secrets" \
      "⬅️  Back to main menu")
  else
    echo "What would you like to do?"
    echo ""
    echo "  1) 🔍 Scan .env files (preview migration)"
    echo "  2) 📄 Migrate .env file to 1Password"
    echo "  3) ⚙️  Migrate MCP config secrets"
    echo "  4) ⬅️  Back to main menu"
    echo ""
    echo -n "Choose [1-4]: "
    read migrate_opt
    case "$migrate_opt" in
      1) migrate_choice="🔍 Scan .env" ;;
      2) migrate_choice="📄 Migrate .env file" ;;
      3) migrate_choice="⚙️  Migrate MCP config" ;;
      *) migrate_choice="⬅️  Back" ;;
    esac
  fi

  case "$migrate_choice" in
    *"Scan .env"*)
      echo ""
      echo "${CYAN}Scanning .env files for secrets...${NC}"
      echo ""
      for env_file in "${env_files[@]}"; do
        echo "━━━ ${YELLOW}$env_file${NC} ━━━"
        # Show keys only (not values) for security
        grep -v "^#" "$env_file" 2>/dev/null | grep -v "^$" | grep "=" | grep -v "op://" | sed 's/=.*/=***/' | head -20
        echo ""
      done
      echo "${YELLOW}To migrate these secrets to 1Password:${NC}"
      echo "  ${CYAN}ralph-secrets migrate .env --dry-run${NC}  # Preview"
      echo "  ${CYAN}ralph-secrets migrate .env${NC}            # Execute"
      echo ""
      ;;
    *".env file"*)
      echo ""
      echo "${CYAN}For .env migration, use the ralph-secrets command:${NC}"
      echo ""
      echo "  ${YELLOW}ralph-secrets migrate .env --dry-run${NC}  # Preview first"
      echo "  ${YELLOW}ralph-secrets migrate .env${NC}            # Actually migrate"
      echo ""
      echo "Or invoke the /1password skill in Claude:"
      echo "  ${YELLOW}/1password${NC} → Select 'Migrate .env to 1Password'"
      echo ""
      ;;
    *"MCP config"*)
      echo ""
      echo "${CYAN}To migrate MCP config secrets:${NC}"
      echo ""
      echo "  1. Scan for hardcoded secrets:"
      echo "     ${YELLOW}bash ~/.claude/commands/golem-powers/1password/scripts/scan-mcp-secrets.sh${NC}"
      echo ""
      echo "  2. Or invoke the /1password skill in Claude:"
      echo "     ${YELLOW}/golem-powers:1password${NC} → Select 'Migrate MCP config secrets'"
      echo ""
      ;;
    *)
      return 0
      ;;
  esac

  # Generate .env.1password for projects with secrets
  _ralph_setup_generate_env_files
}

# Helper: Generate .env.1password files for all projects with secrets
function _ralph_setup_generate_env_files() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local NC='\033[0m'

  if [[ ! -f "$RALPH_REGISTRY_FILE" ]]; then
    return 0
  fi

  # Get projects with secrets
  local projects_with_secrets=$(jq -r '.projects | to_entries[] | select(.value.secrets | length > 0) | .key' "$RALPH_REGISTRY_FILE" 2>/dev/null)

  if [[ -z "$projects_with_secrets" ]]; then
    echo "${YELLOW}No projects have secrets configured in the registry.${NC}"
    echo "Use 'ralph-secrets migrate' to add secrets first."
    return 0
  fi

  echo ""
  echo "Generating .env.1password files..."

  while IFS= read -r project; do
    [[ -z "$project" ]] && continue
    local project_path=$(jq -r --arg name "$project" '.projects[$name].path' "$RALPH_REGISTRY_FILE" 2>/dev/null)
    local env_file="${project_path}/.env.1password"

    _ralph_generate_env_1password "$project" "$env_file"
    echo "${GREEN}✓ Generated: $env_file${NC}"
  done <<< "$projects_with_secrets"

  echo ""
}

# Helper: Configure CodeRabbit pre-commit reviews
function _ralph_setup_configure_coderabbit() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local CYAN='\033[0;36m'
  local NC='\033[0m'

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│  🐰 Configure CodeRabbit                                    │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  # Check if cr CLI is installed
  if ! command -v cr >/dev/null 2>&1; then
    echo "${YELLOW}⚠️  CodeRabbit CLI (cr) not installed${NC}"
    echo ""
    echo "Install with: npm install -g coderabbit"
    echo "Or: brew install coderabbit/tap/coderabbit"
    echo ""
    echo "CodeRabbit provides free AI code reviews for open source projects."
    echo ""
    return 0
  fi

  local cr_version=$(cr --version 2>/dev/null || echo "unknown")
  echo "${GREEN}✓ CodeRabbit CLI installed (v$cr_version)${NC}"
  echo ""

  # Get current settings
  local current_enabled="true"
  local current_repos=""
  if [[ -f "$RALPH_REGISTRY_FILE" ]]; then
    current_enabled=$(jq -r '.coderabbit.enabled // "true"' "$RALPH_REGISTRY_FILE" 2>/dev/null)
    current_repos=$(jq -r '.coderabbit.repos // [] | join(", ")' "$RALPH_REGISTRY_FILE" 2>/dev/null)
  fi

  echo "CodeRabbit runs 'cr review' before commits to catch issues early."
  echo "This is ${GREEN}free for open source repos${NC}."
  echo ""
  echo "Current settings:"
  echo "  ${CYAN}Enabled:${NC} $current_enabled"
  echo "  ${CYAN}Repos:${NC}   ${current_repos:-"(none - opt-in required)"}"
  echo ""

  # Enable/disable
  local enable_cr="true"
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    if gum confirm "Enable CodeRabbit pre-commit checks?"; then
      enable_cr="true"
    else
      enable_cr="false"
    fi
  else
    echo -n "Enable CodeRabbit pre-commit checks? [Y/n]: "
    read enable_choice
    if [[ "$enable_choice" == [Nn]* ]]; then
      enable_cr="false"
    fi
  fi

  if [[ "$enable_cr" == "false" ]]; then
    # Update registry with disabled state
    if [[ -f "$RALPH_REGISTRY_FILE" ]]; then
      local tmp=$(mktemp)
      jq '.coderabbit = {"enabled": false, "repos": []}' "$RALPH_REGISTRY_FILE" > "$tmp" && mv "$tmp" "$RALPH_REGISTRY_FILE"
    fi
    RALPH_CODERABBIT_ENABLED="false"
    RALPH_CODERABBIT_ALLOWED_REPOS=""
    echo ""
    echo "${GREEN}✓ CodeRabbit disabled${NC}"
    return 0
  fi

  # Which repos?
  echo ""
  echo "Which repos should use CodeRabbit?"
  echo "  • Enter repo names comma-separated (e.g., claude-golem, songscript)"
  echo "  • Enter * for all repos"
  echo ""

  local repos_input=""
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    repos_input=$(gum input --placeholder "Repo names (comma-separated) or * for all" --value "$current_repos")
  else
    echo -n "Repos (comma-separated or * for all): "
    read repos_input
  fi

  # Parse repos into array
  local repos_array=""
  if [[ "$repos_input" == "*" ]]; then
    repos_array='["*"]'
  elif [[ -n "$repos_input" ]]; then
    # Convert comma-separated to JSON array
    repos_array=$(echo "$repos_input" | sed 's/,/","/g' | sed 's/^/["/g' | sed 's/$/"]/g' | sed 's/ //g')
  else
    repos_array='[]'
  fi

  # Update registry
  mkdir -p "$RALPH_CONFIG_DIR"
  if [[ -f "$RALPH_REGISTRY_FILE" ]]; then
    local tmp=$(mktemp)
    jq --argjson repos "$repos_array" '.coderabbit = {"enabled": true, "repos": $repos}' "$RALPH_REGISTRY_FILE" > "$tmp" && mv "$tmp" "$RALPH_REGISTRY_FILE"
  else
    # Create minimal registry with CodeRabbit config
    echo "{\"version\": 1, \"coderabbit\": {\"enabled\": true, \"repos\": $repos_array}}" > "$RALPH_REGISTRY_FILE"
  fi

  # Update runtime variables
  RALPH_CODERABBIT_ENABLED="true"
  if [[ "$repos_input" == "*" ]]; then
    RALPH_CODERABBIT_ALLOWED_REPOS="*"
  else
    RALPH_CODERABBIT_ALLOWED_REPOS="$repos_input"
  fi

  echo ""
  echo "${GREEN}✓ CodeRabbit configured${NC}"
  echo "  Enabled: true"
  echo "  Repos: $repos_input"
  echo ""
  echo "Ralph will now run 'cr review' before commits in these repos."
  echo ""
}

# Helper: Obsidian MCP setup
function _ralph_setup_obsidian_mcp() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local CYAN='\033[0;36m'
  local RED='\033[0;31m'
  local NC='\033[0m'

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│  📓 Obsidian Claude Code MCP Setup                          │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""
  echo "This will help you configure the Obsidian Claude Code MCP plugin."
  echo "The plugin enables Claude to read and write to your Obsidian vault."
  echo ""
  echo "${CYAN}Prerequisites:${NC}"
  echo "  • Obsidian installed"
  echo "  • Claude Code MCP plugin installed from Community Plugins"
  echo ""

  local do_setup=""
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    gum confirm "Would you like to set up Obsidian MCP integration?" && do_setup="yes"
  else
    echo -n "Would you like to set up Obsidian MCP integration? [y/N]: "
    read do_setup_input
    [[ "$do_setup_input" == [Yy]* ]] && do_setup="yes"
  fi

  if [[ -z "$do_setup" ]]; then
    echo ""
    echo "${YELLOW}Skipping Obsidian MCP setup${NC}"
    return 0
  fi

  # Find and run the install script
  local script_path=""

  # Check in multiple locations
  if [[ -f "${RALPH_SCRIPT_DIR}/scripts/install-obsidian-mcp.sh" ]]; then
    script_path="${RALPH_SCRIPT_DIR}/scripts/install-obsidian-mcp.sh"
  elif [[ -f "${RALPH_CONFIG_DIR}/../ralph/scripts/install-obsidian-mcp.sh" ]]; then
    script_path="${RALPH_CONFIG_DIR}/../ralph/scripts/install-obsidian-mcp.sh"
  elif [[ -f "$HOME/.config/ralphtools/scripts/install-obsidian-mcp.sh" ]]; then
    script_path="$HOME/.config/ralphtools/scripts/install-obsidian-mcp.sh"
  fi

  if [[ -n "$script_path" ]] && [[ -f "$script_path" ]]; then
    echo ""
    echo "Running Obsidian MCP setup script..."
    echo ""
    bash "$script_path"
  else
    # Fallback: inline setup if script not found
    echo ""
    echo "${YELLOW}Setup script not found. Running inline setup...${NC}"
    echo ""

    # Detect vaults
    local obsidian_config="$HOME/Library/Application Support/obsidian/obsidian.json"
    local -a vaults=()

    if [[ -f "$obsidian_config" ]] && command -v jq &>/dev/null; then
      while IFS= read -r vault_path; do
        [[ -d "$vault_path" ]] && vaults+=("$vault_path")
      done < <(jq -r '.vaults | to_entries[] | .value.path // empty' "$obsidian_config" 2>/dev/null)
    fi

    if [[ ${#vaults[@]} -eq 0 ]]; then
      echo "${YELLOW}No Obsidian vaults found automatically.${NC}"
      echo "Please enter your vault path:"
      if [[ $RALPH_HAS_GUM -eq 0 ]]; then
        local vault_path=$(gum input --placeholder "/path/to/vault")
      else
        echo -n "Vault path: "
        read vault_path
      fi
      [[ -d "$vault_path" ]] && vaults+=("$vault_path")
    fi

    if [[ ${#vaults[@]} -eq 0 ]]; then
      echo "${RED}No valid vault path provided.${NC}"
      return 1
    fi

    local selected_vault="${vaults[1]}"  # zsh arrays start at 1
    local vault_name=$(basename "$selected_vault")

    if [[ ${#vaults[@]} -gt 1 ]]; then
      echo ""
      echo "Multiple vaults found. Please select one:"
      local i=1
      for v in "${vaults[@]}"; do
        echo "  $i) $(basename "$v") - $v"
        ((i++))
      done
      echo ""
      if [[ $RALPH_HAS_GUM -eq 0 ]]; then
        local vault_names=()
        for v in "${vaults[@]}"; do
          vault_names+=("$(basename "$v")")
        done
        local selected_name=$(gum choose "${vault_names[@]}")
        for i in {1..${#vaults[@]}}; do
          if [[ "$(basename "${vaults[$i]}")" == "$selected_name" ]]; then
            selected_vault="${vaults[$i]}"
            vault_name="$selected_name"
            break
          fi
        done
      else
        echo -n "Enter vault number [1-${#vaults[@]}]: "
        read vault_num
        if [[ "$vault_num" =~ ^[0-9]+$ ]] && [[ "$vault_num" -ge 1 ]] && [[ "$vault_num" -le ${#vaults[@]} ]]; then
          selected_vault="${vaults[$vault_num]}"
          vault_name=$(basename "$selected_vault")
        fi
      fi
    fi

    echo ""
    echo "${GREEN}✓${NC} Selected vault: $vault_name"
    echo "  Path: $selected_vault"

    # Get port
    local mcp_port=22360
    echo ""
    echo "Default MCP port is 22360."
    if [[ $RALPH_HAS_GUM -eq 0 ]]; then
      local port_input=$(gum input --placeholder "22360" --value "22360" --header "MCP Port:")
      [[ -n "$port_input" ]] && mcp_port="$port_input"
    else
      echo -n "MCP Port [22360]: "
      read port_input
      [[ -n "$port_input" ]] && mcp_port="$port_input"
    fi

    local mcp_url="http://localhost:$mcp_port/sse"

    # Store in 1Password if available
    if command -v op &>/dev/null; then
      echo ""
      local store_op=""
      if [[ $RALPH_HAS_GUM -eq 0 ]]; then
        gum confirm "Store MCP URL in 1Password?" && store_op="yes"
      else
        echo -n "Store MCP URL in 1Password? [y/N]: "
        read store_op_input
        [[ "$store_op_input" == [Yy]* ]] && store_op="yes"
      fi

      if [[ "$store_op" == "yes" ]]; then
        if op item get "Obsidian-MCP" --vault "Private" &>/dev/null 2>&1; then
          op item edit "Obsidian-MCP" --vault "Private" "url=$mcp_url" "vault_name=$vault_name" "port=$mcp_port" &>/dev/null && \
            echo "${GREEN}✓${NC} Updated 1Password item: Obsidian-MCP" || \
            echo "${YELLOW}⚠${NC} Failed to update 1Password item"
        else
          op item create --category "API Credential" --vault "Private" --title "Obsidian-MCP" "url=$mcp_url" "vault_name=$vault_name" "port=$mcp_port" &>/dev/null && \
            echo "${GREEN}✓${NC} Created 1Password item: Obsidian-MCP" || \
            echo "${YELLOW}⚠${NC} Failed to create 1Password item"
        fi
      fi
    fi

    echo ""
    echo "${CYAN}MCP Configuration for settings.json:${NC}"
    echo ""
    echo "{"
    echo "  \"mcpServers\": {"
    echo "    \"obsidian-$vault_name\": {"
    echo "      \"command\": \"npx\","
    echo "      \"args\": [\"mcp-remote\", \"$mcp_url\"]"
    echo "    }"
    echo "  }"
    echo "}"
    echo ""
    echo "${GREEN}✓${NC} Obsidian MCP setup complete!"
    echo ""
    echo "${CYAN}Next steps:${NC}"
    echo "  1. Ensure the Claude Code MCP plugin is installed in Obsidian"
    echo "  2. Set the plugin port to: $mcp_port"
    echo "  3. Enable the server in plugin settings"
    echo "  4. Use 'claude' → '/ide' to connect"
    echo ""
  fi
}

# Helper: Context migration wizard
function _ralph_setup_context_migration() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local CYAN='\033[0;36m'
  local RED='\033[0;31m'
  local NC='\033[0m'
  local BOLD='\033[1m'

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│  📜 CLAUDE.md Context Migration                             │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  # Check if contexts directory exists at ~/.claude/contexts/
  local contexts_source="${RALPH_SCRIPT_DIR}/contexts"
  local contexts_target="$HOME/.claude/contexts"

  # First, ensure the contexts directory exists
  if [[ ! -d "$contexts_target" ]]; then
    echo "${YELLOW}⚠️  Contexts directory not found${NC}"
    echo "   Location: $contexts_target"
    echo ""

    # Check if we have context templates to copy
    if [[ -d "$contexts_source" ]]; then
      echo "Found context templates at: ${CYAN}$contexts_source${NC}"
      echo ""

      local should_create=false
      if [[ $RALPH_HAS_GUM -eq 0 ]]; then
        if gum confirm "Create contexts directory and copy templates?"; then
          should_create=true
        fi
      else
        echo -n "Create contexts directory and copy templates? [Y/n]: "
        read create_choice
        if [[ "$create_choice" != [Nn]* ]]; then
          should_create=true
        fi
      fi

      if $should_create; then
        # Check if source has files before copying
        local has_files=false
        if [[ -f "$contexts_source/base.md" ]] || [[ -d "$contexts_source/tech" ]] || [[ -d "$contexts_source/workflow" ]]; then
          has_files=true
        fi

        if $has_files; then
          mkdir -p "$contexts_target/tech" "$contexts_target/workflow"
          cp -r "$contexts_source/"* "$contexts_target/" 2>/dev/null || true
          echo "${GREEN}✓ Contexts directory created${NC}"
          echo ""
        else
          echo "${YELLOW}⚠️  No context templates found in source directory${NC}"
          echo ""
        fi
      else
        echo "${YELLOW}Skipping context setup${NC}"
        return 0
      fi
    else
      echo "No context templates found in ralphtools."
      echo "Run this from the ralphtools directory or ensure contexts/ exists."
      echo ""
      return 1
    fi
  else
    echo "${GREEN}✓ Contexts directory exists${NC}: $contexts_target"
    echo ""
  fi

  # List available contexts
  echo "${BOLD}Available Contexts:${NC}"
  echo "──────────────────────────────────────────────────────────────"
  if [[ -f "$contexts_target/base.md" ]]; then
    echo "  ${GREEN}✓${NC} base.md"
  else
    echo "  ${RED}✗${NC} base.md (missing)"
  fi

  for subdir in tech workflow; do
    if [[ -d "$contexts_target/$subdir" ]]; then
      for ctx_file in "$contexts_target/$subdir"/*.md; do
        [[ -f "$ctx_file" ]] && echo "  ${GREEN}✓${NC} $subdir/$(basename "$ctx_file" .md)"
      done
    fi
  done
  echo ""

  # Check if source templates are newer and offer to update
  if [[ -d "$contexts_source" ]]; then
    local updates_available=false
    for src_file in "$contexts_source/"*.md "$contexts_source/tech/"*.md "$contexts_source/workflow/"*.md; do
      [[ ! -f "$src_file" ]] && continue
      local rel_path="${src_file#$contexts_source/}"
      local target_file="$contexts_target/$rel_path"
      if [[ ! -f "$target_file" ]]; then
        updates_available=true
        break
      fi
    done

    if $updates_available; then
      echo "${YELLOW}Some context templates are missing. Copy from ralphtools?${NC}"
      local should_copy=false
      if [[ $RALPH_HAS_GUM -eq 0 ]]; then
        gum confirm "Copy missing context templates?" && should_copy=true
      else
        echo -n "Copy missing context templates? [y/N]: "
        read copy_choice
        [[ "$copy_choice" == [Yy]* ]] && should_copy=true
      fi

      if $should_copy; then
        cp -rn "$contexts_source/"* "$contexts_target/" 2>/dev/null
        echo "${GREEN}✓ Context templates updated${NC}"
        echo ""
      fi
    fi
  fi

  # Now offer to migrate a project's CLAUDE.md
  echo "${BOLD}Migrate a Project's CLAUDE.md:${NC}"
  echo "──────────────────────────────────────────────────────────────"
  echo ""
  echo "The migration script analyzes your CLAUDE.md and suggests"
  echo "which content can be moved to shared contexts."
  echo ""

  # Get project path
  local project_path=""
  local detected_path="$(pwd)"

  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    local path_choice=$(gum choose \
      "Analyze current directory ($detected_path)" \
      "Enter a different path" \
      "Skip migration")

    case "$path_choice" in
      *"current directory"*)
        project_path="$detected_path"
        ;;
      *"different path"*)
        project_path=$(gum input --placeholder "Path to project with CLAUDE.md")
        ;;
      *)
        echo "${YELLOW}Skipping migration analysis${NC}"
        return 0
        ;;
    esac
  else
    echo "Options:"
    echo "  1) Analyze current directory ($detected_path)"
    echo "  2) Enter a different path"
    echo "  3) Skip migration"
    echo ""
    echo -n "Choose [1-3]: "
    read path_choice
    case "$path_choice" in
      1)
        project_path="$detected_path"
        ;;
      2)
        echo -n "Path to project: "
        read project_path
        ;;
      *)
        echo "${YELLOW}Skipping migration analysis${NC}"
        return 0
        ;;
    esac
  fi

  # Expand ~ in path
  project_path="${project_path/#\~/$HOME}"

  # Check for CLAUDE.md
  if [[ ! -f "$project_path/CLAUDE.md" ]]; then
    echo "${RED}Error: No CLAUDE.md found at $project_path${NC}"
    return 1
  fi

  # Check for migration script
  local migrate_script="${RALPH_SCRIPT_DIR}/scripts/context-migrate.zsh"
  if [[ ! -f "$migrate_script" ]]; then
    echo "${RED}Error: Migration script not found at $migrate_script${NC}"
    return 1
  fi

  # Run the analysis
  echo ""
  echo "${CYAN}Running analysis...${NC}"
  echo ""
  "$migrate_script" "$project_path"

  # Ask if user wants to apply
  echo ""
  local should_apply=false
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    if gum confirm "Apply migration now?"; then
      should_apply=true
    fi
  else
    echo -n "Apply migration now? [y/N]: "
    read apply_choice
    [[ "$apply_choice" == [Yy]* ]] && should_apply=true
  fi

  if $should_apply; then
    echo ""
    "$migrate_script" "$project_path" --apply
    echo ""
    echo "${GREEN}✓ Migration applied!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Open $project_path/CLAUDE.md"
    echo "  2. Review the backup file for any project-specific rules"
    echo "  3. Add unique rules to the 'Project-Specific' section"
  else
    echo ""
    echo "${YELLOW}Migration not applied${NC}"
    echo ""
    echo "You can run the migration later with:"
    echo "  ${CYAN}$migrate_script $project_path --apply${NC}"
    echo ""
    echo "Or manually:"
    echo "  1. Add context references at the top of CLAUDE.md:"
    echo "     @context: base"
    echo "     @context: tech/nextjs  (if applicable)"
    echo "     @context: workflow/rtl (if applicable)"
    echo "  2. Remove sections that duplicate shared contexts"
    echo "  3. Keep only project-specific rules"
  fi
  echo ""
}

# Helper: View current configuration
function _ralph_setup_view_config() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local CYAN='\033[0;36m'
  local BOLD='\033[1m'
  local NC='\033[0m'

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│  📋 Current Configuration                                   │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""

  # Show registry
  if [[ -f "$RALPH_REGISTRY_FILE" ]]; then
    local version=$(jq -r '.version // "unknown"' "$RALPH_REGISTRY_FILE" 2>/dev/null)
    echo "${CYAN}Registry:${NC} $RALPH_REGISTRY_FILE (v$version)"
    echo ""

    # Projects - pretty printed
    local project_count=$(jq '.projects | length' "$RALPH_REGISTRY_FILE" 2>/dev/null)
    echo "${BOLD}${YELLOW}═══ Projects ($project_count) ═══${NC}"
    echo ""

    jq -r '.projects | to_entries[] | .key' "$RALPH_REGISTRY_FILE" 2>/dev/null | while read -r project_name; do
      local path=$(jq -r --arg name "$project_name" '.projects[$name].path' "$RALPH_REGISTRY_FILE" 2>/dev/null)
      local mcps=$(jq -r --arg name "$project_name" '.projects[$name].mcps // [] | join(", ")' "$RALPH_REGISTRY_FILE" 2>/dev/null)
      local secrets_count=$(jq -r --arg name "$project_name" '.projects[$name].secrets | keys | length' "$RALPH_REGISTRY_FILE" 2>/dev/null)
      local display_name=$(jq -r --arg name "$project_name" '.projects[$name].displayName // empty' "$RALPH_REGISTRY_FILE" 2>/dev/null)

      echo "  ${BOLD}${GREEN}$project_name${NC}"
      [[ -n "$display_name" ]] && echo "    ${CYAN}Display:${NC} $display_name"
      echo "    ${CYAN}Path:${NC}    $path"
      if [[ -n "$mcps" ]]; then
        echo "    ${CYAN}MCPs:${NC}    $mcps"
      else
        echo "    ${CYAN}MCPs:${NC}    (none)"
      fi
      if [[ "$secrets_count" -gt 0 ]]; then
        local secret_keys=$(jq -r --arg name "$project_name" '.projects[$name].secrets | keys | join(", ")' "$RALPH_REGISTRY_FILE" 2>/dev/null)
        echo "    ${CYAN}Secrets:${NC} $secrets_count configured ($secret_keys)"
      else
        echo "    ${CYAN}Secrets:${NC} (none)"
      fi
      echo ""
    done

    # MCP Definitions
    local mcp_def_count=$(jq '.mcpDefinitions | length' "$RALPH_REGISTRY_FILE" 2>/dev/null || echo "0")
    if [[ "$mcp_def_count" -gt 0 ]]; then
      echo "${BOLD}${YELLOW}═══ MCP Definitions ($mcp_def_count) ═══${NC}"
      echo ""
      jq -r '.mcpDefinitions | to_entries[] | .key' "$RALPH_REGISTRY_FILE" 2>/dev/null | while read -r mcp_name; do
        local cmd=$(jq -r --arg name "$mcp_name" '.mcpDefinitions[$name].command // empty' "$RALPH_REGISTRY_FILE" 2>/dev/null)
        local args=$(jq -r --arg name "$mcp_name" '.mcpDefinitions[$name].args // [] | join(" ")' "$RALPH_REGISTRY_FILE" 2>/dev/null)
        local env_count=$(jq -r --arg name "$mcp_name" '.mcpDefinitions[$name].env // {} | keys | length' "$RALPH_REGISTRY_FILE" 2>/dev/null)

        echo "  ${GREEN}•${NC} ${BOLD}$mcp_name${NC}"
        if [[ -n "$cmd" ]]; then
          echo "      ${CYAN}Command:${NC} $cmd $args"
        fi
        if [[ "$env_count" -gt 0 ]]; then
          echo "      ${CYAN}Env vars:${NC} $env_count"
        fi
      done
      echo ""
    fi

    # Global MCPs
    local global_mcp_count=$(jq '.global.mcps | length' "$RALPH_REGISTRY_FILE" 2>/dev/null || echo "0")
    if [[ "$global_mcp_count" -gt 0 ]]; then
      echo "${BOLD}${YELLOW}═══ Global MCPs ($global_mcp_count) ═══${NC}"
      echo ""
      jq -r '.global.mcps | keys[]' "$RALPH_REGISTRY_FILE" 2>/dev/null | while read -r mcp; do
        echo "  ${GREEN}•${NC} $mcp"
      done
      echo ""
    fi
  else
    echo "${YELLOW}No registry found.${NC}"
    echo "Run 'ralph-setup' and add a project to create one."
    echo ""
  fi

  # Show config.json summary
  if [[ -f "$RALPH_CONFIG_FILE" ]]; then
    echo "${CYAN}Config: $RALPH_CONFIG_FILE${NC}"
    echo ""
    local strategy=$(jq -r '.modelStrategy // "smart"' "$RALPH_CONFIG_FILE" 2>/dev/null)
    local default_model=$(jq -r '.defaultModel // "sonnet"' "$RALPH_CONFIG_FILE" 2>/dev/null)
    local notifications=$(jq -r '.notifications.enabled // false' "$RALPH_CONFIG_FILE" 2>/dev/null)

    echo "  Model Strategy: $strategy"
    echo "  Default Model: $default_model"
    echo "  Notifications: $notifications"
    echo ""
  fi

  # Show user preferences if configured
  if [[ -f "$RALPH_USER_PREFS_FILE" ]]; then
    echo "${CYAN}User Preferences: $RALPH_USER_PREFS_FILE${NC}"
    echo ""
    local ui_mode=$(jq -r '.uiMode // "live"' "$RALPH_USER_PREFS_FILE" 2>/dev/null)
    local pref_model=$(jq -r '.defaultModel // "opus"' "$RALPH_USER_PREFS_FILE" 2>/dev/null)
    local ntfy=$(jq -r '.ntfyTopic // "(not set)"' "$RALPH_USER_PREFS_FILE" 2>/dev/null)
    [[ "$ntfy" == "null" || -z "$ntfy" ]] && ntfy="(not set)"

    echo "  UI Mode: $ui_mode"
    echo "  Default Model: $pref_model"
    echo "  Ntfy Topic: $ntfy"
    echo ""
  fi
}

# ═══════════════════════════════════════════════════════════════════
# Helper: Configure user preferences wizard
# ═══════════════════════════════════════════════════════════════════
function _ralph_setup_user_preferences() {
  local GREEN='\033[0;32m'
  local YELLOW='\033[0;33m'
  local CYAN='\033[0;36m'
  local RED='\033[0;31m'
  local NC='\033[0m'
  local BOLD='\033[1m'

  echo ""
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│  ⚙️  Configure User Preferences                              │"
  echo "└─────────────────────────────────────────────────────────────┘"
  echo ""
  echo "This wizard sets your default Ralph preferences."
  echo "These can be overridden with command-line flags."
  echo ""

  # Load existing preferences if any
  local current_ui_mode="live"
  local current_model="opus"
  local current_ntfy=""

  if [[ -f "$RALPH_USER_PREFS_FILE" ]]; then
    current_ui_mode=$(jq -r '.uiMode // "live"' "$RALPH_USER_PREFS_FILE" 2>/dev/null)
    current_model=$(jq -r '.defaultModel // "opus"' "$RALPH_USER_PREFS_FILE" 2>/dev/null)
    current_ntfy=$(jq -r '.ntfyTopic // ""' "$RALPH_USER_PREFS_FILE" 2>/dev/null)
    [[ "$current_ntfy" == "null" ]] && current_ntfy=""
    echo "${CYAN}Current preferences loaded from:${NC} $RALPH_USER_PREFS_FILE"
    echo ""
  fi

  # ═══════════════════════════════════════════════════════════════
  # 1. UI Mode selection
  # ═══════════════════════════════════════════════════════════════
  echo "${BOLD}1. Default UI Mode${NC}"
  echo ""
  echo "  ${CYAN}live${NC}      - Live dashboard with real-time progress (default)"
  echo "  ${CYAN}iteration${NC} - Show progress at each iteration boundary"
  echo "  ${CYAN}startup${NC}   - Show PRD summary then exit"
  echo ""

  local ui_mode=""
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    ui_mode=$(gum choose --header "Select default UI mode:" \
      "live (recommended)" \
      "iteration" \
      "startup")
    # Extract just the mode name
    ui_mode="${ui_mode%% *}"
  else
    echo "Current: ${YELLOW}$current_ui_mode${NC}"
    echo ""
    echo "  1) live (recommended)"
    echo "  2) iteration"
    echo "  3) startup"
    echo ""
    echo -n "Choose UI mode [1-3, default=1]: "
    read ui_choice
    case "$ui_choice" in
      2) ui_mode="iteration" ;;
      3) ui_mode="startup" ;;
      *) ui_mode="live" ;;
    esac
  fi
  [[ -z "$ui_mode" ]] && ui_mode="$current_ui_mode"

  echo ""
  echo "${GREEN}✓ UI Mode:${NC} $ui_mode"
  echo ""

  # ═══════════════════════════════════════════════════════════════
  # 2. Default Model selection
  # ═══════════════════════════════════════════════════════════════
  echo "${BOLD}2. Default Model${NC}"
  echo ""
  echo "  ${CYAN}opus${NC}   - Most capable, best for complex tasks (default)"
  echo "  ${CYAN}sonnet${NC} - Balanced speed and capability"
  echo "  ${CYAN}haiku${NC}  - Fastest, best for simple tasks"
  echo ""

  local default_model=""
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    default_model=$(gum choose --header "Select default model:" \
      "opus (recommended)" \
      "sonnet" \
      "haiku")
    # Extract just the model name
    default_model="${default_model%% *}"
  else
    echo "Current: ${YELLOW}$current_model${NC}"
    echo ""
    echo "  1) opus (recommended)"
    echo "  2) sonnet"
    echo "  3) haiku"
    echo ""
    echo -n "Choose model [1-3, default=1]: "
    read model_choice
    case "$model_choice" in
      2) default_model="sonnet" ;;
      3) default_model="haiku" ;;
      *) default_model="opus" ;;
    esac
  fi
  [[ -z "$default_model" ]] && default_model="$current_model"

  echo ""
  echo "${GREEN}✓ Default Model:${NC} $default_model"
  echo ""

  # ═══════════════════════════════════════════════════════════════
  # 3. Ntfy Topic (optional)
  # ═══════════════════════════════════════════════════════════════
  echo "${BOLD}3. Ntfy Notifications (optional)${NC}"
  echo ""
  echo "  Ntfy.sh is a free push notification service."
  echo "  If configured, Ralph will send notifications when iterations complete."
  echo "  Leave blank to disable notifications."
  echo ""

  local ntfy_topic=""
  if [[ $RALPH_HAS_GUM -eq 0 ]]; then
    local ntfy_placeholder="your-topic-name (or leave empty)"
    [[ -n "$current_ntfy" ]] && ntfy_placeholder="$current_ntfy"
    ntfy_topic=$(gum input --placeholder "$ntfy_placeholder" --value "$current_ntfy" --header "Ntfy topic (optional):")
  else
    [[ -n "$current_ntfy" ]] && echo "Current: ${YELLOW}$current_ntfy${NC}"
    echo ""
    echo -n "Ntfy topic (leave blank to disable): "
    read ntfy_topic
    [[ -z "$ntfy_topic" ]] && ntfy_topic="$current_ntfy"
  fi

  echo ""
  if [[ -n "$ntfy_topic" ]]; then
    echo "${GREEN}✓ Ntfy Topic:${NC} $ntfy_topic"
  else
    echo "${YELLOW}✓ Ntfy:${NC} disabled"
  fi
  echo ""

  # ═══════════════════════════════════════════════════════════════
  # Save preferences
  # ═══════════════════════════════════════════════════════════════
  echo "${BOLD}Saving preferences...${NC}"
  echo ""

  # Ensure config directory exists
  mkdir -p "$(dirname "$RALPH_USER_PREFS_FILE")"

  # Build JSON object
  local prefs_json
  if [[ -n "$ntfy_topic" ]]; then
    prefs_json=$(jq -n \
      --arg uiMode "$ui_mode" \
      --arg defaultModel "$default_model" \
      --arg ntfyTopic "$ntfy_topic" \
      '{
        uiMode: $uiMode,
        defaultModel: $defaultModel,
        ntfyTopic: $ntfyTopic,
        updatedAt: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
      }')
  else
    prefs_json=$(jq -n \
      --arg uiMode "$ui_mode" \
      --arg defaultModel "$default_model" \
      '{
        uiMode: $uiMode,
        defaultModel: $defaultModel,
        updatedAt: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
      }')
  fi

  # Write to file
  echo "$prefs_json" > "$RALPH_USER_PREFS_FILE"

  echo "${GREEN}✓ Preferences saved to:${NC} $RALPH_USER_PREFS_FILE"
  echo ""
  echo "Your preferences:"
  echo "  UI Mode: $ui_mode"
  echo "  Default Model: $default_model"
  if [[ -n "$ntfy_topic" ]]; then
    echo "  Ntfy Topic: $ntfy_topic"
  else
    echo "  Ntfy: disabled"
  fi
  echo ""
  echo "To change these settings later, run:"
  echo "  ${CYAN}ralph-setup --configure${NC}"
  echo ""
}

# ═══════════════════════════════════════════════════════════════════
# Helper: Load user preferences and apply defaults
# ═══════════════════════════════════════════════════════════════════
# Call this at startup to read user-prefs.json and set environment vars
function _ralph_load_user_preferences() {
  if [[ ! -f "$RALPH_USER_PREFS_FILE" ]]; then
    return 0
  fi

  # Read preferences
  local ui_mode=$(jq -r '.uiMode // empty' "$RALPH_USER_PREFS_FILE" 2>/dev/null)
  local default_model=$(jq -r '.defaultModel // empty' "$RALPH_USER_PREFS_FILE" 2>/dev/null)
  local ntfy_topic=$(jq -r '.ntfyTopic // empty' "$RALPH_USER_PREFS_FILE" 2>/dev/null)

  # Apply defaults (only if not already set)
  [[ -n "$ui_mode" && -z "$RALPH_UI_MODE" ]] && export RALPH_UI_MODE="$ui_mode"
  [[ -n "$default_model" && -z "$RALPH_DEFAULT_MODEL" ]] && export RALPH_DEFAULT_MODEL="$default_model"
  [[ -n "$ntfy_topic" && "$ntfy_topic" != "null" && -z "$RALPH_NTFY_TOPIC" ]] && export RALPH_NTFY_TOPIC="$ntfy_topic"
}

# Load user preferences when this file is sourced
_ralph_load_user_preferences
