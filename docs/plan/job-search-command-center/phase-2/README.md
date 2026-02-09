# Phase 2: Email Dashboard Improvements

> [Back to main plan](../README.md)

## Goal

Add per-sender drill-down, individual unsubscribe, category browsing, and action logging. Make email triage faster and more transparent.

## Tools

- **Research:** None needed — requirements clear
- **Code (backend):** Opus direct on `golems/packages/autonomous`
- **Code (frontend):** Delegated Claude on `etanheyman.com`

## Steps

### Backend (golems/packages/autonomous)

1. **Unsubscribe action logging** — in `sender-tracker.ts`, after every unsubscribe attempt, write to `golem_events`:
   ```typescript
   logEvent({
     actor: 'emailgolem',
     type: 'email_unsubscribe_attempt',
     data: { sender, method: 'http_post'|'http_get'|'mailto', success: boolean, gmail_filter: boolean }
   })
   ```

2. **Senders-by-category endpoint** — new MCP tool `email_sendersByCategory`:
   - Query: `SELECT sender_email, category, count, avg_score, last_seen FROM email_senders GROUP BY category`
   - Returns senders grouped by their most common email category

3. **Single-email unsubscribe** — extend `email_setSenderAction` to accept optional `emailId` parameter:
   - If `emailId` provided: look up sender from that email, then call existing sender action
   - Makes it easy for frontend to wire "unsubscribe" button on individual emails

4. **Unsubscribe history endpoint** — new MCP tool `email_unsubscribeHistory`:
   - Query `golem_events` where `type = 'email_unsubscribe_attempt'`
   - Returns: sender, method, success, gmail_filter_created, timestamp

### Frontend (etanheyman.com) — DELEGATED

Write prompt to `phase-2/delegated-prompt.md`, then run:
```bash
cd ~/Gits/etanheyman.com && claude --dangerously-skip-permissions -p "$(cat ~/Gits/golems/docs/plan/job-search-command-center/phase-2/delegated-prompt.md)" --output-format text > ~/Gits/golems/docs/plan/job-search-command-center/phase-2/delegated-output.md 2>&1
```

Frontend changes needed:
5. **Category drill-down** on overview page: click email category → navigate to emails page filtered by that category → show senders list with counts + avg scores
6. **Sender view** on emails page: click sender row → expand to show all emails from that sender + unsubscribe button
7. **Individual unsubscribe button** on each email card (calls `email_setSenderAction` with the sender)
8. **Unsubscribe history section** on emails page: tab or section showing action log with success/fail status
9. **Gmail filter badge**: small icon on senders that have active Gmail filters

## Depends On

- Phase 0 (service status fix — same branch possible)
- Phase 1 (Soltome removal — clean codebase first)

## Status

- [ ] Backend: unsubscribe action logging
- [ ] Backend: senders-by-category MCP tool
- [ ] Backend: single-email unsubscribe parameter
- [ ] Backend: unsubscribe history MCP tool
- [ ] Write delegated prompt for frontend
- [ ] Frontend: category drill-down
- [ ] Frontend: sender view expansion
- [ ] Frontend: individual unsubscribe button
- [ ] Frontend: unsubscribe history section
- [ ] Frontend: Gmail filter badge
- [ ] Tests pass (both repos)
- [ ] Committed (both repos)
