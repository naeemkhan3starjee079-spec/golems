---
name: practice
description: Voice-powered presentation/pitch practice with drilling, fact-checking, and timing
---

# Practice Workflow

> Walk through a presentation slide by slide, drill with audience questions, fact-check claims, time sections.

## Prerequisites

- voicelayer MCP connected
- Presentation file (pptx, Obsidian outline, or verbal description)
- Know the talk structure (chapters, main message, time limit)

## Phase 1: Setup

```
qa_voice_converse: "What are we practicing — a presentation, a pitch, or something else?"
qa_voice_converse: "How long is the talk supposed to be?"
qa_voice_converse: "What's your main message in one sentence?"
```

Load the outline (Obsidian file, pptx notes, or user describes it).

Log setup:
```
qa_voice_think(category: "insight", thought: "Talk: {type}, {duration}min, message: {message}")
```

## Phase 2: Slide-by-Slide Walk-Through

For each slide/section:

1. **Read back the slide's key point:**
   ```
   qa_voice_brief: "Slide {N}: {slide title or key point}. Go ahead, present this part."
   ```

2. **Listen to their delivery** (qa_voice_converse with long timeout)

3. **Evaluate and drill:**
   - Too long? → "That was about {X} minutes. You need it under {Y}. What can you cut?"
   - Vague? → "You said '{quote}'. What does that actually mean? Pretend I'm not technical."
   - Claim without proof? → "You mentioned {number/claim}. Is that still accurate?"
   - Missing transition? → "How does this connect to the next part?"
   - No personal touch? → "This feels generic. What's YOUR experience with this?"

4. **Log silently:**
   ```
   qa_voice_think(category: "insight", thought: "Slide {N}: {timing}s, {notes}")
   ```

## Phase 3: Audience Questions

After full run-through, play devil's advocate:

- "Wait, what's {technical term}?" (test if they can explain simply)
- "Why should I care about this?" (test the 'so what')
- "Didn't {competitor/alternative} already do this?" (test differentiation)
- "How long did this actually take?" (test honesty about timeline)
- "What failed along the way?" (test vulnerability / real stories)

Log which questions stumped them:
```
qa_voice_think(category: "question", thought: "Stumped on: {question}")
```

## Phase 4: Fact Check

Review any numbers, dates, or claims mentioned during practice:

- Commit counts, PR counts, chunk counts — verify against repo
- Timelines — verify against git history
- Feature claims — verify they actually work
- Comparisons — verify they're fair

```
qa_voice_brief: "Let me fact-check a few things you said..."
```

Flag corrections:
```
qa_voice_think(category: "red-flag", thought: "Claimed {X} but actual is {Y}")
```

## Phase 5: Debrief

```
qa_voice_converse: "How did that feel? What parts felt natural vs forced?"
qa_voice_converse: "What do you want to change for the next run?"
```

Summarize:
```
qa_voice_brief: "Here's what I noticed: {key observations}"
```

## Phase 6: Output

Write practice notes to Obsidian:
```
$OBSIDIAN_VAULT/{Context}/Practice Notes - {Date}.md
```

### Template:
```markdown
# Practice Notes — {Date}

## Talk: {title}
- **Duration target:** {X} min
- **Actual:** {Y} min
- **Main message:** {message}

## Per-Section Notes
| Section | Time | Notes |
|---------|------|-------|
| {slide} | {Xs} | {what worked, what didn't} |

## Audience Questions That Stumped Me
- {question} — need to prep answer for: {topic}

## Fact-Check Corrections
- {claimed X, actual Y}

## What to Change
- {from debrief}

## Insights for Next Run
- {observations}
```

## Modes

### Presentation Practice (default)
Full slide-by-slide with timing, audience questions, fact-checking.

### Pitch Practice
Shorter. Focus on: hook (10 sec), problem (30 sec), solution (30 sec), ask (10 sec). Strict timing.

### Interview Answer Practice
Single question at a time. Evaluate: clarity, specificity, confidence, length. STAR format check for behavioral.
