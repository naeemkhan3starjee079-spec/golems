# UptimeRobot Monitoring Setup

This guide explains how to set up UptimeRobot to monitor the Golems cloud worker running on Railway.

## Overview

- **Service:** Cloud Worker (Railway) at `https://golems-production.up.railway.app`
- **Health Endpoint:** `/health` (JSON response with uptime, mode, Israel time, work hours)
- **Webhook Endpoint:** `/webhook/uptimerobot` (receives UptimeRobot alerts)
- **Notifications:** Route to Telegram `📡 Uptime` topic

## Step 1: Create UptimeRobot Account

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up for a **free account** (50 monitors included)
3. Verify email

## Step 2: Add HTTP Monitor

### In UptimeRobot Dashboard:

1. **Click "Add New Monitor"**
2. **Type:** Select `HTTP(s)`
3. **Monitor Name:** `Golems Cloud Worker`
4. **URL:** `https://golems-production.up.railway.app/health`
5. **Monitor Interval:** `5 minutes` (free plan minimum)
6. **HTTP Method:** `GET`
7. **Expected HTTP Code:** `200`
8. **Timeout:** `30 seconds`

### Optional Settings:

- **Alert Contacts:** Configure below (next step)
- **Tags:** Add `production`, `cloud-worker` for filtering
- **Status Page:** Add to public status page if desired

9. **Click "Create Monitor"** → You'll see real-time pings

## Step 3: Add Telegram Alert Contact (Webhook)

### Create Webhook Contact:

1. Go to **Settings** → **Alert Contacts**
2. **Click "Add Alert Contact"**
3. **Type:** Select `Webhook`
4. **Name:** `Telegram Uptime Topic`
5. **URL:**
   ```
   https://golems-production.up.railway.app/webhook/uptimerobot
   ```
6. **POST Value (send as POST data):**
   ```
   monitorFriendlyName=*monitorFriendlyName*&alertType=*alertType*&alertDetails=*alertDetails*
   ```
   _(This is UptimeRobot's default placeholder format - it auto-fills with actual values)_

7. **Click "Save"**

### Verify Webhook Format:

The webhook receives form-encoded POST:
- `monitorFriendlyName` - Name of the monitor (e.g., "Golems Cloud Worker")
- `alertType` - `1` (down) or `2` (up)
- `alertDetails` - Error message or "Monitor is up"

## Step 4: Set Up Telegram Topic

### Create/Verify Telegram Group Topic:

1. Open the Golems Telegram group (or create one with Topics enabled)
2. Go to **Group Info** → **Topics** (if not already enabled, enable it)
3. **Create new topic:** `📡 Uptime`
4. Note the **topic name** exactly as shown

### Register Topic with ClaudeGolem:

In the Telegram group, go to the `📡 Uptime` topic and run:
```
/setup uptime
```

ClaudeGolem will reply with the thread ID. It's now registered and ready to receive uptime alerts.

## Step 5: Configure Environment Variables

On Railway dashboard, set these environment variables:

```bash
# Existing (should already be set)
TELEGRAM_MODE=direct
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...  # Your group chat ID (negative number)

# New: Topic thread IDs (from /setup command above)
TELEGRAM_TOPIC_UPTIME=123456789    # Replace with actual thread ID from /setup
```

**To find your group chat ID:**
```bash
# Add @userinfobot to the group, it will show the group ID (negative number)
# Example: -1001234567890
```

## Step 6: Attach Webhook to Monitor

Back in **UptimeRobot Dashboard:**

1. Go to **Monitors** → Click on **"Golems Cloud Worker"**
2. **Edit** the monitor
3. Scroll to **Alert Contacts**
4. **Check the box** for "Telegram Uptime Topic" (webhook)
5. **Click "Save Changes"**

## Testing

### Manual Test:

1. In **UptimeRobot**, click the **"Test Alert"** button on your webhook contact
   - You should receive a test message in the Telegram `📡 Uptime` topic

2. Or simulate downtime by temporarily stopping the cloud worker on Railway (don't worry, it auto-restarts):
   - Check Railway dashboard
   - Wait 5-10 minutes for next check cycle
   - Alert should fire to Telegram

### Check Cloud Worker Health:

```bash
curl https://golems-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 3600,
  "backend": "haiku",
  "stateBackend": "supabase",
  "telegramMode": "direct",
  "israelTime": "2026-02-07 14:35:22",
  "isWorkHours": true,
  "isWorkday": true
}
```

## Alert Message Format

UptimeRobot alerts appear in the `📡 Uptime` topic as:

**When Down:**
```
📡 DOWN: Golems Cloud Worker

Connection timeout after 30 seconds
```

**When Back Up:**
```
📡 UP: Golems Cloud Worker

Monitor is up
```

## Monitoring Schedule

| Component | Check Interval | Type |
|-----------|---|------|
| Cloud Worker `/health` | 5 minutes | HTTP |
| Email Golem | Implicit (via healthcheck) | - |
| Job Golem | Implicit (via healthcheck) | - |
| Database | Monthly review | Manual |

## Disable/Remove Monitoring

If you need to:

### Pause Monitor (temporary):
- UptimeRobot Dashboard → Monitors → Click monitor → **"Pause Monitor"**

### Delete Monitor:
- UptimeRobot Dashboard → Monitors → Click monitor → **"Delete Monitor"**

### Disable Webhook:
- UptimeRobot Dashboard → Settings → Alert Contacts → Click webhook → **"Delete"**

## Troubleshooting

### Alert Not Arriving in Telegram

1. **Check UptimeRobot logs:**
   - UptimeRobot Dashboard → Monitor → **"Response Times"** tab
   - Look for recent checks and status codes

2. **Verify webhook URL is correct:**
   ```
   https://golems-production.up.railway.app/webhook/uptimerobot
   ```

3. **Check Railway logs:**
   - Railway Dashboard → Cloud Worker → **Deployments** tab
   - Look for webhook POST requests with status 200

4. **Verify Telegram env vars are set:**
   ```bash
   # In Railway dashboard → Cloud Worker → Variables
   TELEGRAM_MODE=direct ✓
   TELEGRAM_BOT_TOKEN=... ✓
   TELEGRAM_CHAT_ID=... ✓ (negative number for groups)
   TELEGRAM_TOPIC_UPTIME=... ✓
   ```

5. **Run setup command again:**
   - In Telegram group, `📡 Uptime` topic: `/setup uptime`
   - Confirm the thread ID matches `TELEGRAM_TOPIC_UPTIME` in Railway env

### "404 Not Found" on Health Check

- Cloud Worker is not running or crashed
- Check Railway dashboard → Deployments → logs
- Restart: Railway Dashboard → Cloud Worker → Restart

### "Connection timeout" Alerts (False Positives)

- Railway deployments cause brief downtime (~1-2 min)
- Normal during deploys or restarts
- Can be reduced by setting **Timeout to 60 seconds** if acceptable

## Advanced: Check Usage Stats

The cloud worker also exposes a usage endpoint for API cost tracking:

```bash
curl https://golems-production.up.railway.app/usage
```

Response:
```json
{
  "totalCalls": 1234,
  "totalInputTokens": 456789,
  "totalOutputTokens": 123456,
  "costUSD": 2.34,
  "bySource": {
    "email-golem": { "calls": 500, "cost": 1.23 },
    "job-golem": { "calls": 200, "cost": 0.45 },
    ...
  }
}
```

This is useful for tracking monthly spend.

## Free vs Paid Plans

| Feature | Free | Paid |
|---------|------|------|
| Monitors | 50 | Unlimited |
| Check Interval | 5 min | 1 min |
| Alert Contacts | Yes | Yes |
| Webhook Support | Yes | Yes |
| API Access | No | Yes |
| Status Page | Basic | Yes |

You likely don't need paid plan for one monitor.

## See Also

- **Cloud Worker Code:** `/src/cloud-worker.ts` (health endpoint at line 281)
- **Webhook Handler:** `/src/cloud-worker.ts` (webhook at line 304)
- **Telegram Routing:** `/src/lib/telegram-direct.ts` (topic routing)
- **Bot Setup:** `/src/telegram-bot.ts` (validTopics includes "uptime")
