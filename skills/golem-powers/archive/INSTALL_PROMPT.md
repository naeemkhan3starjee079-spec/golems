# Install: archive

> Use when planning a sprint transition, archiving completed work, or resetting the PRD for a fresh start. Archives completed PRD stories to docs.local/. Covers archive, cleanup, sprint transition, reset PRD. NOT for: deleting stories mid-sprint (use prd-manager), viewing PRD status (use ralph-status).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/archive/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/archive
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/archive/SKILL.md \
  -o ~/.claude/commands/archive/SKILL.md
```

### Scripts

```bash
mkdir -p ~/.claude/commands/archive/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/archive/scripts/archive-snapshot.sh \
  -o ~/.claude/commands/archive/scripts/archive-snapshot.sh
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/archive/scripts/cleanup-completed.sh \
  -o ~/.claude/commands/archive/scripts/cleanup-completed.sh
chmod +x ~/.claude/commands/archive/scripts/*.sh
```

3. Verify:
```bash
ls ~/.claude/commands/archive/
```

## Usage

```
/archive
```
