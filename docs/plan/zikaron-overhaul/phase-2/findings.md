# Phase 2 Findings

## Decisions

- [03:10] BLOCKER: ChatStorage.sqlite does NOT exist at expected path. WhatsApp container dir exists but DB is gone (WhatsApp not installed or DB removed).
- [03:10] Decision: DO NOT delete existing WhatsApp chunks — they're the only copy (no chat export found either).
- [03:10] Adapted approach: Fix existing 16K chunks in-place instead of reimport.
  - Set content_type='user_message' for chunks >= 10 chars (11,687 chunks)
  - Leave <10 char chunks as NULL (emoji, single words — not worth enriching)
  - Keep existing sender values (all 'other' — can't determine without is_from_me)

## Research

- WhatsApp chunk IDs are `style_*` format — came from semantic style analysis pipeline, not direct extraction
- source_file = 'unknown' for all WhatsApp chunks
- Size distribution: 787 (<3 chars), 3873 (3-9), 8668 (10-49), 2764 (50-199), 255 (200+)

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Verify ChatStorage.sqlite | claude | done (NOT FOUND) |
| Backup WhatsApp chunks as JSON | claude | done (/tmp/whatsapp-chunks-backup-20260216.json, 11MB) |
| Fix content_type in DB | claude | done (11,687 rows updated) |
| Add whatsapp_message to classify.py | claude | done |
| Add min_char_count filter to extract_whatsapp.py | claude | done |
| Parameterize SQL query in extract_whatsapp.py | claude | done |

## Notes

- Full reimport requires reinstalling WhatsApp Desktop on Mac
- When ChatStorage.sqlite becomes available again, can run full Phase 2 (delete old + reimport with proper sender/is_from_me)
