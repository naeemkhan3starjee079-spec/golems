#!/bin/bash
# Default script - runs when skill is loaded with arguments
# Usage: /learn-mistake <description>

SCRIPT_DIR="$(dirname "$0")"

if [ $# -eq 0 ]; then
  echo "Usage: /learn-mistake <mistake description>"
  echo ""
  echo "Examples:"
  echo "  /learn-mistake forgot to check RTL flex direction"
  echo "  /learn-mistake ran tests after commit instead of before"
  echo ""
  echo "Commands:"
  echo "  /learn-mistake <desc>     Record a mistake"
  echo "  /learn-mistake --list     Show recent mistakes"
  echo "  /learn-mistake --top      Show top patterns (requires aggregation)"
  exit 0
fi

case "$1" in
  --list)
    echo "=== Recent Mistakes ==="
    ls -t ~/.golems-zikaron/mistakes/raw/*.json 2>/dev/null | head -10 | while read f; do
      desc=$(jq -r '.description' "$f" 2>/dev/null)
      ts=$(jq -r '.timestamp' "$f" 2>/dev/null | cut -d'T' -f1)
      echo "[$ts] $desc"
    done
    ;;
  --top)
    if [ -f ~/.golems-zikaron/mistakes/clusters.json ]; then
      echo "=== Top Mistake Patterns ==="
      jq -r '.clusters[:5][] | "[\(.count)x] \(.representative)"' ~/.golems-zikaron/mistakes/clusters.json
    else
      echo "No clusters yet. Run aggregation first:"
      echo "  bun ~/.claude/commands/golem-powers/learn-mistake/scripts/aggregate.ts"
    fi
    ;;
  *)
    # Record the mistake
    "$SCRIPT_DIR/record.sh" "$@"
    ;;
esac
