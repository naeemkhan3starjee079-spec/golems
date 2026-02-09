# Phase 6: LinkedIn Exposure Skill

> [Back to main plan](../README.md)

## Goal

Create a `/linkedin-post` writing coach skill. NOT auto-posting. Helps you learn to write better LinkedIn posts by: surfacing good topics from your code history, applying Aviv Levi's 2026 LinkedIn algorithm guidelines, and drafting in your voice for you to finish.

## Tools

- **Research:** Gemini/Codex — extract Aviv Levi guidelines (Hebrew content + image)
- **Code:** Opus direct — write the skill

## Source Material

All in `docs.local/aviv_levi/linkedin-exposure-post/`:
- `postdescription.md` — Full Hebrew post: 10 tactical rules for LinkedIn 2026
- `1770545762652.jpg` — Visual summary infographic
- `postinsightfulcomments.md` — Comment thread with CTA-in-comments tactic

### Key Rules Extracted (from Aviv Levi)

1. **Dwell Time > Likes** — algorithm counts seconds, not clicks
2. **PDF/Carousels = 6.6% engagement** (highest format)
3. **Zero-Click** — no links in post body (put in first comment or bio)
4. **Mobile-first** — 72% mobile, short lines, max 12 words/sentence, lots of whitespace
5. **Personal profiles > company pages** (1-2% organic reach for pages)
6. **Golden Hour** — first 90 min: comment + engage or post dies
7. **Saves > Comments > Likes** — save = 100 points, comment = 10, like = 1
8. **5 posts/week minimum** — consistency is the flywheel (3-6 months to spin up)
9. **Authentic photos** — 6.5x more engagement than stock
10. **Post structure: Hook (3 lines) → Meat (value) → CTA (conversation)**
11. **CTA in comments, not post body** — forces readers to engage deeper (from comments thread)

## Steps

### 1. Extract + Structure Guidelines (CLI helper)

```bash
gemini -p "Read the attached Hebrew text and extract structured LinkedIn posting guidelines.
$(cat docs.local/aviv_levi/linkedin-exposure-post/postdescription.md)

Also incorporate this insight from the comments:
$(cat docs.local/aviv_levi/linkedin-exposure-post/postinsightfulcomments.md)

Output as a structured English+Hebrew markdown file with:
1. Each rule numbered with Hebrew title + English explanation
2. Engagement metrics cited
3. Do/Don't examples for each
4. Post template structure
5. CTA placement strategy (in comments, not body)

Format as a reusable reference guide." > docs/plan/job-search-command-center/phase-6/linkedin-guidelines.md 2>&1
```

### 2. Create `/linkedin-post` Skill

Skill structure:
```
skills/golem-powers/linkedin-post/
  SKILL.md              — Overview + quick actions
  workflows/
    topic.md            — Find good topics from code history
    draft.md            — Draft a post following guidelines
    review.md           — Review a draft against guidelines
  linkedin-guidelines.md — Extracted rules (from step 1)
```

### 3. Workflow: `/linkedin-post topic`

Uses `/catchup` skill internally to:
- Scan recent git history (last 2 weeks)
- Identify interesting patterns: "built X from scratch", "solved hard Y", "our approach to Z"
- Cross-reference with what LinkedIn likes (from guidelines)
- Output: 3-5 topic suggestions with angles

Example output:
```
1. "How we built multi-agent consensus before Anthropic shipped Agent Teams"
   - Angle: "we did X before Big Corp did X" (underdog story)
   - Hook: share the personality emergence insight (CadenceClaude, PixelPolice)
   - Format: PDF carousel showing the wave progression

2. "I automated my job search with AI agents — here's what actually worked"
   - Angle: practical guide (save-worthy content)
   - Hook: numbers ("843 connections matched against 60 daily job posts")
   - Format: text post with numbered list
```

### 4. Workflow: `/linkedin-post draft`

Given a topic:
- Load `linkedin-guidelines.md`
- Load your style card (Hebrew/English code-switching, casual, brief)
- Generate draft following the structure: Hook (3 lines) → Meat → CTA
- Apply mobile-first rules (short sentences, whitespace)
- Suggest where to put links (first comment, not body)
- Mark sections: "YOUR AUTHENTIC TOUCH GOES HERE" — you finish it

### 5. Workflow: `/linkedin-post review`

Given a draft:
- Check against all 11 rules
- Score: "8/11 rules followed"
- Specific feedback: "Line 5 is 18 words — shorten to 12 max"
- Dwell time estimate: "This post takes ~45 seconds to read — good"
- Mobile preview: estimate how it looks on phone screen

## Depends On

- None (fully independent)

## Status

- [ ] Extract guidelines (CLI helper)
- [ ] Review + polish guidelines
- [ ] Create SKILL.md
- [ ] Write topic workflow
- [ ] Write draft workflow
- [ ] Write review workflow
- [ ] Test all workflows
- [ ] Committed
