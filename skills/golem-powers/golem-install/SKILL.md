---
name: golem-install
description: Set up the golems ecosystem for the first time on a new machine. Checks CLI dependencies, wires MCP servers, creates skill symlinks. Use when: "set up golems", "install golems", "new machine setup", "wire skills". NOT for daily usage.
---

# Golem Setup Wizard

> First-time setup for the golems ecosystem on a new Mac. Checks deps, wires MCPs, symlinks skills.

## Required CLIs

| CLI | Purpose | Install |
|-----|---------|---------|
| `gh` | GitHub — PRs, issues | `brew install gh` |
| `op` | 1Password — secrets | `brew install 1password-cli` |
| `bun` | TypeScript runtime | `curl -fsSL https://bun.sh/install \| bash` |
| `cr` | CodeRabbit — code review | `brew install coderabbitai/tap/cr` |
| `git` | Version control | pre-installed on macOS |
| `jq` | JSON processing | `brew install jq` |
| `fswatch` | File watching | `brew install fswatch` |

```bash
# Check all at once
for cmd in gh op bun cr git jq fswatch; do
  which $cmd >/dev/null 2>&1 && echo "✅ $cmd" || echo "❌ $cmd — needs install"
done
```

## Skill Symlinks

Skills live in `~/Gits/golems/skills/golem-powers/` and are individually symlinked into `~/.claude/commands/`.

```bash
# Create symlinks for all skills
SKILLS_DIR=~/Gits/golems/skills/golem-powers
COMMANDS_DIR=~/.claude/commands
mkdir -p "$COMMANDS_DIR"

for skill_dir in "$SKILLS_DIR"/*/; do
  skill_name=$(basename "$skill_dir")
  ln -sf "$skill_dir" "$COMMANDS_DIR/$skill_name"
  echo "✅ Linked: $skill_name"
done
```

Verify: `ls ~/.claude/commands/` should show ~45 skills.

## MCP Servers

Wire these MCPs via `~/.mcp.json` (at `~/Gits/` for cross-repo access):

| MCP | Binary | Purpose |
|-----|--------|---------|
| brainlayer | `brainlayer-mcp` | Memory search + store |
| voicelayer | `voicelayer-mcp` | TTS + STT |
| context7 | `npx @upstash/context7-mcp` | Library docs |
| supabase | via config | Database |

```bash
# Verify MCP binaries
which brainlayer-mcp || echo "Run: cd ~/Gits/brainlayer && bun link"
which voicelayer-mcp || echo "Run: cd ~/Gits/voicelayer && bun link"
```

## Global CLAUDE.md

Ensure `~/.claude/CLAUDE.md` exists with global instructions. Template lives at:
```
~/Gits/orchestrator/standards/
```

## 1Password Items Needed

| Item | Vault | Fields |
|------|-------|--------|
| `golems` | development | `context7.API_KEY`, `linear.API_KEY` |
| `ANTHROPIC` | development | `API_KEY` |

```bash
# Verify 1Password access
op item get "golems" --vault development --fields label=context7.API_KEY 2>/dev/null && echo "✅ 1P connected" || echo "❌ 1P not connected"
```

## Golem Terminal (Optional)

Native macOS terminal for running agents:
```bash
cd ~/Gits/golem-terminal && bash install.sh
```

Config lives at: `~/Library/Application Support/golem-terminal/golems.toml`

## Validation Checklist

```bash
echo "=== Golem Setup Validation ==="
echo "CLIs:"
for cmd in gh op bun cr git jq; do which $cmd >/dev/null 2>&1 && echo "  ✅ $cmd" || echo "  ❌ $cmd"; done

echo "Skills:"
skill_count=$(ls ~/.claude/commands/ 2>/dev/null | wc -l | tr -d ' ')
[ "$skill_count" -gt "30" ] && echo "  ✅ $skill_count skills linked" || echo "  ❌ Only $skill_count skills (expected 40+)"

echo "MCPs:"
which brainlayer-mcp >/dev/null 2>&1 && echo "  ✅ brainlayer-mcp" || echo "  ❌ brainlayer-mcp"
which voicelayer-mcp >/dev/null 2>&1 && echo "  ✅ voicelayer-mcp" || echo "  ❌ voicelayer-mcp"

echo "=== Done ==="
```

## Troubleshooting

**Homebrew not installed:**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**1Password CLI not connecting to app:**
1. Open 1Password 8 desktop
2. Settings → Developer → Enable CLI integration
3. Enable biometric unlock for CLI

**Skills not appearing in Claude:**
```bash
ls ~/.claude/commands/
# Re-run the symlink step if empty or missing skills
```

**brainlayer-mcp not found:**
```bash
cd ~/Gits/brainlayer && bun install && bun link
```
