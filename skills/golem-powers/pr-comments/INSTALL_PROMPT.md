# Install: pr-comments

> Fetch and display PR review comments with full context (diff hunks, severity, descriptions). Checks Greptile, CodeRabbit, Cursor Bugbot, and DeepSource. Use after pushing a PR to check for issues before merging.

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/pr-comments/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/pr-comments
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/pr-comments/SKILL.md \
  -o ~/.claude/commands/pr-comments/SKILL.md
```

3. Download scripts:
```bash
mkdir -p ~/.claude/commands/pr-comments/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/pr-comments/scripts/fetch-pr-comments.sh \
  -o ~/.claude/commands/pr-comments/scripts/fetch-pr-comments.sh
chmod +x ~/.claude/commands/pr-comments/scripts/fetch-pr-comments.sh
```

4. Verify:
```bash
ls ~/.claude/commands/pr-comments/
```

## Usage

```
/pr-comments
```
