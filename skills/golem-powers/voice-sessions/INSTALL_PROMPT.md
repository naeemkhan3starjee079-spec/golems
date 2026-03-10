# Install: voice-sessions

> Use when debriefing meetings, practicing presentations, QA testing with voice, or capturing insights to Obsidian. Covers voice drilling, coaching, capture. NOT for: simple TTS announcements (use voice_speak directly).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/voice-sessions/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/voice-sessions
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/voice-sessions/SKILL.md \
  -o ~/.claude/commands/voice-sessions/SKILL.md
```

3. Download workflows:
```bash
mkdir -p ~/.claude/commands/voice-sessions/workflows
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/voice-sessions/workflows/code.md \
  -o ~/.claude/commands/voice-sessions/workflows/code.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/voice-sessions/workflows/debrief.md \
  -o ~/.claude/commands/voice-sessions/workflows/debrief.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/voice-sessions/workflows/practice.md \
  -o ~/.claude/commands/voice-sessions/workflows/practice.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/voice-sessions/workflows/qa.md \
  -o ~/.claude/commands/voice-sessions/workflows/qa.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/voice-sessions/workflows/quick.md \
  -o ~/.claude/commands/voice-sessions/workflows/quick.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/voice-sessions/workflows/review.md \
  -o ~/.claude/commands/voice-sessions/workflows/review.md
```

4. Verify:
```bash
ls ~/.claude/commands/voice-sessions/
```

## Usage

```
/voice-sessions
```
