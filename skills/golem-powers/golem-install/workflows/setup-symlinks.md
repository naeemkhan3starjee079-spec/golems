# Setup Symlinks Workflow

Create symlinks in ~/.claude/commands/ to enable golem-powers skills for Claude Code.

---

## Prerequisites

- golems repository cloned
- ~/.claude/commands/ directory exists

---

## Create Commands Directory

```bash
mkdir -p ~/.claude/commands
```

---

## Symlink Skills (Recommended)

Skills are installed as individual symlinks in `~/.claude/commands/`. Each skill gets its own symlink:

```bash
#!/bin/bash
GOLEMS_DIR="${GOLEMS_DIR:-$HOME/path/to/golems}"
COMMANDS_DIR="$HOME/.claude/commands"

echo "Creating individual skill symlinks..."
echo "Source: $GOLEMS_DIR/skills/golem-powers/*"
echo "Target: $COMMANDS_DIR/"
echo ""

# Create commands directory if missing
mkdir -p "$COMMANDS_DIR"

# Remove old namespace symlink if it exists
if [ -L "$COMMANDS_DIR/golem-powers" ]; then
  rm -f "$COMMANDS_DIR/golem-powers"
  echo "[REMOVED] old namespace symlink: golem-powers"
fi

# Create individual skill symlinks
for skill_dir in "$GOLEMS_DIR"/skills/golem-powers/*/; do
  skill_name=$(basename "$skill_dir")
  ln -sf "$skill_dir" "$COMMANDS_DIR/$skill_name"
  echo "[OK] $skill_name symlink created"
done

echo ""
echo "Skills now available as individual commands in ~/.claude/commands/"
```

---

## Quick Setup (One-liner)

Replace `/path/to/golems` with your actual path:

```bash
mkdir -p ~/.claude/commands && for d in /path/to/golems/skills/golem-powers/*/; do ln -sf "$d" ~/.claude/commands/$(basename "$d"); done
```

---

## Verify Symlinks

Check that individual skill symlinks are correctly pointing:

```bash
ls -la ~/.claude/commands/ | grep "^l"
```

Expected output (one symlink per skill):
```
1password -> /Users/.../golems/skills/golem-powers/1password/
archive -> /Users/.../golems/skills/golem-powers/archive/
convex -> /Users/.../golems/skills/golem-powers/convex/
...
```

---

## Test Skill Discovery

In a new Claude Code session, skills appear as top-level commands (e.g., `/1password`, `/convex`, `/github`).

---

## Remove Old Namespace Symlink

If you have the old single `golem-powers` namespace symlink, remove it:

```bash
# Check for old namespace symlink
ls -la ~/.claude/commands/golem-powers

# Remove it
rm -f ~/.claude/commands/golem-powers
```

Then re-run the setup script above to create individual skill symlinks in `~/.claude/commands/`.

---

## Troubleshooting

### Symlink broken (red in ls -la)

The source directory was moved. Re-run the setup script with the correct `GOLEMS_DIR` path.

### Skills not appearing in Claude

1. Check Claude Code version supports skills
2. Verify symlinks exist: `ls -la ~/.claude/commands/ | grep "^l"`
3. Restart Claude Code session

### Permission denied

Fix permissions:
```bash
chmod 755 ~/.claude/commands
chmod -R 755 ~/.claude/commands/*/
```

---

## Next Steps

After creating symlinks:
1. Run [validate](validate.md) to test the full installation
2. Skills appear as top-level commands in Claude Code (e.g., `/1password`, `/github`)
