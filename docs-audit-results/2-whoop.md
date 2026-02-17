# Whoop Sync Schedule Audit

**Date:** 2026-02-17  
**Claim:** Whoop syncs 5x daily at 7am, 10am, 2pm, 5pm, 8pm (Israel/Asia/Jerusalem)

---

## Docs Verified

| Doc | Location | Whoop Schedule Stated | Match |
|-----|----------|----------------------|-------|
| `packages/services.md` | Cloud Worker table (line 46) | 5x daily (7am, 10am, 2pm, 5pm, 8pm) | ✅ |
| `deployment/railway.md` | Cloud Worker Schedule table (line 95) | 5x daily (7am, 10am, 2pm, 5pm, 8pm) | ✅ |
| `architecture.md` | Cloud Worker Schedule table (line 62) | 5x daily (7am, 10am, 2pm, 5pm, 8pm) | ✅ |
| `golems/coach.md` | Dashboard section (line 88) | 5x daily: 7am, 10am, 2pm, 5pm, 8pm | ✅ |
| `golems/coach.md` | Wiring section (line 92) | 5x daily (7am, 10am, 2pm, 5pm, 8pm) | ✅ |

---

## Implementation (cloud-worker.ts)

```typescript
// Lines 331-334
for (const hour of [7, 10, 14, 17, 20]) {
  scheduleDaily("WhoopSync", hour, syncWhoop);
}
```

| Hour (24h) | Time | Docs Say |
|------------|------|----------|
| 7 | 7am | 7am ✅ |
| 10 | 10am | 10am ✅ |
| 14 | 2pm | 2pm ✅ |
| 17 | 5pm | 5pm ✅ |
| 20 | 8pm | 8pm ✅ |

---

## Result

**No mismatches.** All 5 docs and both coach.md mentions correctly state Whoop sync at 7am, 10am, 2pm, 5pm, 8pm. The implementation in `cloud-worker.ts` uses exactly those hours (Israel time).
