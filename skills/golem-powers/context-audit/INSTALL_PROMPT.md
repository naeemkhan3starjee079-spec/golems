# Install: context-audit

> Use to diagnose missing contexts in a project. Compares what contexts SHOULD be loaded vs what IS loaded. Covers context check, missing contexts, setup audit. NOT for: listing skills (use /skills), detecting tools (use /project-context).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/context-audit/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/context-audit
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/context-audit/SKILL.md \
  -o ~/.claude/commands/context-audit/SKILL.md
```

### Scripts

```bash
mkdir -p ~/.claude/commands/context-audit/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/context-audit/scripts/audit.sh \
  -o ~/.claude/commands/context-audit/scripts/audit.sh
chmod +x ~/.claude/commands/context-audit/scripts/*.sh
```

3. Verify:
```bash
ls ~/.claude/commands/context-audit/
```

## Usage

```
/context-audit
```
