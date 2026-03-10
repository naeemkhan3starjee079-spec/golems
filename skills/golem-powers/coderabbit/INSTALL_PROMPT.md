# Install: coderabbit

> Use when reviewing uncommitted changes, preparing PRs, checking for security issues, or verifying code quality. Runs AI code reviews via CLI. Covers code review, PR review, security scan, secrets scan. NOT for: runtime debugging (use debugger), test execution (run tests directly).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/coderabbit
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/SKILL.md \
  -o ~/.claude/commands/coderabbit/SKILL.md
```

### Workflows

```bash
mkdir -p ~/.claude/commands/coderabbit/workflows
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/workflows/accessibility.md \
  -o ~/.claude/commands/coderabbit/workflows/accessibility.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/workflows/pr-ready.md \
  -o ~/.claude/commands/coderabbit/workflows/pr-ready.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/workflows/review.md \
  -o ~/.claude/commands/coderabbit/workflows/review.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/workflows/secrets.md \
  -o ~/.claude/commands/coderabbit/workflows/secrets.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/workflows/security.md \
  -o ~/.claude/commands/coderabbit/workflows/security.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/workflows/verify.md \
  -o ~/.claude/commands/coderabbit/workflows/verify.md
```

### Scripts

```bash
mkdir -p ~/.claude/commands/coderabbit/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/scripts/accessibility.sh \
  -o ~/.claude/commands/coderabbit/scripts/accessibility.sh
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/scripts/pr-ready.sh \
  -o ~/.claude/commands/coderabbit/scripts/pr-ready.sh
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/scripts/review.sh \
  -o ~/.claude/commands/coderabbit/scripts/review.sh
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/scripts/secrets.sh \
  -o ~/.claude/commands/coderabbit/scripts/secrets.sh
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coderabbit/scripts/security.sh \
  -o ~/.claude/commands/coderabbit/scripts/security.sh
chmod +x ~/.claude/commands/coderabbit/scripts/*.sh
```

3. Verify:
```bash
ls ~/.claude/commands/coderabbit/
```

## Usage

```
/coderabbit
```
