# Phase 2: Huberman Episode Indexing

> [Back to main plan](../README.md)

## Goal

Index 8-10 key Huberman Lab episodes into Zikaron, creating a searchable knowledge base of evidence-based health protocols.

## Tools

- **Code:** Claude Code (Opus) — run the pipeline from Phase 1
- **Verification:** Zikaron MCP — verify indexed content is searchable

## Priority Episodes

| # | Episode | Why | Approx Length |
|---|---------|-----|---------------|
| 1 | Master Your Sleep (toolkit) | Core sleep protocol | ~2h |
| 2 | Using Light to Optimize Health | Circadian anchoring | ~2h |
| 3 | Science of Sleep, Dreams, Creativity | Sleep architecture, REM | ~2.5h |
| 4 | Cannabis, CBD & Health Effects | Weed + sleep | ~2h |
| 5 | Caffeine: Timing, Doses & Health | Caffeine protocol | ~2h |
| 6 | Fitness Toolkit: Protocol & Tools | Exercise timing | ~2h |
| 7 | NSDR: Non-Sleep Deep Rest | Relaxation protocol | ~1.5h |
| 8 | Sleep Toolkit 2.0 (if exists) | Updated sleep protocols | ~2h |

## Steps

1. Find exact YouTube URLs for each episode above
2. Run `index_youtube.py` on each episode (sequentially to avoid rate limits)
3. Verify search quality with test queries:
   - `zikaron search "morning light protocol" --source youtube`
   - `zikaron search "caffeine adenosine delay" --source youtube`
   - `zikaron search "cannabis REM sleep" --source youtube`
4. Log indexing stats (chunks per episode, total chunks, embedding time)
5. Document episode metadata in findings.md

## Depends On

- Phase 1 (YouTube pipeline must work first)

## Status

- [x] Find episode URLs (16 episodes found and indexed)
- [x] Index priority episodes (16 done: 1,799 chunks, 2M chars — includes core sleep/protocol episodes)
- [ ] Index remaining ~439 episodes (`index_youtube.py --channel UC2D2CMWXMOVWx7giW1n3LIg --resume`)
- [ ] Verify search quality with test queries
- [ ] Log final stats + update findings.md

### Indexed Episodes (16/~455)

| Video ID | Chunks | Chars |
|----------|--------|-------|
| t6RCTP4fc9Q | 221 | 253,258 |
| bdsc3Spm6Sw | 185 | 210,367 |
| gbQFSMayJxk | 179 | 205,687 |
| qzXU390N3vs | 172 | 191,123 |
| lEULFeUVYf0 | 163 | 182,231 |
| qGb7hYMlA3o | 160 | 178,447 |
| VPi_eWiaqdg | 160 | 181,892 |
| rAbJC-Qaw7Q | 154 | 175,900 |
| _Q4XT82yd-Q | 147 | 157,385 |
| fh2dBmLN-ZM | 42 | 42,272 |
| iNL_BFlHYZ8 | 37 | 38,896 |
| RmwbNdyrilk | 37 | 36,917 |
| NEkUNahduWY | 36 | 38,174 |
| BRG4_KfTxbs | 36 | 37,097 |
| JsICN9ZiSjA | 35 | 36,255 |
| 23t_ynq2tmk | 35 | 36,431 |

**To index full channel:** `python3 packages/zikaron/scripts/index_youtube.py --channel UC2D2CMWXMOVWx7giW1n3LIg --resume`
(10s delay between videos for rate limiting. ~7-8 hours for full channel. Run overnight.)
