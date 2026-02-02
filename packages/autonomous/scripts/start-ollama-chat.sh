#!/bin/bash
# OllamaChat Bot Launcher
# Run with: ./scripts/start-ollama-chat.sh

cd "$(dirname "$0")/.." || exit 1

# Load environment
if [[ -f ~/.golems-zikaron/.env ]]; then
  set -a
  source ~/.golems-zikaron/.env
  set +a
fi

echo "Starting OllamaChat bot..."
exec bun run src/ollama-chat-bot.ts
