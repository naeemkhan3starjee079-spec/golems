#!/bin/bash
# Backup Golem System State - Pre-Consolidation Snapshot
# Created: 2026-02-01
# Purpose: Document and backup current system state before consolidation

set -e

BACKUP_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/golem-backup-$(date +%Y-%m-%d-%H%M)"
mkdir -p "$BACKUP_DIR"

echo "=== Golem System Backup ==="
echo "Destination: $BACKUP_DIR"
echo ""

# 1. LaunchAgents
echo "[1/7] Backing up LaunchAgents..."
mkdir -p "$BACKUP_DIR/LaunchAgents"
cp ~/Library/LaunchAgents/com.golemszikaron.* "$BACKUP_DIR/LaunchAgents/" 2>/dev/null || true
cp ~/Library/LaunchAgents/com.zikaron.* "$BACKUP_DIR/LaunchAgents/" 2>/dev/null || true

# 2. ~/.config directories
echo "[2/7] Backing up ~/.config dirs..."
mkdir -p "$BACKUP_DIR/config"
cp -r ~/.config/ralphtools "$BACKUP_DIR/config/" 2>/dev/null || true
cp -r ~/.config/claude-golem "$BACKUP_DIR/config/" 2>/dev/null || true
cp -r ~/.config/opencode "$BACKUP_DIR/config/" 2>/dev/null || true
cp -r ~/.config/agents "$BACKUP_DIR/config/" 2>/dev/null || true

# 3. ~/.claude (excluding large dirs)
echo "[3/7] Backing up ~/.claude..."
mkdir -p "$BACKUP_DIR/dot-claude"
cp ~/.claude/*.md "$BACKUP_DIR/dot-claude/" 2>/dev/null || true
cp ~/.claude/*.json "$BACKUP_DIR/dot-claude/" 2>/dev/null || true
cp -r ~/.claude/skills "$BACKUP_DIR/dot-claude/" 2>/dev/null || true
cp -r ~/.claude/contexts "$BACKUP_DIR/dot-claude/" 2>/dev/null || true
cp -r ~/.claude/hooks "$BACKUP_DIR/dot-claude/" 2>/dev/null || true
cp -r ~/.claude/learnings "$BACKUP_DIR/dot-claude/" 2>/dev/null || true

# 4. ~/.agents
echo "[4/7] Backing up ~/.agents..."
cp -r ~/.agents "$BACKUP_DIR/dot-agents" 2>/dev/null || true

# 5. ~/.golems-zikaron state
echo "[5/7] Backing up ~/.golems-zikaron..."
cp -r ~/.golems-zikaron "$BACKUP_DIR/dot-golems-zikaron" 2>/dev/null || true

# 6. Document all symlinks
echo "[6/7] Documenting symlinks..."
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
echo "[7/7] Generating manifest..."
cat > "$BACKUP_DIR/manifest.md" << EOF
# Golem System Backup Manifest

**Created:** $(date)
**By:** backup-golem-system.sh
**Purpose:** Pre-consolidation snapshot

## What Was Backed Up

| Source | Destination |
|--------|-------------|
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
