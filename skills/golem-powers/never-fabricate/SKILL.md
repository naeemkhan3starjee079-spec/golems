---
name: never-fabricate
description: MANDATORY before reporting on any file contents, test results, agent outputs, or audit findings. If you haven't Read() it, you don't know what's in it. Period. Use when summarizing results, reporting on agent work, or claiming anything is "green" or "complete."
---

# Never Fabricate Results

> If you haven't Read() the file, you don't know what's in it. Period.

## The Iron Law

```
NO CLAIMS ABOUT FILE CONTENTS WITHOUT Read() EVIDENCE
NO CLAIMS ABOUT TEST RESULTS WITHOUT RUNNING THEM
NO CLAIMS ABOUT AGENT OUTPUT WITHOUT READING IT
```

## What Counts as Fabrication

| Fabrication | Reality |
|-------------|---------|
| "All three audits say green" (without Read) | You don't know what they say |
| "Tests pass" (without running them) | You don't know if they pass |
| "Agent completed successfully" (without checking) | Agents lie too |
| "The file looks correct" (from system-reminder) | System-reminders are notifications, not reads |
| "Results are consistent" (from a glance) | A glance is not analysis |

## The Rule

### When someone writes to a file (agent, CLI tool, Cursor, user):

```
1. READ the file with the Read tool
2. PARSE the actual content — don't skim
3. SUMMARIZE what you actually read
4. ONLY THEN report on it
```

### When tests run:

```
1. RUN the test command
2. READ the full output
3. COUNT failures, errors, warnings
4. ONLY THEN claim pass/fail
```

### When an agent reports completion:

```
1. CHECK the actual output (file diff, test results, PR URL)
2. VERIFY independently — don't trust the agent's self-report
3. ONLY THEN confirm completion
```

## System-Reminders Are NOT Evidence

System-reminders tell you "this file changed." They are a **notification**, not a **source of truth**.

```
WRONG: "I saw in the system-reminder that the file was updated, and it looks good"
RIGHT: Read(file_path) → parse content → report what you actually read
```

A notification popping up on your phone is not the same as reading the document.

## Why This Matters

One fabricated "all green" can:
- Waste hours of debugging downstream
- Ship broken code to production
- Destroy trust permanently
- Cause the user to make decisions based on false information

From real incidents:
- Claude claimed "3 models validated, all complete and correct" without reading the file
- Claude claimed "tests pass" without running them
- Claude reported "review is clean" without reading review comments

## When To Apply

**ALWAYS before:**
- Summarizing any file contents
- Reporting on test results
- Reporting on agent output
- Claiming anything is "done", "green", "clean", "complete"
- Moving to the next task based on prior task results

## Composability

This skill is referenced by:
- `/pr-loop` — step 8 (read review before claiming clean)
- `/superpowers:verification-before-completion` — evidence before assertions
- All autonomous workflows — never trust, always verify

## The Bottom Line

**Read it. Parse it. Then report.**

Not "I saw it flash by." Not "the system told me." Not "it should be fine."

Read. Parse. Report. No shortcuts.
