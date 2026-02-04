#!/bin/bash
# Record a mistake to ~/.golems-zikaron/mistakes/raw/

set -e

MISTAKES_DIR="$HOME/.golems-zikaron/mistakes/raw"
mkdir -p "$MISTAKES_DIR"

# Get description from args
DESCRIPTION="$*"
if [ -z "$DESCRIPTION" ]; then
  echo "Usage: record.sh <mistake description>"
  exit 1
fi

# Generate ID and timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
ID="mistake-$(date +%s%3N)"
FILENAME="$(date +%Y-%m-%d-%H%M%S).json"

# Try to get context
PROJECT=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")
SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"

# Create record using jq for safe JSON encoding (prevents injection)
jq -n \
  --arg id "$ID" \
  --arg ts "$TIMESTAMP" \
  --arg desc "$DESCRIPTION" \
  --arg proj "$PROJECT" \
  --arg cwd "$(pwd)" \
  --arg sess "$SESSION_ID" \
  '{id: $id, timestamp: $ts, description: $desc, context: {project: $proj, cwd: $cwd, session: $sess}}' \
  > "$MISTAKES_DIR/$FILENAME"

echo "Recorded: $DESCRIPTION"
echo "File: $MISTAKES_DIR/$FILENAME"

# Count total mistakes
COUNT=$(ls -1 "$MISTAKES_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "Total mistakes recorded: $COUNT"
