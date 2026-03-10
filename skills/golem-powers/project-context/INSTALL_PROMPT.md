# Install: project-context

> Use at session start or when unsure what tools are available. Auto-detects project stack and shows relevant skills. Covers project detection, what skills, available tools. NOT for: mid-session skill lookup (use /skills), invoking specific skills (call them directly).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/project-context/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/project-context
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/project-context/SKILL.md \
  -o ~/.claude/commands/project-context/SKILL.md
```

3. Download scripts:
```bash
mkdir -p ~/.claude/commands/project-context/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/project-context/scripts/detect.sh \
  -o ~/.claude/commands/project-context/scripts/detect.sh
chmod +x ~/.claude/commands/project-context/scripts/detect.sh
```

4. Verify:
```bash
ls ~/.claude/commands/project-context/
```

## Usage

```
/project-context
```
