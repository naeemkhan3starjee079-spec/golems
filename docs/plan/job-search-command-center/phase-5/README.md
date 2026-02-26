# Phase 5: RecruiterGolem Upgrade

> [Back to main plan](../README.md)

## Goal

When you say "draft" on a connection match, RecruiterGolem creates a personalized outreach strategy — not just a canned message. Uses your style card, connection context, and smart CLI helpers for cost efficiency.

## Tools

- **Research:** Gemini — "message vs strategy, what converts better for LinkedIn referral requests"
- **Code:** Opus orchestration + CLI helpers for drafting

## The Flow

```
User replies "draft" to Telegram notification
  ↓
RecruiterGolem activates with context:
  - Job details (title, company, description, match reasons)
  - Connection details (name, position, relationship strength)
  - Your style card (formality, language, tone from Zikaron)
  - Your profile.json (experience, skills)
  ↓
CLI helper (Cursor gpt-5.2 or Codex 5.3) generates:
  - Approach angle ("You both worked at X" or "You share Y skill")
  - Suggested message (in YOUR voice, Hebrew/English as appropriate)
  - Follow-up timing ("Wait 3 days, then...")
  - Alternative: engage with their posts first strategy
  ↓
Draft stored in Supabase → shown on dashboard for review
  ↓
You approve/edit → RecruiterGolem tracks status
```

## Steps

### 1. Research Phase (background)

```bash
gemini -p "Research LinkedIn outreach for job referrals:
1. Direct message asking for referral vs multi-step strategy (engage posts first, then DM) - which converts better?
2. Best message templates for asking a 2nd-degree connection for a referral
3. How to personalize: what signals (shared company history, shared skills, endorsements) increase response rate?
4. Optimal timing: when to send, how long to wait for follow-up
5. What NOT to do: common mistakes in LinkedIn referral requests
Output structured findings." > docs/plan/job-search-command-center/phase-5/findings.md 2>&1
```

### 2. Style Card Integration

- Read `~/.golems-zikaron/style/semantic-style-data.json`
- Extract relevant fields: formality level, language preferences, typical message length
- Pass to drafting prompt as context

### 3. Outreach Drafting via CLI Helper

Create `src/recruiter-golem/draft-outreach.ts`:
```typescript
async function draftOutreach(job: Job, connection: LinkedInConnection, style: StyleCard): Promise<OutreachDraft> {
  const prompt = buildDraftPrompt(job, connection, style);
  // Use CLI helper for cost efficiency
  const result = await runCliHelper('cursor', prompt, { model: 'gpt-5.2-codex-xhigh' });
  return parseDraft(result);
}
```

The draft prompt includes:
- "You are writing as Etan Heyman. His style: [style card excerpt]"
- "Job: [title] at [company]. Match: [reasons]"
- "Connection: [name], [position] at [company]. Relationship: [strength]"
- "Generate: (1) approach angle, (2) message draft, (3) follow-up plan, (4) what to mention/avoid"

### 4. Supabase Table

```sql
CREATE TABLE outreach_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES golem_jobs(id),
  connection_id UUID REFERENCES linkedin_connections(id),
  approach_angle TEXT,
  message_draft TEXT,
  followup_plan TEXT,
  status TEXT DEFAULT 'pending', -- pending/approved/sent/replied
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5. Telegram Integration

- "draft" reply → triggers `draftOutreach()`
- Show draft preview in Telegram (short version)
- "Full draft on dashboard" link
- Approval: "approve" / "edit" / "skip"

### 6. Dashboard: Outreach Drafts Section

In job detail view:
- "Outreach draft ready" badge
- Show: approach angle, message preview, follow-up plan
- Approve / Edit / Reject buttons
- Copy-to-clipboard for the final message

## Depends On

- Phase 4 (LinkedIn connections + job_connections data)
- Style card data in `~/.golems-zikaron/style/semantic-style-data.json`

## Status

- [x] Run outreach research (Gemini 429'd, wrote findings manually)
- [x] Review research findings
- [x] Style card integration (uses existing style-adapter.ts)
- [x] Draft outreach function (`draft-outreach.ts` — approach angle, message, follow-up, notes)
- [x] Supabase migration for outreach_drafts (009_outreach_drafts.sql, applied)
- [x] MCP tools (outreach_draftForMatch, outreach_getDrafts, outreach_updateDraft)
- [x] Tests pass (20 new tests, 849 total pass)
- [ ] Telegram "draft" command handler
- [ ] Dashboard outreach drafts section (delegated)
- [ ] Committed
