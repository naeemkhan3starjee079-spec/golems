# Phase 7: WhatsApp & Style

> [Back to main plan](../README.md)

## Goal

Fix the WhatsApp enrichment gap (18.5% -> ~49%) by implementing source-aware thresholds, then regenerate the style card (v3) from the full DB including newly-enriched short messages.

## Tools

- **Code:** Python (TDD for threshold, script for style card)
- **MCPs:** None (runs in brainlayer repo)

## Steps

### Source-Aware Enrichment Threshold

1. Write failing tests in `tests/test_enrichment_threshold.py`:
   - `source_aware_min_chars("whatsapp")` returns 15
   - `source_aware_min_chars("claude_code")` returns 50
   - `source_aware_min_chars("youtube")` returns 50
   - `source_aware_min_chars("unknown")` returns 50 (default)
2. Run tests to verify they fail
3. Implement `source_aware_min_chars()` function in `src/brainlayer/vector_store.py`:
   - Lookup dict: `{"whatsapp": 15, "claude_code": 50}`
   - Default: 50
4. Update `get_unenriched_chunks()` to accept `source` parameter and use `source_aware_min_chars()` for effective threshold
5. Run tests to verify they pass
6. Commit threshold feature

### Run WhatsApp Enrichment

7. Run enrichment on newly-eligible WhatsApp chunks: `brainlayer enrich --source whatsapp --batch-size 100`
8. Verify: WhatsApp enrichment goes from 18.5% -> ~49% (4,966 new chunks enriched)

### Regenerate Style Card v3

9. Create `scripts/generate_style_card.py`:
   - Pull ALL user messages from DB (not just enriched) -- style works on raw text
   - Include short messages >= 10 chars (filter pure noise like "ok", "yes")
   - Sample 20K messages across all sources
   - Run through `SemanticStyleAnalyzer`
   - Save to `~/.local/share/brainlayer/storage/golems/docs.local/`
10. Run the script
11. Compare v3 with v2 (`~/.golems-zikaron/style/style-card-v2.md`)
12. Commit the script (NOT the output -- personal data)

## Depends On

- Phase 2 (needs renamed package)
- Phase 5 (needs brainlayer installed and working)

## Context

- **Current state:** WhatsApp only 18.5% enriched because `get_unenriched_chunks()` has hardcoded `min_char_count=50`
- **Root cause:** `vector_store.py:709` -- 4,966 meaningful WhatsApp messages (20-50 chars) being skipped
- **Examples of skipped messages:** "see you tonight probably", "Got an answer from university of maryland?"
- **Last style card:** v2 on Feb 12 with ~11.6K enriched chunks. Now we have 144K enriched chunks.
- **Style analysis reads raw text** -- doesn't depend on enrichment fields, but MORE enriched data = better context

## Status

- [ ] Write + run failing threshold tests
- [ ] Implement source_aware_min_chars()
- [ ] Update get_unenriched_chunks() with source param
- [ ] Verify threshold tests pass
- [ ] Commit threshold feature
- [ ] Run WhatsApp enrichment (~5K new chunks)
- [ ] Create generate_style_card.py script
- [ ] Run style card generation
- [ ] Compare v3 vs v2
- [ ] Commit script (not output)
