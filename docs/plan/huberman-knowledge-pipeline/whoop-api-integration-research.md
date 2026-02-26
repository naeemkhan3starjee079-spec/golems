# Whoop API integration for a Huberman-powered coaching system

**Whoop has a fully public, free REST API (v2, launched July 2025) that exposes recovery, sleep, strain, and workout data — everything needed to build a biometric coaching engine.** The API uses OAuth 2.0, supports webhooks for real-time data push, and covers all critical metrics except journal entries. Combined with Huberman's protocols, you can build decision logic around wake time, recovery score, HRV trends, and sleep architecture to generate personalized daily coaching triggers. This report provides every endpoint, field name, response shape, and integration pattern needed to write TypeScript code against this API today.

The official API is the clear path forward — Apple Health loses too much data (no HRV, no sleep stages), and third-party aggregators like Terra ($399/mo) are overkill for a personal system. Journal data requires CSV export workarounds, but the core biometric pipeline is clean and well-documented.

---

## 1. API access is free, fully documented, and production-ready

Whoop's Developer Platform launched its **v2 API in July 2025**, replacing the deprecated v1. Registration is free — the only requirement is an active Whoop membership and device.

**Base URL:** `https://api.prod.whoop.com/developer/`  
**Docs:** https://developer.whoop.com/api/  
**Dashboard:** https://developer-dashboard.whoop.com  
**OpenAPI Spec:** `https://api.prod.whoop.com/developer/doc/openapi.json`

### Registration steps

Sign in at the developer dashboard with your Whoop credentials, create a Team, then create an App (up to 5 per team). Configure scopes, redirect URIs, and optional webhook URLs. You receive a **Client ID** and **Client Secret** immediately. Apps must be submitted for approval before third-party users can connect, but your own account works instantly during development.

### OAuth 2.0 authorization code flow

| Component | URL |
|-----------|-----|
| Authorization | `https://api.prod.whoop.com/oauth/oauth2/auth` |
| Token | `https://api.prod.whoop.com/oauth/oauth2/token` |

**Scopes:** `read:recovery`, `read:cycles`, `read:workout`, `read:sleep`, `read:profile`, `read:body_measurement`, `offline` (for refresh tokens)

**Access tokens expire in 3,600 seconds (1 hour).** Always request the `offline` scope to receive a refresh token. When refreshing, the old refresh token is invalidated — only the first concurrent refresh request succeeds. Store both tokens atomically.

```typescript
// Token refresh — Bun-compatible
const refreshTokens = async (refreshToken: string): Promise<AuthResult> => {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
    scope: 'offline',
    refresh_token: refreshToken,
  });
  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json(); // { access_token, refresh_token, expires_in: 3600, token_type: 'bearer' }
};
```

### Rate limits

**100 requests per minute, 10,000 per day** — generous for a personal coaching app. Response headers `X-RateLimit-Remaining` and `X-RateLimit-Reset` let you track usage. Exceeding limits returns HTTP 429. Pagination uses `nextToken` with a max page size of **25 records**.

---

## 2. Complete data model with exact field names and types

### Recovery — the core coaching signal

**Endpoint:** `GET /v2/cycle/{cycleId}/recovery` or `GET /v2/recovery` (paginated)  
**Scope:** `read:recovery`

```json
{
  "cycle_id": 93845,
  "sleep_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": 10129,
  "score_state": "SCORED",
  "score": {
    "user_calibrating": false,
    "recovery_score": 44,
    "resting_heart_rate": 64,
    "hrv_rmssd_milli": 31.813562,
    "spo2_percentage": 95.6875,
    "skin_temp_celsius": 33.7
  }
}
```

| Field | Type | Unit | Range | Notes |
|-------|------|------|-------|-------|
| `recovery_score` | integer | % | 0–100 | Calculated once on waking, does not change during the day |
| `hrv_rmssd_milli` | float | ms | ~10–200+ | RMSSD during slow-wave sleep; **most heavily weighted input** (~65%) |
| `resting_heart_rate` | integer | bpm | ~40–80 | Measured during sleep (~20% weight) |
| `spo2_percentage` | float | % | ~88–100 | Whoop 4.0+ only |
| `skin_temp_celsius` | float | °C | ~30–38 | Skin temperature reading |
| `user_calibrating` | boolean | — | — | True during first ~14 days of use |

**Recovery color thresholds (confirmed from official Whoop 101 docs):**
- 🟢 **Green: 67–100%** — well recovered, prime for high strain
- 🟡 **Yellow: 34–66%** — maintaining, moderate capacity
- 🔴 **Red: 0–33%** — rest needed

The algorithm normalizes each metric against the user's **personal 30-day baseline** with dynamic weighting. No external age/sex norms are applied. If HRV drops sharply while RHR holds steady, HRV's influence increases automatically.

### Sleep — detailed stage architecture

**Endpoint:** `GET /v2/activity/sleep` or `GET /v2/activity/sleep/{sleepId}`  
**Scope:** `read:sleep`

```json
{
  "id": "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
  "start": "2022-04-24T02:25:44.774Z",
  "end": "2022-04-24T10:25:44.774Z",
  "nap": false,
  "score_state": "SCORED",
  "score": {
    "stage_summary": {
      "total_in_bed_time_milli": 30272735,
      "total_awake_time_milli": 1403507,
      "total_no_data_time_milli": 0,
      "total_light_sleep_time_milli": 14905851,
      "total_slow_wave_sleep_time_milli": 6630370,
      "total_rem_sleep_time_milli": 5879573,
      "sleep_cycle_count": 3,
      "disturbance_count": 12
    },
    "sleep_needed": {
      "baseline_milli": 27395716,
      "need_from_sleep_debt_milli": 352230,
      "need_from_recent_strain_milli": 208595,
      "need_from_recent_nap_milli": -12312
    },
    "respiratory_rate": 16.11328125,
    "sleep_performance_percentage": 98,
    "sleep_consistency_percentage": 90,
    "sleep_efficiency_percentage": 91.69
  }
}
```

All stage durations are in **milliseconds**. Total actual sleep = `total_in_bed_time_milli` − `total_awake_time_milli` − `total_no_data_time_milli`. The `start` field is bedtime; `end` is wake time. Total sleep need = sum of all four `sleep_needed` components. **Sleep latency is not exposed as a separate field** — you can approximate it from the gap between `start` and the first sleep stage, but this isn't directly available via the API.

Sleep debt is embedded in `need_from_sleep_debt_milli` — when this value is positive, the user has accumulated debt. The `nap` boolean distinguishes naps from primary sleep.

### Strain and workouts — the exertion picture

**Cycle (day strain):** `GET /v2/cycle` — Scope: `read:cycles`

```json
{
  "id": 93845,
  "start": "2022-04-24T02:25:44.774Z",
  "end": "2022-04-24T10:25:44.774Z",
  "score": {
    "strain": 5.2951527,
    "kilojoule": 8288.297,
    "average_heart_rate": 68,
    "max_heart_rate": 141
  }
}
```

**Workout (activity strain):** `GET /v2/activity/workout` — Scope: `read:workout`

```json
{
  "id": "ecfc6a15-...",
  "sport_name": "running",
  "sport_id": 1,
  "score": {
    "strain": 8.2463,
    "average_heart_rate": 123,
    "max_heart_rate": 146,
    "kilojoule": 1569.34,
    "percent_recorded": 100,
    "distance_meter": 1772.77,
    "altitude_gain_meter": 46.64,
    "zone_durations": {
      "zone_zero_milli": 300000,
      "zone_one_milli": 600000,
      "zone_two_milli": 900000,
      "zone_three_milli": 900000,
      "zone_four_milli": 600000,
      "zone_five_milli": 300000
    }
  }
}
```

Strain uses a **0–21 logarithmic scale** based on the Borg RPE scale. The logarithmic curve means going from 16→17 requires far more cardiovascular load than 4→5. Six HR zones map to percentage bands of max HR (zone 0 = below 50%, zone 5 = 90–100%). Day strain accumulates continuously but is **not the sum** of workout strains due to logarithmic compression.

### What is a "cycle"?

A Whoop cycle is the fundamental data unit: **the period from one sleep onset to the next sleep onset.** Each cycle contains exactly one primary sleep, one recovery score, accumulated day strain, and zero or more workouts. If the cycle is ongoing (user hasn't slept again), `end` is `null`. Whoop organizes by physiological cycles, not calendar days.

### Journal data — the API gap

**Journal entries are NOT available via the official API.** They exist only in the CSV data export (WHOOP app → Settings → Data Export). The export includes a `journal_entries.csv` file with all responses. You cannot programmatically create journal entries.

Whoop offers **140–300+ pre-defined behaviors** across categories: supplements (magnesium, melatonin, CBD, creatine, vitamin D), lifestyle (alcohol, caffeine, cannabis, late meal, screen time), recovery modalities (ice bath, sauna, massage, compression boots), sleep aids (sound machine, sleep mask, blue-light blocking glasses), and mental health (meditation, breathwork, therapy session). Users need at least 5 "yes" and 5 "no" responses per behavior over 90 days for Whoop to generate correlation insights.

**Workaround for automation:** Export CSV once daily (limited to 1 export/24 hours), or use whoop2csv.com for scheduled OAuth-based exports. Parse the `journal_entries.csv` and load into Supabase on a cron.

---

## 3. Huberman protocol × Whoop data mapping

Each mapping below uses exact API field names and includes decision logic ready to translate into TypeScript.

### Morning sunlight trigger

**Huberman says:** Get outdoor light within 30–60 minutes of waking. Clear sky: 10 minutes. Cloudy: 15–20 minutes. Overcast: 20–30 minutes. Sets a melatonin timer 14–16 hours later.

**Whoop field:** `sleep.end` (wake time, ISO 8601 UTC + `timezone_offset`)

```typescript
const wakeTime = new Date(sleep.end);
const sunlightDeadline = new Date(wakeTime.getTime() + 60 * 60 * 1000);
// Push notification: "Get outside for 10min sunlight before {sunlightDeadline}"
const predictedMelatoninOnset = new Date(wakeTime.getTime() + 16 * 3600 * 1000);
const idealBedtime = new Date(predictedMelatoninOnset.getTime() - 30 * 60 * 1000);
```

### Caffeine delay (90–120 minutes)

**Huberman says:** Wait 90–120 minutes after waking for caffeine. Allows cortisol awakening response to peak and clear residual adenosine. Exception: caffeine is acceptable if exercising intensely within 20 minutes of waking.

**Whoop fields:** `sleep.end` (wake time), `workout.start` (exercise timing)

```typescript
const earliestCaffeine = new Date(wakeTime.getTime() + 90 * 60 * 1000);
const cutoff = new Date(targetBedtime.getTime() - 10 * 3600 * 1000);
// If poor sleep night, extend delay to 120 min
if (sleep.score.sleep_performance_percentage < 70) {
  earliestCaffeine = new Date(wakeTime.getTime() + 120 * 60 * 1000);
}
```

### Cold exposure (recovery-gated)

**Huberman says:** 1–5 minutes at 37–59°F, 11 minutes total per week across 3+ sessions. Morning preferred. Never within 4 hours after strength training (suppresses hypertrophy).

**Whoop fields:** `recovery.score.recovery_score`, `workout.end`, `workout.sport_name`

```typescript
const recScore = recovery.score.recovery_score;
if (recScore >= 67) { // GREEN
  suggest({ type: 'cold_exposure', duration: '3-5 min', intensity: 'full' });
} else if (recScore >= 34) { // YELLOW
  suggest({ type: 'cold_exposure', duration: '1-3 min', intensity: 'moderate' });
} else { // RED
  if (recovery.score.resting_heart_rate > baseline_rhr + 5) {
    skip('cold_exposure', 'illness indicators detected');
  } else {
    suggest({ type: 'cold_exposure', duration: '1-2 min', intensity: 'gentle' });
  }
}
// Block if strength workout was < 4 hours ago
const lastStrengthWorkout = workouts.find(w => isStrength(w.sport_id));
if (lastStrengthWorkout && hoursSince(lastStrengthWorkout.end) < 4) {
  skip('cold_exposure', 'protect hypertrophy adaptation');
}
```

### NSDR suggestion (recovery + sleep debt gated)

**Huberman says:** 10–30 minutes, anytime. Especially after poor sleep, during afternoon dip, or upon waking with low recovery. A 30-minute session can restore energy equivalent to 2–3 hours of sleep. Daily 13-minute practice for 8 weeks improves attention and working memory.

**Whoop fields:** `recovery.score.recovery_score`, `sleep.score.sleep_performance_percentage`, `sleep.score.sleep_needed.need_from_sleep_debt_milli`

```typescript
const sleepDebtMs = sleep.score.sleep_needed.need_from_sleep_debt_milli;
const sleepDebtHours = sleepDebtMs / 3_600_000;
const sleepPerf = sleep.score.sleep_performance_percentage;
const recScore = recovery.score.recovery_score;

if (recScore < 34) {
  suggest({ type: 'nsdr', duration: 30, priority: 'high', reason: 'Red recovery' });
} else if (sleepPerf < 85 || sleepDebtHours > 1) {
  suggest({ type: 'nsdr', duration: 20, priority: 'medium', reason: `Sleep debt: ${sleepDebtHours.toFixed(1)}h` });
} else {
  suggest({ type: 'nsdr', duration: 13, priority: 'low', reason: 'Daily maintenance' });
}
```

### Recovery-based workout prescription

**Whoop fields:** `recovery.score.recovery_score`, `cycle.score.strain`

| Recovery | Workout Rx | Strain target | Huberman note |
|----------|-----------|---------------|---------------|
| 🟢 67–100% | Train as planned, high intensity OK | 14–17 | "This is the day to do your hardest session" |
| 🟡 34–66% | Reduce intensity 20%, swap HIIT for moderate cardio | 10–13 | Listen to body; if HRV declining 3+ days, rest |
| 🔴 0–33% | Active recovery or rest; do NSDR first | <10 | "Double up on workouts later in the week when recovered" |
| 🔴 2+ consecutive red days | Mandatory rest | 0 | Investigate cause: sleep debt, illness, overtraining |

### Supplement effectiveness tracking

**Whoop fields:** CSV `journal_entries.csv` (supplement logged) → next-day `recovery.score.recovery_score` delta

```typescript
// After importing journal CSV, correlate supplement nights with recovery
const supplementNights = journalEntries.filter(j => j.behavior === 'Magnesium' && j.answer === 'yes');
const noSupplementNights = journalEntries.filter(j => j.behavior === 'Magnesium' && j.answer === 'no');
const avgRecoveryWith = mean(supplementNights.map(n => getNextDayRecovery(n.date)));
const avgRecoveryWithout = mean(noSupplementNights.map(n => getNextDayRecovery(n.date)));
const delta = avgRecoveryWith - avgRecoveryWithout;
// Minimum sample: 5 yes + 5 no for statistical relevance (matches Whoop's own threshold)
```

### Cannabis and alcohol impact tracking

**Huberman says:** Alcohol fragments sleep and suppresses REM. Even one drink disrupts sleep architecture. THC suppresses REM sleep and creates REM debt. Maximum **2 drinks per week.**

**Whoop fields:** CSV journal (alcohol/cannabis logged) → `sleep.score.stage_summary.total_rem_sleep_time_milli`

```typescript
const remPctOnAlcohol = alcoholNights.map(n => {
  const sleep = getSleepForDate(n.date);
  const totalSleep = sleep.score.stage_summary.total_in_bed_time_milli 
    - sleep.score.stage_summary.total_awake_time_milli;
  return sleep.score.stage_summary.total_rem_sleep_time_milli / totalSleep * 100;
});
// Expect: REM% drops 15-30% on alcohol nights
// Track: HRV next day, recovery score delta
```

### Wind-down compliance validation

**Whoop fields:** `sleep.score.sleep_efficiency_percentage`, `sleep.score.sleep_consistency_percentage`

If sleep efficiency is trending up over 2+ weeks (approaching >91%) and consistency stays above 85%, the wind-down routine is working. Huberman recommends a 3-phase wind-down: dim lights 2 hours before bed, hot shower 90 minutes before bed, screens off 30 minutes before bed.

### Sleep shift tracking

**Whoop fields:** `sleep.start` (bedtime), `sleep.end` (wake time), `sleep.score.sleep_consistency_percentage`

Track the 7-day rolling average of both `start` and `end` timestamps. If the standard deviation of wake times exceeds 60 minutes, alert: "Inconsistent wake times — prioritize same wake time daily." Huberman emphasizes that **consistent wake time matters more than consistent bedtime.**

---

## 4. Integration architecture for TypeScript/Bun + Supabase

### Webhooks are your primary data channel

Whoop pushes `recovery.updated`, `sleep.updated`, `workout.updated` (and their `.deleted` variants) via HTTPS POST webhooks. **These are notifications only** — they contain `user_id`, `id`, `type`, and `trace_id` but not the actual data. You must call the API to fetch the full record.

**No webhooks exist for cycles (day strain)** — you must poll the `/v2/cycle` endpoint.

Webhook signature validation uses HMAC-SHA256:

```typescript
import { createHmac } from 'crypto';

const validateWebhook = (req: Request, body: string): boolean => {
  const timestamp = req.headers.get('X-WHOOP-Signature-Timestamp')!;
  const signature = req.headers.get('X-WHOOP-Signature')!;
  const expected = createHmac('sha256', process.env.WHOOP_CLIENT_SECRET!)
    .update(timestamp + body)
    .digest('base64');
  return signature === expected;
};
```

Retries: 5 attempts over ~1 hour for non-2XX responses. Use `trace_id` for deduplication.

### Data freshness timeline

- **Recovery score:** Finalizes when sleep ends (upon waking). Does **not** change during the day unless sleep is edited. Check `score_state === 'SCORED'` before reading.
- **Strain:** Updates continuously throughout the day. Poll every 15–30 minutes.
- **Sleep:** Available after sleep ends and is processed. Auto-detected or manually logged.
- **No real-time HR streaming** via the API — only aggregated metrics. Use BLE broadcast for live HR.

### Recommended sync architecture

```
┌──────────────────────────────────────────────────┐
│              Bun Application                      │
├────────────┬─────────────┬───────────────────────┤
│  Webhook   │ Reconciler  │  Whoop API Client     │
│  Handler   │ (15min cron)│  (auto token refresh) │
│  (POST)    │             │                       │
├────────────┴──────┬──────┴───────────────────────┤
│         Event Queue (dedup via trace_id)          │
├───────────────────┬──────────────────────────────┤
│         Supabase Client (upsert all data)         │
└───────────────────┼──────────────────────────────┘
                    ▼
            Supabase PostgreSQL (with RLS)
```

Webhooks handle sleep, recovery, and workout events. The reconciler cron polls cycles for strain data every 15 minutes and catches any missed webhook deliveries. Token refresh runs proactively at 50-minute intervals.

### Supabase schema

```sql
CREATE TABLE whoop_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whoop_user_id BIGINT UNIQUE NOT NULL,
  email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE whoop_cycles (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES whoop_users(whoop_user_id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  score_state TEXT NOT NULL,
  strain FLOAT,
  kilojoule FLOAT,
  average_heart_rate INT,
  max_heart_rate INT,
  raw_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE whoop_recoveries (
  cycle_id BIGINT PRIMARY KEY REFERENCES whoop_cycles(id),
  sleep_id UUID NOT NULL,
  user_id BIGINT NOT NULL,
  score_state TEXT NOT NULL,
  recovery_score FLOAT,
  resting_heart_rate FLOAT,
  hrv_rmssd_milli FLOAT,
  spo2_percentage FLOAT,
  skin_temp_celsius FLOAT,
  user_calibrating BOOLEAN,
  raw_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE whoop_sleeps (
  id UUID PRIMARY KEY,
  cycle_id BIGINT,
  user_id BIGINT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  is_nap BOOLEAN DEFAULT false,
  score_state TEXT NOT NULL,
  sleep_efficiency FLOAT,
  sleep_consistency FLOAT,
  sleep_performance FLOAT,
  respiratory_rate FLOAT,
  total_in_bed_ms BIGINT,
  total_awake_ms BIGINT,
  total_light_sleep_ms BIGINT,
  total_rem_sleep_ms BIGINT,
  total_sws_ms BIGINT,
  disturbance_count INT,
  sleep_need_baseline_ms BIGINT,
  sleep_need_debt_ms BIGINT,
  sleep_need_strain_ms BIGINT,
  sleep_need_nap_ms BIGINT,
  raw_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE whoop_workouts (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  sport_id INT,
  sport_name TEXT,
  score_state TEXT NOT NULL,
  strain FLOAT,
  average_heart_rate INT,
  max_heart_rate INT,
  kilojoule FLOAT,
  distance_meter FLOAT,
  zone_zero_ms BIGINT,
  zone_one_ms BIGINT,
  zone_two_ms BIGINT,
  zone_three_ms BIGINT,
  zone_four_ms BIGINT,
  zone_five_ms BIGINT,
  raw_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_events (
  trace_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for coaching queries
CREATE INDEX idx_recoveries_user ON whoop_recoveries(user_id);
CREATE INDEX idx_sleeps_user_time ON whoop_sleeps(user_id, start_time DESC);
CREATE INDEX idx_workouts_user_time ON whoop_workouts(user_id, start_time DESC);
CREATE INDEX idx_cycles_user_time ON whoop_cycles(user_id, start_time DESC);
```

Store `raw_json JSONB` on every table — if Whoop adds fields later, you won't lose data. Use `ON CONFLICT DO UPDATE` upserts everywhere since webhooks may fire multiple times.

### Multi-device and sync considerations

The Whoop band stores up to **3 days of data** when disconnected from the phone. Syncing 24 hours of stored data can take up to 1 hour. The phone app must be running in background (not force-quit) for continuous sync. Always check `score_state` before reading score data — `UNSCORABLE` means the band wasn't worn.

---

## 5. Apple Health is a poor fallback but workable in a pinch

If the Whoop API becomes inaccessible, Apple Health retains only a subset of Whoop data. The critical losses are severe:

- ❌ **HRV does not sync** — Apple Health uses SDNN; Whoop uses RMSSD. Incompatible units.
- ❌ **Sleep stages reduced to binary** — Apple Health gets "asleep" vs "awake" only, losing light/deep/REM breakdowns
- ❌ **Continuous heart rate does not sync** — only workout-associated HR
- ❌ **Skin temperature does not sync**
- ✅ Recovery score, Strain score, resting HR, SpO2, respiratory rate, and workout summaries do sync

### The viable bridge: Health Auto Export

**Health Auto Export** ($24.99 lifetime, iOS) reads Apple Health and POSTs JSON to any REST endpoint on a configurable schedule. Build a Supabase Edge Function to receive the payloads:

```typescript
// supabase/functions/health-import/index.ts
serve(async (req) => {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${Deno.env.get('HEALTH_EXPORT_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { data } = await req.json();
  const supabase = createClient(/* ... */);
  for (const metric of data.metrics) {
    await supabase.from('health_metrics').upsert(
      metric.data.map((d: any) => ({
        metric_name: metric.name, value: d.qty,
        recorded_at: d.date, source: 'apple_health'
      })),
      { onConflict: 'metric_name,recorded_at' }
    );
  }
  return new Response(JSON.stringify({ ok: true }));
});
```

Health Auto Export supports 150+ metrics, configurable aggregation intervals, custom authorization headers, and background sync (though iOS limits background execution to when the phone is unlocked).

### Third-party aggregators are overkill for personal use

**Terra API** ($399+/month) and **Vital/Junction** (enterprise pricing, demo required) both support Whoop and Apple Health with TypeScript SDKs, but their pricing makes them impractical for a single-user coaching system. The direct Whoop API is free and provides richer data than any aggregator would deliver through Apple Health.

---

## 6. Complete API endpoint reference

| Method | Path | Scope | Returns |
|--------|------|-------|---------|
| `GET` | `/v2/user/profile/basic` | `read:profile` | `user_id`, `email`, `first_name`, `last_name` |
| `GET` | `/v2/user/measurement/body` | `read:body_measurement` | `height_meter`, `weight_kilogram`, `max_heart_rate` |
| `GET` | `/v2/cycle` | `read:cycles` | Paginated cycles (strain, kJ, HR) |
| `GET` | `/v2/cycle/{cycleId}` | `read:cycles` | Single cycle |
| `GET` | `/v2/cycle/{cycleId}/recovery` | `read:recovery` | Recovery for cycle |
| `GET` | `/v2/cycle/{cycleId}/sleep` | `read:sleep` | Sleep for cycle |
| `GET` | `/v2/recovery` | `read:recovery` | Paginated recoveries |
| `GET` | `/v2/activity/sleep` | `read:sleep` | Paginated sleep records |
| `GET` | `/v2/activity/sleep/{sleepId}` | `read:sleep` | Single sleep (UUID) |
| `GET` | `/v2/activity/workout` | `read:workout` | Paginated workouts |
| `GET` | `/v2/activity/workout/{workoutId}` | `read:workout` | Single workout (UUID) |
| `DELETE` | `/v2/user/access` | Any OAuth | Revoke access, stop webhooks |

All collection endpoints accept `limit` (max 25), `start`, `end` (ISO 8601), and `nextToken` query parameters. Results return in descending order.

---

## Conclusion

The Whoop v2 API is a clean, well-documented REST interface that provides everything a Huberman-protocol coaching engine needs — recovery scores, HRV (RMSSD), detailed sleep stages, strain metrics, and workout HR zones — all for free. The single meaningful gap is journal data, which requires a CSV export workaround. The architecture pattern is straightforward: webhooks for sleep/recovery/workout events, a 15-minute cron for strain polling, hourly token refresh, and upserts into Supabase with raw JSON preserved for future-proofing.

The Huberman protocol mappings translate directly into deterministic if/then rules keyed on `recovery_score` thresholds (67/34), `sleep_performance_percentage`, `sleep_needed.need_from_sleep_debt_milli`, and wake time derived from `sleep.end`. The combination of these biometric signals with Huberman's evidence-based timing rules (90-min caffeine delay, recovery-gated cold exposure, NSDR for red recovery days) creates a coaching system that can generate specific, personalized daily action items the moment the user wakes up and their recovery score finalizes.

For the TypeScript/Bun implementation, generate types from the OpenAPI spec at `https://api.prod.whoop.com/developer/doc/openapi.json` using `openapi-typescript`, build a thin fetch-based client with proactive token refresh, and reference the `whoopskill` CLI repo for battle-tested OAuth patterns. No official SDK exists, but the API surface is small enough (~13 endpoints) that a hand-rolled typed client takes under a day to build.