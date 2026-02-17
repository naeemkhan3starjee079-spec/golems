# Whoop developer ecosystem: a complete integration guide for 2025–2026

**The Whoop API is publicly available, free, and production-ready — but it has sharp edges.** The official v2 API at developer.whoop.com provides solid coverage of recovery, sleep, strain, and workout data through OAuth 2.0, with real JSON response shapes that include per-sleep-stage durations, HRV, SpO2, and skin temperature. However, critical gaps remain: **no continuous heart rate time-series, no journal entries, and no Whoop 5.0-exclusive features** like Healthspan, VO2 Max, or Stress Monitor are exposed. For a personal health coaching app, the official API covers roughly 70% of what you'd want. The remaining 30% requires creative workarounds — CSV exports, Apple HealthKit bridging, or the reverse-engineered internal API (with TOS risk). This report maps every viable path.

---

## The official API is public, mature, and recently upgraded to v2

The Whoop Developer Platform launched September 1, 2022 and is **fully public with no waitlist**. Anyone with an active Whoop membership can register at the Developer Dashboard (https://developer-dashboard.whoop.com), create up to 5 apps, and start making API calls immediately against up to 10 users — no approval needed for development. Public launch beyond 10 users requires submitting for Whoop's app review via their Typeform at https://whoopinc.typeform.com/to/XmzituEp.

The **v2 API launched July 1, 2025**, introducing UUID-based identifiers for sleep and workout records (replacing v1's integer IDs), improved webhook semantics, and stricter score field handling. The v1 API and all v1 webhooks were **fully removed by November 2025**. A one-time migration endpoint exists at `GET /v1/activity-mapping/{activityV1Id}` for legacy ID lookups. The full API changelog lives at https://developer.whoop.com/docs/api-changelog/ and the downloadable OpenAPI spec is at `https://api.prod.whoop.com/developer/doc/openapi.json`.

**Base URL**: `https://api.prod.whoop.com/developer`

The complete v2 endpoint inventory:

| Endpoint | Method | Scope | Returns |
|----------|--------|-------|---------|
| `/v2/user/profile/basic` | GET | `read:profile` | Name, email, user_id |
| `/v2/user/measurement/body` | GET | `read:body_measurement` | Height, weight, max HR |
| `/v2/cycle` | GET | `read:cycles` | All cycles (paginated) — contains day strain, kilojoules, avg/max HR |
| `/v2/cycle/{cycleId}` | GET | `read:cycles` | Single cycle |
| `/v2/cycle/{cycleId}/sleep` | GET | `read:sleep` | Sleep for a cycle (new in v2) |
| `/v2/cycle/{cycleId}/recovery` | GET | `read:recovery` | Recovery for a cycle |
| `/v2/recovery` | GET | `read:recovery` | All recoveries — HRV, RHR, SpO2, skin temp, recovery score |
| `/v2/activity/sleep` | GET | `read:sleep` | All sleeps — stage durations, performance %, respiratory rate |
| `/v2/activity/sleep/{sleepId}` | GET | `read:sleep` | Single sleep by UUID |
| `/v2/activity/workout` | GET | `read:workout` | All workouts — strain, HR zones, distance, altitude |
| `/v2/activity/workout/{workoutId}` | GET | `read:workout` | Single workout by UUID |
| `/v2/user/access` | DELETE | any | Revoke OAuth access |

There is **no journal endpoint, no strain-specific endpoint** (strain lives inside cycle and workout score objects), and **no continuous heart rate endpoint**. Rate limits are **100 requests per minute and 10,000 per day** globally across all endpoints, with standard `X-RateLimit-Remaining` headers and HTTP 429 responses when exceeded. Increases are available by request.

### OAuth 2.0 flow and token management

The authorization code grant flow uses these URLs:

- **Authorize**: `https://api.prod.whoop.com/oauth/oauth2/auth`
- **Token**: `https://api.prod.whoop.com/oauth/oauth2/token`

Available scopes: `read:recovery`, `read:cycles`, `read:workout`, `read:sleep`, `read:profile`, `read:body_measurement`, and `offline` (required for refresh tokens). Access tokens expire in **3,600 seconds (1 hour)**. A critical gotcha: **refresh tokens are single-use** — when you exchange a refresh token, both the access and refresh tokens rotate, and the old refresh token is immediately invalidated. If your app makes concurrent refresh requests, only the first succeeds. Whoop explicitly recommends a background cron job for token refresh to avoid race conditions. Full OAuth documentation: https://developer.whoop.com/docs/developing/oauth/.

### Actual JSON response shapes

**Recovery** returns HRV (RMSSD in milliseconds), resting heart rate, SpO2, and skin temperature:
```json
{
  "cycle_id": 93845,
  "sleep_id": "123e4567-e89b-12d3-a456-426614174000",
  "score_state": "SCORED",
  "score": {
    "recovery_score": 44,
    "resting_heart_rate": 64,
    "hrv_rmssd_milli": 31.813562,
    "spo2_percentage": 95.6875,
    "skin_temp_celsius": 33.7
  }
}
```

**Sleep** includes per-stage millisecond breakdowns, sleep need decomposition, and nap detection:
```json
{
  "id": "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
  "nap": false,
  "score_state": "SCORED",
  "score": {
    "stage_summary": {
      "total_in_bed_time_milli": 30272735,
      "total_awake_time_milli": 1403507,
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
    "sleep_efficiency_percentage": 91.695
  }
}
```

**Cycle** (where day-level strain lives):
```json
{
  "id": 93845,
  "score": {
    "strain": 5.2951527,
    "kilojoule": 8288.297,
    "average_heart_rate": 68,
    "max_heart_rate": 141
  }
}
```

**Workout** includes HR zone durations, distance, and altitude:
```json
{
  "sport_name": "running",
  "score": {
    "strain": 8.2463,
    "average_heart_rate": 123,
    "max_heart_rate": 146,
    "kilojoule": 1569.34,
    "distance_meter": 1772.77,
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

All collection endpoints paginate with `nextToken`, max **25 records per page** (default 10), and support `start`/`end` datetime filters. There is **no documented limit on historical depth** — you can query back to the user's first day on Whoop.

---

## Community libraries: Python is your best bet, JavaScript is barren

The ecosystem is small. Whoop publishes no official SDKs in any language. The community has filled some gaps, but unevenly.

### Python: two real options

**`whoopy` by felixnext** (https://github.com/felixnext/whoopy) is the **recommended choice for 2026**. It targets the official v2 API, with the latest PyPI release (v0.3.0) from **July 14, 2025**. It supports async/await, **automatic OAuth token refresh with credential persistence**, Pydantic models, Pandas DataFrame integration, and built-in retry logic with exponential backoff. Install via `pip install whoopy`. It requires Python 3.10+ and includes a Streamlit data explorer. Despite having only ~4 GitHub stars, it is actively maintained with 38 commits, 0 open issues, and CI/CD via GitHub Actions.

**`whoop` by hedgertronic** (https://github.com/hedgertronic/whoop) has **89 stars** — the highest of any Whoop library — but is effectively abandoned. Its single PyPI release (v0.1.0) dates to **October 2022** with only 3 total commits. It provides a clean `WhoopClient` context manager and covers all 10 official endpoints, but it targets the v1 API and hasn't been updated for v2. Token refresh is partially supported but not automatic. Install via `pip install whoop` — but expect breakage with the current API.

**`WhoopAPI-Wrapper` by colinmacon** (https://github.com/colinmacon/WhoopAPI-Wrapper) uses the **reverse-engineered internal API** at `api-7.whoop.com`, giving access to granular HR data not available officially. Not on PyPI; requires git clone. High risk of breakage and TOS violations.

### JavaScript/TypeScript: no published npm packages

There is **no Whoop package on npm**. The closest options are:

- **`whoopskill` by koala73** (https://github.com/koala73/whoopskill) — a TypeScript CLI tool targeting the official v2 API with automatic token refresh and JSON output. Designed for automation and AI agents. Shows signs of active development (output references January 2026 dates). Not published to npm.
- **`whoop-mcp-server-claude` by nissand** (https://github.com/nissand/whoop-mcp-server-claude) — a Model Context Protocol server exposing 18+ Whoop endpoints to Claude Desktop. TypeScript, full OAuth 2.0, v2 API aware.
- **`whoopkit` by jacc** (https://github.com/jacc/whoopkit) — TypeScript SDK using the **unofficial** internal API with direct username/password login. The developer warns: "Nothing in this library is stable, tested, or should be considered for use in a production environment."

For JavaScript developers building a health coaching app, the pragmatic path is raw `fetch` calls with `passport-oauth2` for the OAuth flow, as Whoop's own docs suggest.

### Other languages

- **Go**: `ferueda/go-whoop` (https://github.com/ferueda/go-whoop) — client library; `karl-cardenas-coding/mywhoop` (https://github.com/karl-cardenas-coding/mywhoop) — CLI tool with JSON/XLSX export and exponential backoff.
- **OpenAPI codegen**: The official spec at `https://api.prod.whoop.com/developer/doc/openapi.json` can generate clients in any language via Swagger/OpenAPI generators.

---

## Integration landscape: official partners, middleware platforms, and community hacks

### Official first-party integrations

**Strava** receives one-way data (Whoop → Strava): heart rate, strain, recovery, sleep metrics, and GPS routes from Strain Coach. Cardio activities auto-upload; Strength Trainer workouts do not sync. Setup: Whoop app → Integrations → Strava.

**Apple Health** is bidirectional. Whoop writes active energy, SpO2 (daily average), respiratory rate, resting heart rate, sleep sessions, and workouts. Apple Health writes external workouts back to Whoop for activity classification. **Critical losses**: HRV is not synced (RMSSD vs SDNN incompatibility), continuous HR is not synced (only ~1 reading/day), and sleep stages collapse to just asleep/awake — losing the detailed light/deep/REM/SWS breakdown.

**Google Health Connect** (Android) is also bidirectional, launched mid-2023. This is not Google Fit directly, but Health Connect data is accessible to Google Fit. Whoop writes activity, sleep, and recovery data; reads imported activities from other apps.

**TrainingPeaks** receives nine Whoop metrics (recovery score, HRV, RHR, respiratory rate, sleep performance, hours of sleep, sleep needed, strain) one-way. Workouts are not sent.

### Developer middleware worth considering

For a health coaching app, these platforms can simplify multi-wearable integration:

- **Terra API** (https://tryterra.co/integrations/whoop) — normalizes Whoop data alongside 20+ other wearables via a single API with instant webhooks. The most mature option for multi-device apps.
- **Spike API** (https://www.spikeapi.com/blog/whoop-is-now-available-via-the-spike-api) — similar standardized access, launched April 2023.
- **ROOK** (https://support.tryrook.io/en/articles/8839664-whoop-integration-with-rook) — supports BYO credentials for Whoop.

### Home Assistant and workflow automation

**Home Assistant**: The HACS integration `prankstr/hassio-whoop` (https://github.com/prankstr/hassio-whoop) is the most polished community project. It exposes day strain, recovery score, HRV, RHR, SpO2, skin temperature, and per-stage sleep durations as HA sensors. An alternative Flask-based approach exists at `blaxkxanax/whoop-ha` (https://github.com/blaxkxanax/whoop-ha).

**Zapier and n8n have no official Whoop integration.** n8n users have connected via the generic HTTP Request node but report persistent OAuth token refresh failures (https://community.n8n.io/t/oauth2-issues-with-whoop/30063). **Make (Integromat)** has no official integration either, but developer Gordie White documented a successful custom Make app build with OAuth 2.0 and webhooks syncing Whoop workouts to Notion (https://medium.com/@gordiewhite/integrating-whoop-with-notion-using-make-48ae86a0e9f2).

No Huberman-specific app integrates with Whoop directly. **SensAI** (https://www.sensai.fit) is the closest — an AI-powered personal trainer in iOS beta that uses Whoop recovery/HRV data for personalized workout plans.

---

## When the official API falls short: unofficial approaches ranked by practicality

### CSV export: the simplest fallback

The Whoop mobile app (More → Data Export → Create Export) emails a ZIP file containing four CSV files: **workouts.csv**, **sleeps.csv**, **physiological_cycles.csv**, and **journal_entries.csv** — the only way to get journal data programmatically. Processing takes 30 minutes to 24 hours, with a limit of one export per day. Fields span 26+ columns per file, including data not available via the API (journal entries, detailed physiological metrics). Missing from exports: continuous HR timelines, steps, VO2 Max, stress scores, and Strength Trainer details. The third-party service **Whoop2CSV** (https://www.whoop2csv.com/) automates weekly/daily exports via OAuth with Google Sheets sync.

### The reverse-engineered internal API

The most comprehensive documentation lives in two repos. **pelo-tech/whoop-api-spec** (https://github.com/pelo-tech/whoop-api-spec, 23 stars) provides a full OpenAPI/Swagger spec for the internal API discovered via Chrome DevTools on app.whoop.com. **jacc/whoop-re** (https://github.com/jacc/whoop-re) documents the production API at `https://api.prod.whoop.com` with endpoints not in the official developer API: HR time-series at 6s/60s/600s intervals, sleep coaching recommendations, journal impact analysis, trend data, and community features. Authentication uses `https://api-7.whoop.com` with password-grant tokens that expire after 24 hours.

This approach gives the richest data — particularly **continuous heart rate at configurable sampling rates** — but carries real risk. Whoop's API Terms explicitly prohibit reverse engineering, and these internal endpoints can change without notice.

### BLE reverse engineering

**jogolden/whoomp** (https://github.com/jogolden/whoomp, 61 stars) is the most advanced hardware-level project. It uses Web Bluetooth to connect directly to Whoop 4.0 hardware, reading heart rate and historical data by reverse-engineering the device firmware. A companion project by **bWanShiTong** (https://github.com/bWanShiTong/reverse-engineering-whoop) documents BLE service characteristics and command bytes. These are experimental and require significant effort.

### Apple HealthKit as a proxy

Using HealthKit to access Whoop data is **feasible but severely limited**. You lose HRV entirely, get only ~1 HR reading per day instead of continuous data, lose sleep stage granularity (asleep/awake only vs. four stages), and miss skin temperature, strain scores, and journal entries. HealthKit only backfills ~7 days on initial setup. This approach is a last resort, not a primary strategy.

---

## The five gotchas that will shape your architecture

**First, the cycle-not-calendar data model.** Whoop organizes data by "physiological cycles" running sleep-to-sleep, not midnight-to-midnight. A cycle starting at 10pm Tuesday and ending at 11pm Wednesday doesn't align with either calendar day. Every developer building dashboards or daily summaries must handle this mapping explicitly.

**Second, token rotation is unforgiving.** Refresh tokens are single-use. When you exchange one, the old token is immediately invalidated and a new pair is issued. If your server crashes between receiving the new tokens and persisting them, the user must re-authorize. Concurrent refresh requests will fail — only the first succeeds. Build atomic token storage with locking.

**Third, webhooks are notifications, not payloads.** Whoop webhooks tell you *something changed* but don't include the data. You must call the API after every webhook to fetch current state. Webhooks can also be duplicated or missed entirely (5 retries over 1 hour, then dropped). Whoop recommends building a reconciliation job that polls periodically regardless of webhooks.

**Fourth, Whoop 5.0's new features are invisible to the API.** Despite launching in May 2025 with Healthspan, VO2 Max, Stress Monitor, ECG, and blood pressure insights, **none of these appear in the v2 API** as of February 2026. The API still returns the same fields as Whoop 4.0 — SpO2 and skin temperature were the last sensor additions. There's no announced timeline for 5.0-specific endpoints.

**Fifth, `score_state` demands defensive coding.** Every response can return `SCORED`, `PENDING_SCORE`, or `UNSCORABLE`. New users also have a multi-day calibration period where `user_calibrating: true`. Your app must gracefully handle missing scores, not just assume data is always present. In v2, score fields are only populated when all required inputs exist — there are no fallback values.

---

## Feasibility verdict for a health coaching app

Building a personal health coaching app on Whoop data is **clearly feasible** using the official v2 API. You get the core coaching inputs: recovery score, HRV, resting heart rate, sleep stage durations, sleep performance, strain, workout zones, respiratory rate, SpO2, and skin temperature. The `sleep_needed` decomposition (baseline + sleep debt + strain impact + nap offset) is particularly valuable for coaching logic. Historical data access is unlimited, and webhooks enable near-real-time updates.

The **`whoopy` Python library** (https://github.com/felixnext/whoopy) is the fastest path to a working prototype — it handles OAuth token refresh automatically, supports async, and returns typed Pydantic models. For JavaScript, you'll need to build your own OAuth wrapper around raw HTTP calls. If you want multi-wearable support from day one, **Terra API** (https://tryterra.co) abstracts Whoop alongside Oura, Garmin, Apple Watch, and others behind a single normalized API.

The biggest gap for coaching is the absence of journal entries from the API. If habit-tracking correlations are essential to your coaching model, plan to ingest **CSV exports** (which include journal_entries.csv) as a supplementary pipeline, or guide users to manually log habits within your own app. Continuous heart rate data is the other major gap — if your coaching requires HR time-series analysis, you'll need the reverse-engineered internal API (with its associated risks) or BLE heart rate broadcast for real-time sessions only.