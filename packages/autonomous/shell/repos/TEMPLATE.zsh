# TEMPLATE.zsh — Copy this to create a new repo config
# File: shell/repos/<your-repo>.zsh
#
# After creating, the repo will be auto-loaded by init.zsh.
# Run `golems-sessions` to verify registration.
#
# Secrets: Use `op read 'op://vault/item/field'` for any tokens.
# Never hardcode API keys — they go in 1Password.

# Optional: Custom MCP setup function
# _repoclaude_myrepo_mcps() {
#   local mode="$1"  # "light" or "full"
#   if [[ "$mode" == "full" ]]; then
#     claude mcp add-json convex '{"command": "npx", "args": ["-y", "@anthropic-ai/claude-code-mcp-server-convex@latest"]}'
#   fi
# }

_repoclaude_register \
  "myrepo" \
  "myrepoClaude" \
  "My Repo" \
  "🔧" \
  "$HOME/gits/myrepo" \
  "etans-myrepoClaude" \
  0 \
  false \
  "" \
  ""

# Arguments to _repoclaude_register:
#   1. key           — unique identifier (used for ntfy config, etc.)
#   2. func_name     — the shell function name users will type
#   3. display_name  — human-readable name (shown in banner + tab title)
#   4. emoji         — shown in tab title and banner
#   5. cwd           — working directory to cd into
#   6. ntfy_topic    — ntfy.sh topic for notifications
#   7. ttyd_port     — port for web mode (0 = no web mode)
#   8. has_mcp_modes — "true" to enable -n/-l/-m flags for MCP management
#   9. worktree_detect — grep pattern in CLAUDE.md to detect git worktrees (optional)
#  10. extra_mcp_setup — function name for repo-specific MCP setup (optional)
