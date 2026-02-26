#!/bin/bash
# Golem Status - Show all running services and ports

echo "🤖 GOLEM STATUS"
echo "==============="
echo ""

check_port() {
  local port=$1
  local name=$2
  local pid=$(lsof -ti :$port 2>/dev/null | head -1)
  if [ -n "$pid" ]; then
    echo "  ✅ :$port - $name (PID $pid)"
  else
    echo "  ⬚ :$port - $name (not running)"
  fi
}

echo "📡 PORTS:"
check_port 3847 "telegram-bot (notifications)"
check_port 11434 "ollama"

echo ""
echo "🔄 BUN PROCESSES:"
pgrep -fl "bun.*telegram-bot" | head -5 || echo "  (none)"

echo ""
echo "📅 LAUNCHD SERVICES:"
launchctl list 2>/dev/null | grep golem | while read status pid name; do
  if [ "$status" = "-" ]; then
    echo "  ⬚ $name"
  else
    echo "  ✅ $name (exit $status)"
  fi
done

echo ""
echo "🧹 CLEANUP: pkill -9 -f 'bun.*telegram' && launchctl unload ~/Library/LaunchAgents/com.golemszikaron.telegram.plist"
