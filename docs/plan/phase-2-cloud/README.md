# Phase 2: Cloud Offload

**Status:** ✅ DONE | **PR:** #9 | **Tests:** 376 pass

## What Was Built
- Railway deployment: cloud-worker.ts running email poller, job scraper, briefing, soltome learner
- Haiku 4.5 backend (cloud-llm.ts) with usage tracking
- Supabase state store (state-store.ts) replacing local JSON
- Smart scheduling: Israel timezone, work hours, 90% cost savings
- Telegram direct sender (dual-mode: local/direct)
- Data migration script (SQLite → Supabase)

## Architecture: Mac = Brain, Railway = Body
- **Cloud:** email poller, job scraper, briefing, soltome learner
- **Local:** telegram bot, night shift, notification server
