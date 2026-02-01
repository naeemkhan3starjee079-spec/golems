# Centralized MCP Secrets

> Single 1Password auth prompt for ALL MCP secrets across all agents.

## Problem Solved

Previously, each MCP with `op://` references triggered separate 1Password auth prompts. Opening Cursor with 6 MCPs = 6 auth prompts.

Now: **One auth prompt loads ALL secrets.**

## Architecture

```
~/.config/mcp-secrets/
├── secrets.env          # op:// references for all MCP secrets
├── secrets.env.example  # Safe to share (no secrets)
└── mcp.example.json     # MCP config template

Wrapper scripts (one auth for all):
├── cursor-secure        # Launch Cursor with secrets
├── claude-secure        # Launch Claude Code with secrets
└── with-secrets         # Run any command with secrets
```

## How It Works

1. **secrets.env** contains op:// references:
   ```bash
   TEMPMAIL_API_KEY="op://development/tempmail/password"
   CONTEXT7_API_KEY="op://development/context7/API_KEY"
   SUPABASE_ACCESS_TOKEN="op://Domica/mcp-supabase/ACCESS_TOKEN"
   ```

2. **Wrapper scripts** use `op run`:
   ```bash
   op run --env-file ~/.config/mcp-secrets/secrets.env -- cursor
   ```

3. **MCP configs** use empty `env: {}`:
   ```json
   {
     "mcpServers": {
       "tempmail": {
         "command": "npx",
         "args": ["-y", "mcp-server-tempmail"],
         "env": {}
       }
     }
   }
   ```
   MCPs inherit environment variables from their parent process.

## Usage

### Launch Apps with Secrets

```bash
# From terminal (recommended)
cursor-secure           # Cursor with all MCP secrets
claude-secure           # Claude Code with all MCP secrets
with-secrets <command>  # Any command with secrets
```

### Add New Secrets

1. Add to 1Password (development vault recommended)
2. Add op:// reference to `~/.config/mcp-secrets/secrets.env`
3. Update `secrets.env.example` (without actual values)

### Project-Specific Secrets

For project-specific secrets (like Supabase per project):
- Add all to `secrets.env` (one active at a time), OR
- Create project-specific secrets.env and switch between them

## Files

| File | Location | Gitignored | Purpose |
|------|----------|------------|---------|
| secrets.env | ~/.config/mcp-secrets/ | N/A (not in repo) | op:// references |
| secrets.env.example | ~/.config/mcp-secrets/ | No | Template |
| .mcp.json | Project root | Yes (global) | Actual MCP config |
| .mcp.example.json | Project root | No | Template for team |

## Global Gitignore

These patterns are globally gitignored:
```
.env
.env.local
.env.*.local
.mcp.json
mcp-secrets.json
```

Allowed (safe to commit):
```
.env.example
.env.template
.mcp.example.json
```

## Migration

### From Hardcoded Secrets

1. Move secret to 1Password (development vault)
2. Add op:// reference to `~/.config/mcp-secrets/secrets.env`
3. Change MCP config from:
   ```json
   "env": { "API_KEY": "actual-secret" }
   ```
   to:
   ```json
   "env": {}
   ```
4. Remove from git tracking:
   ```bash
   git rm --cached .mcp.json
   ```

### From Per-MCP op:// References

Same as above - centralize all op:// refs in secrets.env instead of per-MCP.

## Troubleshooting

### Still getting multiple prompts?
- Make sure you're using `cursor-secure` / `claude-secure`, not the raw app
- Check that secrets.env has all needed secrets

### MCP not getting environment variable?
- Verify the env var name matches what MCP expects
- Check `op run --env-file secrets.env -- printenv` to see what's loaded

### GUI launch (Dock/Spotlight) doesn't have secrets?
- GUI launches bypass the wrapper scripts
- Launch from terminal for now, or create Automator app wrapper
