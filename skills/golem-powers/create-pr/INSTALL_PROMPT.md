# Install: create-pr

> Use when ready to submit work for review. Pushes branch and creates PR via gh CLI. Covers create PR, submit PR, push and PR. NOT for: git commits only (use git directly), reviewing PRs (use coderabbit).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/create-pr/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/create-pr
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/create-pr/SKILL.md \
  -o ~/.claude/commands/create-pr/SKILL.md
```

3. Download scripts:
```bash
mkdir -p ~/.claude/commands/create-pr/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/create-pr/scripts/create-pr.sh \
  -o ~/.claude/commands/create-pr/scripts/create-pr.sh
chmod +x ~/.claude/commands/create-pr/scripts/create-pr.sh
```

4. Verify:
```bash
ls ~/.claude/commands/create-pr/
```

## Usage

```
/create-pr
```
