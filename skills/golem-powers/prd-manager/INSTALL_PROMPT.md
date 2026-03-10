# Install: prd-manager

> Use when modifying PRD stories programmatically - add criteria, update status, bulk operations. Covers PRD management, add story, add criterion, bulk update. NOT for: creating new PRDs (use prd), viewing PRD status (use ralph-status).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/prd-manager/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/prd-manager
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/prd-manager/SKILL.md \
  -o ~/.claude/commands/prd-manager/SKILL.md
```

3. Download scripts:
```bash
mkdir -p ~/.claude/commands/prd-manager/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/prd-manager/scripts/run.sh \
  -o ~/.claude/commands/prd-manager/scripts/run.sh
chmod +x ~/.claude/commands/prd-manager/scripts/run.sh
```

4. Verify:
```bash
ls ~/.claude/commands/prd-manager/
```

## Usage

```
/prd-manager
```
