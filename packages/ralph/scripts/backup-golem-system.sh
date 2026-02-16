#!/bin/bash
# Backup Golem System State
# Created: 2026-02-01, Updated: 2026-02-16 (added Zikaron DB + JSONL backup)
# Purpose: Full system backup to iCloud including irreplaceable data

set -e

BACKUP_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/golem-backup-$(date +%Y-%m-%d-%H%M)"
ZIKARON_DB="$HOME/.local/share/zikaron/zikaron.db"
JSONL_DIR="$HOME/.claude/projects"
mkdir -p "$BACKUP_DIR"

echo "=== Golem System Backup ==="
echo "Destination: $BACKUP_DIR"
echo ""

# 0. Zikaron DB (WAL-safe backup using sqlite3 .backup)
echo "[0/9] Backing up Zikaron DB (WAL-safe)..."
if [ -f "$ZIKARON_DB" ]; then
  mkdir -p "$BACKUP_DIR/zikaron"
  sqlite3 "$ZIKARON_DB" ".backup '$BACKUP_DIR/zikaron/zikaron.db'"
  DB_SIZE=$(du -sh "$BACKUP_DIR/zikaron/zikaron.db" | cut -f1)
  echo "  -> $DB_SIZE (WAL-safe copy)"
else
  echo "  -> WARN: $ZIKARON_DB not found, skipping"
fi

# 0b. Claude Code session JSONL files
echo "[0b/9] Backing up Claude Code sessions..."
if [ -d "$JSONL_DIR" ]; then
  mkdir -p "$BACKUP_DIR/claude-sessions"
  # Copy all JSONL files preserving project folder structure (subshell to avoid cd side effects)
  (
    cd "$JSONL_DIR"
    find . -name "*.jsonl" -exec sh -c 'mkdir -p "'"$BACKUP_DIR/claude-sessions"'/$(dirname "$1")" && cp "$1" "'"$BACKUP_DIR/claude-sessions"'/$1"' _ {} \;
  )
  JSONL_COUNT=$(find "$BACKUP_DIR/claude-sessions" -name "*.jsonl" | wc -l | tr -d ' ')
  JSONL_SIZE=$(du -sh "$BACKUP_DIR/claude-sessions" | cut -f1)
  echo "  -> $JSONL_COUNT files, $JSONL_SIZE"
else
  echo "  -> WARN: $JSONL_DIR not found, skipping"
fi

# 1. LaunchAgents
echo "[1/9] Backing up LaunchAgents..."
mkdir -p "$BACKUP_DIR/LaunchAgents"
cp ~/Library/LaunchAgents/com.golemszikaron.* "$BACKUP_DIR/LaunchAgents/" 2>/dev/null || true
cp ~/Library/LaunchAgents/com.zikaron.* "$BACKUP_DIR/LaunchAgents/" 2>/dev/null || true

# 2. ~/.config directories
echo "[2/9] Backing up ~/.config dirs..."
mkdir -p "$BACKUP_DIR/config"
cp -r ~/.config/ralphtools "$BACKUP_DIR/config/" 2>/dev/null || true
cp -r ~/.config/claude-golem "$BACKUP_DIR/config/" 2>/dev/null || true
cp -r ~/.config/opencode "$BACKUP_DIR/config/" 2>/dev/null || true
cp -r ~/.config/agents "$BACKUP_DIR/config/" 2>/dev/null || true

# 3. ~/.claude (excluding large dirs)
echo "[3/9] Backing up ~/.claude..."
mkdir -p "$BACKUP_DIR/dot-claude"
cp ~/.claude/*.md "$BACKUP_DIR/dot-claude/" 2>/dev/null || true
cp ~/.claude/*.json "$BACKUP_DIR/dot-claude/" 2>/dev/null || true
cp -r ~/.claude/skills "$BACKUP_DIR/dot-claude/" 2>/dev/null || true
cp -r ~/.claude/contexts "$BACKUP_DIR/dot-claude/" 2>/dev/null || true
cp -r ~/.claude/hooks "$BACKUP_DIR/dot-claude/" 2>/dev/null || true
cp -r ~/.claude/learnings "$BACKUP_DIR/dot-claude/" 2>/dev/null || true

# 4. ~/.agents
echo "[4/9] Backing up ~/.agents..."
cp -r ~/.agents "$BACKUP_DIR/dot-agents" 2>/dev/null || true

# 5. ~/.golems-zikaron state
echo "[5/9] Backing up ~/.golems-zikaron..."
cp -r ~/.golems-zikaron "$BACKUP_DIR/dot-golems-zikaron" 2>/dev/null || true

# 6. Document all symlinks
echo "[6/9] Documenting symlinks..."
cat > "$BACKUP_DIR/symlinks.md" << 'EOF'
# Symlinks Snapshot

## ~/.config symlinks
EOF
find ~/.config -type l -exec ls -la {} \; 2>/dev/null >> "$BACKUP_DIR/symlinks.md"

cat >> "$BACKUP_DIR/symlinks.md" << 'EOF'

## ~/.claude symlinks
EOF
find ~/.claude -type l -exec ls -la {} \; 2>/dev/null >> "$BACKUP_DIR/symlinks.md"

# 7. Generate manifest
echo "[7/9] Generating manifest..."
cat > "$BACKUP_DIR/manifest.md" << EOF
# Golem System Backup Manifest

**Created:** $(date)
**By:** backup-golem-system.sh
**Purpose:** Pre-consolidation snapshot

## What Was Backed Up

| Source | Destination |
|--------|-------------|
| ~/.local/share/zikaron/zikaron.db | zikaron/ (WAL-safe sqlite3 .backup) |
| ~/.claude/projects/**/*.jsonl | claude-sessions/ (913+ files) |
| ~/Library/LaunchAgents/com.golemszikaron.* | LaunchAgents/ |
| ~/Library/LaunchAgents/com.zikaron.* | LaunchAgents/ |
| ~/.config/ralphtools | config/ralphtools/ |
| ~/.config/claude-golem | config/claude-golem/ |
| ~/.config/opencode | config/opencode/ |
| ~/.config/agents | config/agents/ |
| ~/.claude/{*.md,*.json,skills,contexts,hooks,learnings} | dot-claude/ |
| ~/.agents | dot-agents/ |
| ~/.golems-zikaron | dot-golems-zikaron/ |

## Active LaunchAgents at Backup Time

\`\`\`
$(launchctl list 2>/dev/null | grep -E "golem|zikaron")
\`\`\`

## Symlink Summary

See symlinks.md for full list.

## Repos Involved

- ~/Gits/claude-golem (Ralph)
- ~/Gits/zikaron (Memory layer)
- ~/Gits/golems-zikaron (Telegram bot)

## To Restore

1. Stop all LaunchAgents: \`launchctl unload ~/Library/LaunchAgents/com.golemszikaron.*\`
2. Copy files back to original locations
3. Reload LaunchAgents: \`launchctl load ~/Library/LaunchAgents/com.golemszikaron.*\`

EOF

echo ""
echo "=== Backup Complete ==="
echo "Location: $BACKUP_DIR"
echo ""
echo "Contents:"
ls -la "$BACKUP_DIR"
