# Phase 3: Job Search Dashboard Redesign

> [Back to main plan](../README.md)

## Goal

Redesign the overview page as a job-search command center. Daily digest, action pipeline, warm leads. Make the dashboard the first thing you check in the morning.

## Tools

- **Research:** None needed
- **Code (backend):** Opus direct — new aggregation endpoints
- **Code (frontend):** Delegated Claude on `etanheyman.com`

## Steps

### Backend (golems/packages/autonomous)

1. **Daily job digest endpoint** — new MCP tool `job_dailyDigest`:
   ```typescript
   {
     newMatches: number,          // jobs found in last 24h
     highScore: number,           // jobs scoring 8+
     withConnections: number,     // jobs at companies where you have LinkedIn connections
     followUpsDue: number,        // applications needing follow-up
     topMatches: Job[],           // top 5 by score
     connectionMatches: Job[],    // jobs with warm leads (Phase 4 data)
   }
   ```

2. **Job action tracking** — extend job status flow:
   - Current: `new → viewed → saved → applied → archived`
   - Add: `interviewing → offer → rejected` with timestamps per transition
   - Migration: add `status_history JSONB` column to `golem_jobs`

3. **Match reasoning** — when JobGolem scores a job, store WHY:
   - Add `match_reasons TEXT[]` column: `["React: 5yr match", "TypeScript: exact", "Gap: leadership"]`
   - Extend matcher.ts to populate this

4. **Cover letter draft trigger** — new MCP tool `job_draftCoverLetter`:
   - Input: `jobId`
   - Uses CLI helper (Cursor/Codex) to draft based on: job description + profile.json + style card
   - Stores draft in `job_cover_letters` table
   - Returns draft for review

### Frontend (etanheyman.com) — DELEGATED

5. **Overview page redesign:**
   - **Top card:** Daily Job Digest — "12 new today, 3 high-score, 2 with connections"
   - **Action pipeline:** Visual flow cards: New (N) → Reviewing → Applied → Interviewing → Offer
   - **Quick actions row:** "View top matches" | "Review saved" | "Follow-ups due (N)"
   - **Deprioritize:** Night Shift card (move to bottom), remove Content section

6. **Job detail improvements:**
   - Full description display (scraped HTML rendered)
   - Match reasoning: "Matched: React, TypeScript, 3yr+. Gap: leadership"
   - "Draft cover letter" button → triggers `job_draftCoverLetter`
   - "Draft outreach" button → triggers RecruiterGolem (Phase 5)
   - Status transition buttons: "Mark as Applied" / "Interviewing" / "Rejected"

7. **Merge Outreach into Jobs:**
   - Remove standalone Outreach page from nav
   - Show outreach contacts inline with relevant jobs
   - "Warm leads" badge on jobs where LinkedIn connections exist

### Delegated Prompt

Write to `phase-3/delegated-prompt.md` with:
- Current page.tsx structure
- New component hierarchy
- API endpoints (existing + new from steps 1-4)
- Design direction: job-focused, actionable, morning dashboard

## Depends On

- Phase 1 (Soltome removed, cleaner codebase)
- Phase 4 partially (connection data for "with connections" count — can stub initially)

## Status

- [ ] Backend: daily digest endpoint
- [ ] Backend: job action tracking + migration
- [ ] Backend: match reasoning in matcher
- [ ] Backend: cover letter draft trigger
- [ ] Write delegated prompt for frontend
- [ ] Frontend: overview page redesign
- [ ] Frontend: job detail improvements
- [ ] Frontend: merge outreach into jobs
- [ ] Tests pass (both repos)
- [ ] Committed (both repos)
