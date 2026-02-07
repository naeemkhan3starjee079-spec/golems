#!/bin/zsh
# repoclaude-web.zsh — Web mode for repoClaude (ttyd + Cloudflare tunnel)
# Sourced by ralph-registry.zsh when --web flag is used

_repoclaude_web_mode() {
  local key="$1"
  local display_name="$2"
  local ttyd_port="$3"
  shift 3
  local claude_args=("$@")

  local session_name="${key}-claude"

  # Cleanup existing
  echo "Cleaning up any existing sessions..."
  if tmux has-session -t "$session_name" 2>/dev/null; then
    echo "  • Killing tmux session: $session_name"
    tmux kill-session -t "$session_name" 2>/dev/null
  fi
  [[ -f "/tmp/${session_name}-ttyd.pid" ]] && kill $(cat "/tmp/${session_name}-ttyd.pid") 2>/dev/null && rm "/tmp/${session_name}-ttyd.pid"
  [[ -f "/tmp/${session_name}-cloudflare.pid" ]] && kill $(cat "/tmp/${session_name}-cloudflare.pid") 2>/dev/null && rm "/tmp/${session_name}-cloudflare.pid"
  pkill -f "ttyd.*${session_name}" 2>/dev/null
  pkill -f "cloudflared.*${ttyd_port}" 2>/dev/null
  sleep 1
  echo "  ✓ Cleanup complete"
  echo ""

  # Create tmux session
  echo "Creating tmux session: $session_name"
  tmux new-session -d -s "$session_name"
  tmux set-option -t "$session_name" mouse on
  tmux set-window-option -t "$session_name" aggressive-resize on

  # Start Claude in tmux
  echo "Starting Claude Code in tmux session..."
  local claude_cmd="claude"
  for arg in "${claude_args[@]}"; do
    claude_cmd="$claude_cmd $arg"
  done
  tmux send-keys -t "$session_name" "$claude_cmd" Enter
  sleep 3

  # Start ttyd
  echo "Starting ttyd web terminal on port $ttyd_port"
  ttyd -W -t fontSize=16 -p "$ttyd_port" tmux attach -t "$session_name" > "/tmp/${session_name}-ttyd.log" 2>&1 &
  echo "$!" > "/tmp/${session_name}-ttyd.pid"

  # Start cloudflare tunnel
  echo "Starting Cloudflare tunnel..."
  cloudflared tunnel --url "http://localhost:$ttyd_port" > "/tmp/${session_name}-cloudflare.log" 2>&1 &
  echo "$!" > "/tmp/${session_name}-cloudflare.pid"

  echo "Waiting for services to start..."
  sleep 8

  local remote_url=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' "/tmp/${session_name}-cloudflare.log" | head -1)
  echo "$remote_url" > "/tmp/${session_name}-url.txt"

  echo ""
  echo "=========================================="
  echo "✓ Remote access enabled!"
  echo "=========================================="
  echo ""
  echo "iPhone URL: $remote_url"
  echo ""
  echo "📱 iPhone: Open Safari → paste URL → tap terminal → type"
  echo "🖥  Local:  tmux attach -t $session_name"
  echo ""
  echo "Press ENTER to attach to session..."
  read

  tmux set-option -t "$session_name" status-right "#[fg=green]📱 $remote_url" 2>/dev/null
  tmux attach -t "$session_name"
}
