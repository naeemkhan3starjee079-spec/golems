# Phase 9: Delegated Prompts Reference

> [Back to main plan](../README.md)

## Goal

Ready-to-run prompts for parallel execution. Copy-paste these into other Claude instances or CLI helpers to parallelize work across the plan.

## When to Use Each

| Prompt | Run During | Takes | Who |
|--------|-----------|-------|-----|
| Code Audit | Phase 1 start | ~5 min | Cursor agent |
| LinkedIn Research | Phase 4 start | ~2 min | Gemini |
| Outreach Research | Phase 5 start | ~2 min | Gemini |
| Job Board Research | Phase 8 start | ~2 min | Gemini |
| Aviv Levi Extraction | Phase 6 start | ~3 min | Gemini |
| Dashboard Email UI | Phase 2, after backend | ~15 min | Claude `--dangerously-skip-permissions` |
| Dashboard Job UI | Phase 3, after backend | ~20 min | Claude `--dangerously-skip-permissions` |
| Dashboard Cost UI | Phase 7, after backend | ~10 min | Claude `--dangerously-skip-permissions` |

---

## Prompt 1: Code Audit (Cursor)

**Run from:** `~/Gits/golems/packages/autonomous/`
**Command:**
```bash
cursor agent "Scan src/ for:
1. All Soltome references (soltome-*, post-generator, content pipeline, draft approval, soltome credit)
2. Dead imports and unreachable code from any entry point (index.ts, cloud-worker.ts, telegram-bot.ts, night-shift.ts, briefing.ts, email-golem/index.ts, job-golem/index.ts)
3. Unused exports (exported but never imported elsewhere in src/)
4. Files that could be deleted entirely

Output a deletion manifest as markdown table:
| File | Action | Reason |
With actions: 'delete-file', 'remove-lines X-Y', 'remove-export NAME', 'remove-import LINE'

Do NOT modify any files. Read-only audit only." --model gpt-5.2-codex-xhigh --output-format text
```

---

## Prompt 2: LinkedIn Research (Gemini)

**Command:**
```bash
gemini -p "Research LinkedIn connection data for job searching:
1. LinkedIn CSV export format: Connections.csv has (First Name, Last Name, URL, Email Address, Company, Position, Connected On). What else can be derived?
2. Company name matching: how to handle 'Google' vs 'Alphabet' vs 'Google Israel' vs 'Google LLC'? Best fuzzy matching approaches.
3. Warm intro vs cold application: conversion rates for referral-based applications vs direct apply
4. Message vs strategy: when reaching out about a job at a connection's company, is a single DM better or a multi-step engagement (like posts first, then DM)?
5. Connection strength signals: recent connection vs old, have messages, endorsed each other, same school/company history — how to rank?
Output structured findings with data sources."
```

---

## Prompt 3: Job Board Research (Gemini)

**Command:**
```bash
gemini -p "Research Israeli tech job boards in 2026. We already scrape: SecretTLV, Drushim, Indeed Israel.

Evaluate: AllJobs.co.il, LinkedIn Jobs (scraping), Google Jobs aggregator, Glassdoor Israel, StartupNation Central, Comeet/Lever/Greenhouse boards, Wellfound (AngelList).

For each: data format, anti-scraping, job freshness, data quality, effort (1-10), recommendation (yes/maybe/no).

Output comparison table + top 3 to add."
```

---

## Prompt 4: Aviv Levi Content Extraction (Gemini)

**Command:**
```bash
gemini -p "Read this Hebrew LinkedIn strategy guide and extract structured guidelines:

POST:
$(cat docs.local/aviv_levi/linkedin-exposure-post/postdescription.md)

COMMENTS:
$(cat docs.local/aviv_levi/linkedin-exposure-post/postinsightfulcomments.md)

Output as structured markdown:
1. Each rule with Hebrew title + English explanation + engagement metric
2. Do/Don't examples per rule
3. Post template structure (hook → meat → CTA)
4. CTA-in-comments strategy (from the comments thread)
5. Summary checklist: 'before posting, verify these 11 things'"
```

---

## Prompt 5: Dashboard Email UI (Delegated Claude)

**Run from:** `~/Gits/etanheyman.com`
**Command:**
```bash
claude --dangerously-skip-permissions -p "You are working on the admin dashboard at app/admin/golem/.

TASK: Improve the email section with these features:
1. Category drill-down: On the overview page, clicking an email category should navigate to /admin/golem/emails?category=X showing only senders in that category
2. Sender view: On the emails page, add a 'By Sender' tab showing all unique senders with email count, avg score, last seen. Clicking a sender expands to show all their emails.
3. Individual unsubscribe: Add an 'Unsubscribe' button on each email card that calls the existing bulkSetSenderAction server action with action='unsubscribe'
4. Unsubscribe history: New section/tab on emails page showing recent unsubscribe attempts from golem_events where type='email_unsubscribe_attempt'
5. Gmail filter badge: Small shield icon on senders that have been unsubscribed (check golem_events for success=true)

READ these files first:
- app/admin/golem/page.tsx (overview with email categories)
- app/admin/golem/emails/page.tsx (current email list)
- app/admin/golem/actions/data.ts (server actions)
- app/admin/golem/components/ (shared components)

Follow existing patterns. Use the same UI library and component patterns already in use.
Commit when done with: feat(admin): email category drill-down + sender view + unsubscribe improvements" --output-format text
```

---

## Prompt 6: Dashboard Job UI (Delegated Claude)

**Run from:** `~/Gits/etanheyman.com`
**Command:**
```bash
claude --dangerously-skip-permissions -p "You are working on the admin dashboard at app/admin/golem/.

TASK: Redesign the overview page as a job-search command center:

1. TOP CARD - Daily Job Digest:
   - 'X new matches today, Y high-score (8+), Z with connections'
   - Link to filtered job views for each number

2. ACTION PIPELINE - Visual flow:
   - Cards showing count per status: New → Reviewing → Applied → Interviewing → Offer/Rejected
   - Click a card → goes to /admin/golem/jobs?status=X

3. QUICK ACTIONS ROW:
   - 'View top matches' | 'Review saved' | 'Follow-ups due (N)'
   - Each links to filtered job view

4. DEPRIORITIZE:
   - Move Night Shift card to bottom of page
   - Remove Content section entirely (Soltome dropped)
   - Remove 'Content' from navigation in layout.tsx

5. JOB DETAIL IMPROVEMENTS (on /admin/golem/jobs):
   - Show match_reasons if available (array of strings like 'React: 5yr match')
   - Add status transition buttons: 'Mark Applied' | 'Interviewing' | 'Rejected'
   - Show connection info if job has warm lead (from job_connections table)

6. MERGE OUTREACH:
   - Remove standalone /admin/golem/outreach page
   - Remove 'Outreach' from navigation
   - Show outreach contacts inline in job detail when a connection match exists

READ these files first:
- app/admin/golem/page.tsx
- app/admin/golem/jobs/page.tsx
- app/admin/golem/actions/data.ts
- app/admin/golem/layout.tsx
- app/admin/golem/lib/constants.ts

Follow existing patterns. Commit: feat(admin): job-search command center redesign" --output-format text
```

---

## Prompt 7: Outreach Strategy Research (Gemini)

**Command:**
```bash
gemini -p "Research LinkedIn outreach strategies for job referrals in 2026:
1. Direct referral request message vs multi-step warm approach (engage posts first, then DM)
2. Best templates for asking a connection for a job referral at their company
3. Personalization signals that increase response: shared history, mutual connections, endorsements
4. Timing: best time to send, optimal follow-up wait period
5. What NOT to do: common mistakes that get you ignored
6. Hebrew vs English: for Israeli tech connections, which language for outreach?
Output structured findings with example messages."
```

---

## Running Multiple Prompts in Parallel

You (the user) can run multiple of these simultaneously:

```bash
# Terminal 1: Research (all free, run together)
gemini -p "..." > phase-4-findings.md &
gemini -p "..." > phase-5-findings.md &
gemini -p "..." > phase-8-findings.md &

# Terminal 2: Code audit
cd ~/Gits/golems/packages/autonomous
cursor agent "..." --model gpt-5.2-codex-xhigh --output-format text > phase-1-findings.md

# Terminal 3: Dashboard (after backend is ready)
cd ~/Gits/etanheyman.com
claude --dangerously-skip-permissions -p "..." --output-format text > dashboard-output.md
```

Wait for research prompts before starting implementation. Dashboard prompts need backend APIs ready first.
