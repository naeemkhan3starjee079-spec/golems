#!/usr/bin/env bash
#
# Install and configure Obsidian Claude Code MCP plugin
#
# This script:
# 1. Auto-detects Obsidian vault locations
# 2. Guides user through community plugin installation
# 3. Helps configure the MCP port
# 4. Stores configuration in 1Password
# 5. Generates Claude settings.json MCP config
#
# Usage: ./scripts/install-obsidian-mcp.sh [--port PORT] [--vault PATH]
#

set -e

# Check required dependencies
HAS_JQ=false
if command -v jq &>/dev/null; then
  HAS_JQ=true
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default values
DEFAULT_PORT=22360
MCP_PORT=${DEFAULT_PORT}
SELECTED_VAULT=""
VAULT_NAME=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      MCP_PORT="$2"
      shift 2
      ;;
    --vault)
      SELECTED_VAULT="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --port PORT    Set MCP server port (default: 22360)"
      echo "  --vault PATH   Specify vault path directly"
      echo "  --help         Show this help message"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}  📓 Obsidian Claude Code MCP Setup${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Check if Obsidian is installed
echo "${YELLOW}Step 1: Checking Obsidian installation...${NC}"
OBSIDIAN_APP="/Applications/Obsidian.app"
if [[ -d "$OBSIDIAN_APP" ]]; then
  echo "  ${GREEN}✓${NC} Obsidian found at $OBSIDIAN_APP"
else
  echo "  ${YELLOW}⚠${NC} Obsidian not found in /Applications"
  echo "    Please install Obsidian from https://obsidian.md"
  echo ""
  read -rp "Continue anyway? (y/N): " continue_choice
  [[ "$continue_choice" != [Yy]* ]] && exit 1
fi

# Step 2: Auto-detect Obsidian vaults
echo ""
echo "${YELLOW}Step 2: Detecting Obsidian vaults...${NC}"

# Common vault locations
OBSIDIAN_CONFIG="$HOME/Library/Application Support/obsidian/obsidian.json"
declare -a VAULTS=()

if [[ -f "$OBSIDIAN_CONFIG" ]]; then
  # Parse vault paths from Obsidian's config
  if command -v jq &>/dev/null; then
    while IFS= read -r vault_path; do
      if [[ -d "$vault_path" ]]; then
        VAULTS+=("$vault_path")
      fi
    done < <(jq -r '.vaults | to_entries[] | .value.path // empty' "$OBSIDIAN_CONFIG" 2>/dev/null)
  fi
fi

# Also check common locations
COMMON_LOCATIONS=(
  "$HOME/Documents/Obsidian"
  "$HOME/Obsidian"
  "$HOME/Desktop/Obsidian"
  "$HOME/Documents"
)

for loc in "${COMMON_LOCATIONS[@]}"; do
  if [[ -d "$loc" ]]; then
    # Look for .obsidian directories which indicate vault roots
    while IFS= read -r obsidian_dir; do
      vault_dir="${obsidian_dir%/.obsidian}"
      # Check if not already in VAULTS
      found=false
      for v in "${VAULTS[@]}"; do
        if [[ "$v" == "$vault_dir" ]]; then
          found=true
          break
        fi
      done
      if [[ "$found" == "false" ]] && [[ -d "$vault_dir" ]]; then
        VAULTS+=("$vault_dir")
      fi
    done < <(find "$loc" -maxdepth 2 -type d -name ".obsidian" 2>/dev/null)
  fi
done

if [[ ${#VAULTS[@]} -eq 0 ]]; then
  echo "  ${YELLOW}⚠${NC} No Obsidian vaults found automatically"
  echo ""
  read -rp "Enter vault path manually: " manual_vault
  if [[ -d "$manual_vault" ]]; then
    VAULTS+=("$manual_vault")
  else
    echo "  ${RED}✗${NC} Path does not exist: $manual_vault"
    exit 1
  fi
else
  echo "  ${GREEN}✓${NC} Found ${#VAULTS[@]} vault(s):"
  for v in "${VAULTS[@]}"; do
    echo "    • $v"
  done
fi

# Step 3: Select vault
echo ""
echo "${YELLOW}Step 3: Select vault for MCP setup...${NC}"

if [[ -n "$SELECTED_VAULT" ]]; then
  # Use provided vault
  if [[ ! -d "$SELECTED_VAULT" ]]; then
    echo "  ${RED}✗${NC} Provided vault path does not exist: $SELECTED_VAULT"
    exit 1
  fi
  VAULT_NAME=$(basename "$SELECTED_VAULT")
  echo "  Using provided vault: $SELECTED_VAULT"
elif [[ ${#VAULTS[@]} -eq 1 ]]; then
  # Only one vault, use it
  SELECTED_VAULT="${VAULTS[0]}"
  VAULT_NAME=$(basename "$SELECTED_VAULT")
  echo "  Using vault: $SELECTED_VAULT"
else
  # Multiple vaults - let user choose
  echo "  Multiple vaults found. Please select one:"
  echo ""
  i=1
  for v in "${VAULTS[@]}"; do
    echo "    $i) $(basename "$v") - $v"
    ((i++))
  done
  echo ""
  read -rp "Enter vault number [1-${#VAULTS[@]}]: " vault_num

  if [[ "$vault_num" =~ ^[0-9]+$ ]] && [[ "$vault_num" -ge 1 ]] && [[ "$vault_num" -le ${#VAULTS[@]} ]]; then
    SELECTED_VAULT="${VAULTS[$((vault_num-1))]}"
    VAULT_NAME=$(basename "$SELECTED_VAULT")
    echo "  ${GREEN}✓${NC} Selected: $SELECTED_VAULT"
  else
    echo "  ${RED}✗${NC} Invalid selection"
    exit 1
  fi
fi

# Step 4: Check if plugin is installed
echo ""
echo "${YELLOW}Step 4: Checking for Claude Code MCP plugin...${NC}"

PLUGIN_DIR="$SELECTED_VAULT/.obsidian/plugins/claude-code-mcp"

if [[ -d "$PLUGIN_DIR" ]]; then
  echo "  ${GREEN}✓${NC} Plugin already installed"
else
  echo "  ${YELLOW}⚠${NC} Plugin not installed"
  echo ""
  echo "  ${CYAN}Installation steps:${NC}"
  echo "  1. Open Obsidian and navigate to Settings → Community plugins"
  echo "  2. Click 'Browse' and search for 'Claude Code'"
  echo "  3. Find 'Claude Code MCP' by iansinnott and click 'Install'"
  echo "  4. Enable the plugin"
  echo ""
  read -rp "Press Enter after installing the plugin... "

  if [[ ! -d "$PLUGIN_DIR" ]]; then
    echo "  ${YELLOW}⚠${NC} Plugin directory still not found"
    echo "    The plugin might be named differently. Checking alternatives..."

    # Check for alternative plugin names
    ALT_PLUGINS=("obsidian-claude-code-mcp" "claude-code" "claude-mcp")
    for alt in "${ALT_PLUGINS[@]}"; do
      if [[ -d "$SELECTED_VAULT/.obsidian/plugins/$alt" ]]; then
        PLUGIN_DIR="$SELECTED_VAULT/.obsidian/plugins/$alt"
        echo "  ${GREEN}✓${NC} Found plugin at: $PLUGIN_DIR"
        break
      fi
    done

    if [[ ! -d "$PLUGIN_DIR" ]]; then
      echo "  ${YELLOW}⚠${NC} Continuing without verifying plugin installation"
    fi
  fi
fi

# Step 5: Configure MCP port
echo ""
echo "${YELLOW}Step 5: Configure MCP server port...${NC}"
echo "  Default port: $DEFAULT_PORT"
echo "  Each vault needs a unique port if running multiple instances."
echo ""

if [[ "$MCP_PORT" == "$DEFAULT_PORT" ]]; then
  read -rp "Enter MCP port (or press Enter for $DEFAULT_PORT): " port_input
  if [[ -n "$port_input" ]]; then
    if [[ "$port_input" =~ ^[0-9]+$ ]] && [[ "$port_input" -ge 1024 ]] && [[ "$port_input" -le 65535 ]]; then
      MCP_PORT="$port_input"
    else
      echo "  ${YELLOW}⚠${NC} Invalid port, using default: $DEFAULT_PORT"
      MCP_PORT=$DEFAULT_PORT
    fi
  fi
fi

echo "  ${GREEN}✓${NC} Using port: $MCP_PORT"

# Construct MCP URL
MCP_URL="http://localhost:$MCP_PORT/sse"
WEBSOCKET_URL="ws://localhost:$MCP_PORT"

# Step 6: Store in 1Password (optional)
echo ""
echo "${YELLOW}Step 6: 1Password integration...${NC}"

store_op_confirmed=false
if command -v op &>/dev/null; then
  echo "  1Password CLI detected"
  echo ""
  read -rp "Store Obsidian MCP URL in 1Password? (Y/n): " store_op

  # Default to yes (Y/n prompt), only skip if explicitly no
  if [[ "$store_op" != [Nn]* ]]; then
    store_op_confirmed=true
    echo "  Creating/updating 1Password item..."

    # Create or update item
    if op item get "Obsidian-MCP" --vault "Private" &>/dev/null 2>&1; then
      # Item exists, update it
      op item edit "Obsidian-MCP" --vault "Private" \
        "url=$MCP_URL" \
        "websocket=$WEBSOCKET_URL" \
        "vault_name=$VAULT_NAME" \
        "port=$MCP_PORT" &>/dev/null && \
        echo "  ${GREEN}✓${NC} Updated 1Password item: Obsidian-MCP" || \
        echo "  ${YELLOW}⚠${NC} Failed to update 1Password item"
    else
      # Create new item
      op item create --category "API Credential" --vault "Private" --title "Obsidian-MCP" \
        "url=$MCP_URL" \
        "websocket=$WEBSOCKET_URL" \
        "vault_name=$VAULT_NAME" \
        "port=$MCP_PORT" &>/dev/null && \
        echo "  ${GREEN}✓${NC} Created 1Password item: Obsidian-MCP" || \
        echo "  ${YELLOW}⚠${NC} Failed to create 1Password item"
    fi

    echo ""
    echo "  1Password reference: op://Private/Obsidian-MCP/url"
  else
    echo "  ${YELLOW}⚠${NC} Skipping 1Password integration"
  fi
else
  echo "  ${YELLOW}⚠${NC} 1Password CLI not installed"
  echo "    Install with: brew install 1password-cli"
fi

# Step 7: Generate Claude settings.json config
echo ""
echo "${YELLOW}Step 7: Claude MCP configuration...${NC}"

# Note: Settings file location varies by installation:
# - Global: $HOME/.config/claude-code/settings.json
# - Project: .claude/settings.json

echo "  MCP configuration for Claude Code:"
echo ""
echo "  ${CYAN}Add to your settings.json (mcpServers section):${NC}"
echo ""

# Generate config with 1Password reference if user opted in
# Use jq for proper JSON escaping, with heredoc fallback if jq unavailable
if [[ "$HAS_JQ" == "true" ]]; then
  if [[ "$store_op_confirmed" == "true" ]]; then
    jq -n --arg name "$VAULT_NAME" '{
      mcpServers: {
        ("obsidian-" + $name): {
          command: "npx",
          args: ["mcp-remote", "op://Private/Obsidian-MCP/url"]
        }
      }
    }'
  else
    jq -n --arg name "$VAULT_NAME" --arg url "$MCP_URL" '{
      mcpServers: {
        ("obsidian-" + $name): {
          command: "npx",
          args: ["mcp-remote", $url]
        }
      }
    }'
  fi
else
  # Fallback: simple heredoc (assumes vault names without special JSON chars)
  if [[ "$store_op_confirmed" == "true" ]]; then
    cat <<EOF
{
  "mcpServers": {
    "obsidian-$VAULT_NAME": {
      "command": "npx",
      "args": ["mcp-remote", "op://Private/Obsidian-MCP/url"]
    }
  }
}
EOF
  else
    cat <<EOF
{
  "mcpServers": {
    "obsidian-$VAULT_NAME": {
      "command": "npx",
      "args": ["mcp-remote", "$MCP_URL"]
    }
  }
}
EOF
  fi
fi

echo ""
echo "  ${CYAN}For WebSocket connection (Claude Code CLI):${NC}"
echo "  The Claude Code CLI auto-discovers via /ide command."
echo "  Use: ${YELLOW}claude${NC} → ${YELLOW}/ide${NC} → select your vault"
echo ""

# Step 8: Plugin settings reminder
echo "${YELLOW}Step 8: Plugin settings...${NC}"
echo ""
echo "  Make sure to configure the plugin in Obsidian:"
echo "  1. Open Obsidian Settings → Community plugins → Claude Code"
echo "  2. Set HTTP Server Port to: ${GREEN}$MCP_PORT${NC}"
echo "  3. Enable the server (toggle 'Server Enabled')"
echo ""

# Step 9: Test connection
echo "${YELLOW}Step 9: Testing connection...${NC}"
echo ""
echo "  Attempting to connect to MCP server at $MCP_URL..."
echo ""

# Try to connect (with timeout)
if curl -s --connect-timeout 2 "$MCP_URL" &>/dev/null; then
  echo "  ${GREEN}✓${NC} MCP server is responding!"
else
  echo "  ${YELLOW}⚠${NC} Could not connect to MCP server"
  echo "    Make sure:"
  echo "    1. Obsidian is running"
  echo "    2. Claude Code MCP plugin is enabled"
  echo "    3. Server is enabled in plugin settings"
  echo "    4. Port $MCP_PORT is not blocked by firewall"
fi

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}  ✓ Obsidian MCP setup complete!${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  ${CYAN}Summary:${NC}"
echo "  • Vault: $VAULT_NAME"
echo "  • Path: $SELECTED_VAULT"
echo "  • MCP URL: $MCP_URL"
echo "  • WebSocket: $WEBSOCKET_URL"
if command -v op &>/dev/null && [[ "$store_op" != [Nn]* ]]; then
  echo "  • 1Password: op://Private/Obsidian-MCP/url"
fi
echo ""
echo "  ${CYAN}Next steps:${NC}"
echo "  1. Ensure Obsidian is running with the plugin enabled"
echo "  2. Run 'claude' and use '/ide' to connect"
echo "  3. Or add the MCP config to your settings.json"
echo ""
