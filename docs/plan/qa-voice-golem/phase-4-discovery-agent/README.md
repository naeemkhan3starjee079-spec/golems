# Phase 4: Discovery Agent

> [Back to main plan](../README.md)

## Goal

Create the client discovery call agent with an interview protocol, running checklist of unknowns, follow-up question suggestions, and project brief generation.

## Tools

- **Research:** gemini — freelance discovery call best practices, project brief templates
- **Code:** opus — agent prompt, brief schema, templates
- **MCPs:** qa-voice (speaking questions/suggestions)

## Agent Design Principles

From Claude web research:
- **Ultra-short responses**: 1-2 sentences MAX — you're on a live call with a client
- **Whisper mode**: Suggestions are quiet prompts in your ear, not interruptions
- **Running checklist**: Track unknowns, check them off as conversation reveals answers
- **Red flag detection**: Budget too low, scope creep signals, unrealistic timelines
- **Non-intrusive**: The AI assists YOU — the client doesn't need to know it exists

## Discovery Checklist Categories

1. **Project Scope** — What are we building? Web/mobile/both? Existing site or greenfield?
2. **Technical Requirements** — Stack preferences, integrations, APIs, hosting
3. **Design** — Brand guidelines, design files, reference sites, responsive needs
4. **Content** — Who provides copy/images? CMS needed? Multi-language?
5. **Budget & Timeline** — Budget range, deadline, payment terms, milestones
6. **Process** — Communication preferences, review cycles, deployment process
7. **Competitive Landscape** — Competitors, differentiation, target audience
8. **Red Flags** — Scope creep, unrealistic expectations, unclear decision-makers

## Brief Schema

```json
{
  "session": {
    "id": "discovery-2026-02-18-001",
    "mode": "discovery",
    "client_name": "Acme Corp",
    "started": "2026-02-18T14:00:00Z",
    "status": "completed"
  },
  "checklist": [
    {
      "category": "scope",
      "question": "What type of project?",
      "status": "answered|unanswered|partial",
      "answer": "E-commerce site with custom CMS",
      "follow_ups": ["Which payment providers?"],
      "timestamp": "2026-02-18T14:05:00Z"
    }
  ],
  "red_flags": [
    {
      "flag": "Client mentioned 'we need it by next week'",
      "severity": "high",
      "suggestion": "Clarify scope — 1 week is unrealistic for full e-commerce"
    }
  ],
  "brief": {
    "project_type": "E-commerce website",
    "estimated_complexity": "medium",
    "key_requirements": [],
    "open_questions": [],
    "recommended_next_steps": []
  }
}
```

## Steps

1. Create `.claude/agents/discovery-voice.md` — discovery agent system prompt
2. Define discovery checklist schema in `packages/qa-voice/src/schemas/discovery.ts`
3. Implement discovery checklist writer (same pattern as QA, different schema)
4. Create brief renderer: JSON to markdown project brief
5. Write discovery category templates (8 categories, ~3-5 questions each)
6. Add "suggest" mode: AI whispers follow-up questions you should ask
7. Add red flag detection with severity and suggestions
8. Test with mock discovery call (simulate client conversation)
9. Write tests for discovery schema validation
10. Write tests for brief renderer

## Brief Output

At session end, generate `~/.golems/briefs/discovery-YYYY-MM-DD-NNN.md`:

```markdown
# Project Brief: Acme Corp
**Date:** 2026-02-18 | **Duration:** 30 min

## Project Summary
E-commerce site with custom CMS...

## Requirements
- [ ] Custom product catalog
- [ ] Stripe payment integration
...

## Open Questions (need follow-up)
1. Which payment providers besides Stripe?
2. Multi-language support needed?

## Red Flags
- Timeline pressure: client wants delivery in 1 week

## Recommended Next Steps
1. Send detailed proposal with timeline
2. Schedule design review meeting
3. Get access to brand guidelines
```

## Depends On

- Phase 1 (MCP server)
- Phase 2 (voice loop)

## Status

- [x] Create discovery agent system prompt (.claude/agents/discovery-voice.md)
- [x] Define discovery checklist schema (schemas/discovery.ts)
- [x] Implement discovery checklist writer (addChecklistItem, updateChecklistItem, getOpenQuestions)
- [x] Create brief renderer (brief.ts — JSON to markdown)
- [x] Write discovery category templates (7 categories, 23 questions, voice prompts)
- [x] Suggest mode defined in agent prompt (whisper between topics)
- [x] Red flag detection (addRedFlag, severity levels, 7 signal patterns in agent prompt)
- [ ] Test with mock discovery call (needs manual session)
- [x] Write discovery schema tests (7 tests)
- [x] Write brief renderer tests (8 tests)
