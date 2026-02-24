---
name: 1password
description: Use when managing secrets, credentials, API keys, or vault operations. Supports Environments (Beta) for .env mounting. Covers 1password, secrets, op, vault, migrate, credentials. NOT for: non-secret config (use regular config files).
---

# 1Password Operations

## Prerequisites

```bash
op account list
```

If "not signed in": See [workflows/troubleshoot.md](workflows/troubleshoot.md)

## Quick Actions

| What you want to do | Workflow |
|---------------------|----------|
| Use 1Password Environments (preferred) | [workflows/use-environment.md](workflows/use-environment.md) |
| List secrets in vault | [workflows/list-secrets.md](workflows/list-secrets.md) |
| Add a new secret | [workflows/add-secret.md](workflows/add-secret.md) |
| Migrate .env to 1Password | [workflows/migrate-env.md](workflows/migrate-env.md) |
| Migrate MCP config secrets | [workflows/migrate-mcp.md](workflows/migrate-mcp.md) |
| Fix auth/biometric issues | [workflows/troubleshoot.md](workflows/troubleshoot.md) |

## Key Concepts

- **Environments (preferred for local dev):** Created in 1Password desktop app UI, mount .env as named pipe — secrets never on disk
- **`op run` / `op inject` (preferred for CI/CD):** CLI-based secret injection for automated pipelines
- **Reference format:** `op://vault/item/field` (e.g., `op://development/context7/API_KEY`)

## Safety Rules

1. Never log secret values — only masked versions
2. Use `--dry-run` before migration
3. Don't delete .env files — migration creates .env.template alongside
4. Verify vault access: `op vault list`
