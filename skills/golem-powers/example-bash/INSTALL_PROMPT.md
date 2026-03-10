# Install: example-bash

> Use when learning to write bash-pattern skills. Template for simple CLI wrapper skills. Covers example, template, bash skill, pattern A. NOT for: production use (this is a demo).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/example-bash/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/example-bash
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/example-bash/SKILL.md \
  -o ~/.claude/commands/example-bash/SKILL.md
```

3. Download scripts:
```bash
mkdir -p ~/.claude/commands/example-bash/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/example-bash/scripts/hello.sh \
  -o ~/.claude/commands/example-bash/scripts/hello.sh
chmod +x ~/.claude/commands/example-bash/scripts/hello.sh
```

4. Verify:
```bash
ls ~/.claude/commands/example-bash/
```

## Usage

```
/example-bash
```
