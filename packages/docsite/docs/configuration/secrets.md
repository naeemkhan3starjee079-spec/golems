---
sidebar_position: 2
---

# Secrets Management

Golems uses **1Password** for secure secret storage. Never hardcode secrets or commit `.env` files to git.

## 1Password Setup

### Vault Items

Store your API keys in 1Password (in any vault you prefer):

| Secret Name | What to Store | Purpose |
|-------------|--------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Claude LLM calls (name the 1Password item anything you want) |
| `SUPABASE_URL` | Your Supabase project URL | Database connection |
| `SUPABASE_SERVICE_KEY` | Your service role key | Cloud database access (service_role, bypasses RLS) |
| `GMAIL_CLIENT_ID` | Google Cloud OAuth client ID | Gmail API access |
| `GMAIL_CLIENT_SECRET` | Google Cloud OAuth secret | Gmail OAuth |
| `GMAIL_REFRESH_TOKEN` | OAuth refresh token | Persistent Gmail access |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Telegram bot auth |
| `TELEGRAM_CHAT_ID` | Your chat/group ID | Notification destination |

## Accessing Secrets

### With 1Password CLI

Install 1Password CLI:

```bash
brew install 1password-cli
```

Sign in:

```bash
op signin
```

Read a secret:

```bash
op read "op://YOUR_VAULT/YOUR_ITEM/credential"
```

### In Shell Profile

Source secrets in your shell profile (e.g., `~/.zshrc`):

```bash
# Load Golems secrets
export ANTHROPIC_API_KEY=$(op read "op://YOUR_VAULT/YOUR_ANTHROPIC_ITEM/credential")
export SUPABASE_SERVICE_KEY=$(op read "op://YOUR_VAULT/YOUR_SUPABASE_ITEM/service_key")
export GMAIL_CLIENT_SECRET=$(op read "op://YOUR_VAULT/YOUR_GMAIL_ITEM/client_secret")
export TELEGRAM_BOT_TOKEN=$(op read "op://YOUR_VAULT/YOUR_TELEGRAM_ITEM/credential")
```

### In Railway (Production)

Railway environment variables are **plain text** (not 1Password). Copy values manually:

1. Read from 1Password:
   ```bash
   op read "op://YOUR_VAULT/YOUR_ANTHROPIC_ITEM/credential"
   ```

2. Paste into Railway dashboard → `Settings` → `Variables`

3. Redeploy:
   ```bash
   railway up
   ```

## .env File (Local Development Only)

Create `.env` in project root for local development:

```bash
# .env (NEVER commit this)
LLM_BACKEND=ollama
STATE_BACKEND=file
TELEGRAM_MODE=local
TZ=Asia/Jerusalem

ANTHROPIC_API_KEY=sk-ant-...
GMAIL_CLIENT_ID=abc123.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-...
GMAIL_REFRESH_TOKEN=1//...

TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-1001234567890
```

Add to `.gitignore`:

```bash
.env
.env.local
.env.*.local
```

## Key Rotation

When rotating API keys:

1. **Generate new key** in Anthropic/Supabase/Gmail console
2. **Update 1Password** item with new value
3. **Redeploy Railway** with new variable
4. **Monitor logs** for successful auth
5. **Revoke old key** in console after 24 hours of successful operation

### Key Rotation Best Practices

After rotating keys:

1. Monitor logs for 1+ week to ensure new key works
2. Search for any hardcoded references to old keys
3. Revoke old key in provider console (Anthropic/Supabase/etc.)
4. Document the change in your internal changelog

## Security Best Practices

- ✅ Store all secrets in 1Password
- ✅ Use service roles for database access (service_role key for cloud worker)
- ✅ Rotate keys every 90 days
- ✅ Monitor API usage in dashboards (Anthropic, Supabase, Gmail, Telegram)
- ✅ Never log sensitive values
- ✅ Use different keys per deployment (dev, staging, prod)

- ❌ Never hardcode secrets in code
- ❌ Never commit `.env` files
- ❌ Never share tokens in Slack/email
- ❌ Never use user tokens where service tokens exist

## See Also

- [Environment Variables](./env-vars.md) — Complete variable reference
- [Railway Deployment](../deployment/railway.md) — Production setup
