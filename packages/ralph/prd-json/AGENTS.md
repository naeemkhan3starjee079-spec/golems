# AI Agent Instructions for PRD: Session Context & Notify System

## Overview

This PRD implements:
1. **Session Context Manager** - Unified context for runner type, model, and notifications
2. **Notify System** - ntfy-based agent-to-user communication
3. **TDD Pattern** - US (Research) → MP (Implementation) → TEST → AUDIT

## Story Dependencies

```
BUG-001 ✅ (completed)
   └── BUG-002 → V-002 (blocked)

US-128 (Research: Session Context)
   └── MP-128 (TDD: Session Context Manager)
         └── TEST-128 (Tests)
               └── AUDIT-128 (Verify)
                     └── US-129 (Research: Notify System)
                           └── MP-129 (TDD: Notify System)
                                 ├── TEST-129 (Tests)
                                 └── AUDIT-129 (Verify)

US-115, US-116, US-117, US-118 (Features - independent)
```

## Relevant Skills

| Skill | When to Use |
|-------|-------------|
| `/golem-powers:ralph-commit` | For "Commit:" criteria - atomic commit + criterion check |
| `/golem-powers:coderabbit` | Code review before commits - iterate until clean |
| `/golem-powers:context7` | Look up library docs when unsure about APIs |
| `/golem-powers:prd-manager` | Manage PRD stories - list, show, stats |
| `/golem-powers:catchup` | Recover context after long breaks |

## TDD Pattern (CRITICAL for MP stories)

MP stories follow strict TDD:
1. **FIRST**: Write tests (bun/tests/{feature}.test.ts)
2. **THEN**: Implement to make tests pass
3. **VERIFY**: Run test suite, typecheck, CodeRabbit

## Key Files

| File | Purpose |
|------|---------|
| `ralph-ui/src/runner/session-context.ts` | MP-128: SessionContext implementation |
| `ralph-ui/src/runner/notify.ts` | MP-129: Notify system |
| `bun/tests/session-context.test.ts` | Tests for session context |
| `bun/tests/notify.test.ts` | Tests for notify system |
| `docs.local/research/` | Research outputs from US stories |

## Session Context Interface (MP-128)

```typescript
interface SessionContext {
  runner: 'ralph' | 'direct';  // detectRunner() checks RALPH_SESSION env
  model: string;               // Current model (opus, sonnet, kiro, etc.)
  interactive: boolean;        // Running in TTY?
  notifications: {
    enabled: boolean;          // RALPH_NOTIFY env or -QN flag
    topic: string;             // Auto-derived from project
  };
}
```

## Notify Topic Format (MP-129)

```
etanheys-ralph-{project}-notify
```

Example: `etanheys-ralph-claude-golem-notify`

## CodeRabbit Iteration Rule

For "Run CodeRabbit review" criteria:
1. Run: `cr review --plain --prompt-only --type uncommitted`
2. If issues found → Fix them
3. Run CR again
4. Repeat until clean or only intentional patterns remain

## NEVER Edit index.json Directly

Use `update.json` instead:
1. Create story files in `stories/`
2. Write changes to `update.json`
3. Ralph merges automatically

## Example update.json

```json
{
  "storyOrder": ["existing...", "NEW-001"],
  "pending": ["existing...", "NEW-001"],
  "stats": { "total": X, "pending": Y }
}
```

## Verification Commands

```bash
# Run all tests
bun test

# Run specific test file
bun test bun/tests/session-context.test.ts

# Typecheck
bun run typecheck

# Direct ntfy test
curl -s ntfy.sh/etanheys-ralph-claude-golem-notify -d 'test message'
```

## Self-Improvement Loop

When you find something broken or missing:
1. **Ask the user** - "I found X is missing, should I create a story?"
2. **Create a PRD story** - Use /golem-powers:prd-manager
3. **Ralph fixes it** - The system improves itself
