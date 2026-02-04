# CodeRabbit False Positives & Out-of-Context Comments

> Document these for organization/project learnings to prevent repeat false positives.

## PR #2 (feat/content-pipeline-feb) - 2026-02-04

### 1. Notification API Source Values

**Comment:** `source: "jobs"` and `source: "email"` will be rejected by notification API (only accepts claude/ralph/nightshift)

**Reality:** The notification API in `telegram-bot.ts` has `SOURCE_CONFIG` that explicitly supports:
- `claude` → General topic
- `ralph` → Alerts topic
- `nightshift` → Night Shift topic
- `email` → Email topic
- `jobs` → Jobs topic
- `healthcheck` → Alerts topic

**Evidence:** `telegram-bot.ts` lines 1462-1500 define SOURCE_CONFIG with all these sources.

**Learning:** Notification API accepts: claude, ralph, nightshift, email, jobs, healthcheck (not just the original three).

---

### 2. Typing Heartbeat Missing

**Comment:** Long-running pipeline needs 60s typing heartbeat to prevent stalled appearance.

**Reality:** Already implemented. CLAUDE.md documents "Typing heartbeat every 60s while Claude works" as a feature.

**Learning:** Check CLAUDE.md for documented features before flagging as missing.

---

### 3. SUPABASE_SERVICE_KEY vs ANON_KEY

**Comment:** Using SERVICE_KEY contradicts coding guidelines that say to use ANON_KEY.

**Reality:** Intentional design change. Server-side code that needs to bypass RLS requires SERVICE_KEY. This was explicitly changed in security hardening commit `238f590`.

**Learning:** Server-side Supabase operations may intentionally use SERVICE_KEY to bypass RLS. ANON_KEY guideline applies to client-side code.

---

### 4. Test Isolation (Fixed TEST_BASE)

**Comment:** Tests use fixed `/tmp/content-pipeline-test` which can collide in parallel runs.

**Reality:** Tests are not run in parallel in this project. Sequential test execution is fine. The cleanup in afterEach ensures isolation.

**Learning:** Consider project's actual test execution model before flagging isolation issues.

---

### 5. Influencer Retries Don't Use Verification Feedback

**Comment:** Retries should incorporate previous verification feedback into the prompt.

**Reality:** This is a feature enhancement request, not a bug. Current behavior is intentional MVP - verification feedback is shown to human reviewer who decides next steps.

**Learning:** Distinguish between "bug" and "feature request" in reviews.

---

## How to Add These to CodeRabbit

1. Go to CodeRabbit dashboard → Organization Settings → Learnings
2. Or add to `.coderabbit.yaml` in repo root under `learnings` section
3. Or comment on PR with `@coderabbitai learn: <learning>`

Example:
```
@coderabbitai learn: In this repo, the notification API (telegram-bot.ts SOURCE_CONFIG) accepts sources: claude, ralph, nightshift, email, jobs, healthcheck - not just the original three.
```
