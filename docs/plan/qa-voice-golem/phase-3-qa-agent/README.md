# Phase 3: QA Agent

> [Back to main plan](../README.md)

## Goal

Create the QA agent system prompt with structured checklist protocol, viewport testing, severity guidelines, and Playwright MCP integration for systematic website QA.

## Tools

- **Research:** gemini — QA best practices, WCAG accessibility checklist, responsive breakpoints
- **Code:** opus — agent prompt, checklist schema, report template
- **MCPs:** playwright (browser snapshots), qa-voice (speaking questions)

## Agent Design Principles

From Claude web research:
- **Voice-first output**: Max 3-4 sentences per response. No markdown formatting in speech.
- **Systematic checklist**: Don't free-form — follow a structured protocol per page
- **Accessibility-first**: Use Playwright `browser_snapshot` (accessibility tree) for 95% of checks, screenshots only for visual bugs
- **Viewport protocol**: Test each page at 375px (mobile), 768px (tablet), 1440px (desktop)
- **Severity levels**: Critical / High / Medium / Low / Enhancement

## Checklist Schema

```json
{
  "session": {
    "id": "qa-2026-02-18-001",
    "mode": "qa",
    "url": "https://example.com",
    "started": "2026-02-18T10:00:00Z",
    "status": "in_progress",
    "pages_checked": 0,
    "issues_found": 0
  },
  "pages": [
    {
      "url": "/",
      "name": "Homepage",
      "viewports_tested": ["375", "768", "1440"],
      "checks": [
        {
          "id": 1,
          "category": "accessibility",
          "question": "Do all form inputs have proper ARIA labels?",
          "status": "pass|fail|skip|na",
          "severity": "high",
          "notes": "All inputs labeled correctly",
          "screenshot": null,
          "timestamp": "2026-02-18T10:02:00Z"
        }
      ]
    }
  ],
  "summary": {
    "total_checks": 0,
    "passed": 0,
    "failed": 0,
    "critical_issues": []
  }
}
```

## QA Categories (per page)

1. **Accessibility** — ARIA labels, heading hierarchy, keyboard navigation, color contrast
2. **Responsive** — Layout at 375/768/1440, text overflow, image scaling, touch targets
3. **Content** — Spelling, placeholder text, broken links, missing images
4. **Interaction** — Forms, buttons, navigation, modals, scroll behavior
5. **Performance** — Image sizes, lazy loading, visible layout shifts
6. **SEO** — Meta tags, Open Graph, structured data, canonical URLs

## Steps

1. Create `.claude/agents/qa-voice.md` — QA agent system prompt
2. Define checklist JSON schema in `packages/qa-voice/src/schemas/checklist.ts`
3. Implement checklist writer: append findings to session JSON file
4. Create report renderer: JSON to markdown (pass/fail summary, screenshots, recommendations)
5. Write QA category templates (6 categories, ~5-8 checks each)
6. Test with a real site: run QA session on localhost:3003 (MySudra)
7. Iterate on voice output length — ensure responses are natural spoken length
8. Write tests for checklist schema validation
9. Write tests for report renderer

## Report Output

At session end, generate `~/.golems/reports/qa-YYYY-MM-DD-NNN.md`:

```markdown
# QA Report: MySudra
**Date:** 2026-02-18 | **Duration:** 45 min | **Pages:** 10

## Summary
- 42 checks passed
- 3 issues found (1 critical, 2 medium)

## Critical Issues
1. **Login form missing validation** (severity: critical)
   ...

## All Findings
| # | Page | Category | Status | Severity | Notes |
...
```

## Depends On

- Phase 1 (MCP server for voice tools)
- Phase 2 (voice loop working end-to-end)

## Status

- [ ] Create QA agent system prompt
- [ ] Define checklist JSON schema
- [ ] Implement checklist writer
- [ ] Create report renderer (JSON to markdown)
- [ ] Write QA category templates
- [ ] Test with real site (MySudra)
- [ ] Iterate on voice output length
- [ ] Write checklist schema tests
- [ ] Write report renderer tests
