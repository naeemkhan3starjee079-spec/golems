#!/bin/bash
# sync-plans-to-obsidian.sh — Copy Claude plans to Obsidian vault
# Run: bash scripts/sync-plans-to-obsidian.sh
# Can be added to cron or run manually

set -euo pipefail

VAULT="/Users/etanheyman/Library/Mobile Documents/iCloud~md~obsidian/Documents/personal"
DEST="$VAULT/Golems"
SOURCE="$HOME/.claude/plans"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create destination if needed
mkdir -p "$DEST"

# Copy all plan files
count=0
for f in "$SOURCE"/*.md; do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  cp "$f" "$DEST/$name"
  echo -e "  ${GREEN}✓${NC} $name"
  count=$((count + 1))
done

# Also sync docs/plan/ if it exists
DOCS_PLAN="$(dirname "$0")/../docs/plan"
if [ -d "$DOCS_PLAN" ]; then
  mkdir -p "$DEST/docs-plan"
  for f in "$DOCS_PLAN"/*.md "$DOCS_PLAN"/**/*.md; do
    [ -f "$f" ] || continue
    rel=${f#"$DOCS_PLAN/"}
    mkdir -p "$DEST/docs-plan/$(dirname "$rel")"
    cp "$f" "$DEST/docs-plan/$rel"
    echo -e "  ${GREEN}✓${NC} docs-plan/$rel"
    count=$((count + 1))
  done
fi

echo ""
echo -e "${GREEN}Synced $count files to Obsidian${NC}"
echo -e "  ${YELLOW}Vault:${NC} $DEST"
