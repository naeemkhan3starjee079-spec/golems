# Session Archiver

> Tiered archival for Claude Code sessions - keeps last N sessions per project, archives older to iCloud.

## Quick Start

```bash
# Dry run (see what would be archived)
bun run archive

# Execute (actually archive)
bun run archive:execute
```

## How It Works

1. Scans `~/.claude/projects/` for all session files
2. Groups sessions by project (using `.claude-project-id` if present)
3. Keeps the 7 most recent sessions per project
4. Archives older sessions to iCloud with metadata manifest

## Project Identification

Sessions are tagged with a **stable project ID** that survives repo moves.

### Adding a Project ID

Create `.claude-project-id` in your repo root:

```bash
echo "my-project-name" > .claude-project-id
```

### Updating the Registry

When repos move, update `~/.claude/project-registry.json`:

```json
{
  "projects": {
    "claude-golem": "/new/path/to/claude-golem",
    "my-project": "/path/to/my-project"
  }
}
```

## Archive Location

Archives go to iCloud:

```
~/Library/Mobile Documents/com~apple~CloudDocs/Archives/claude-sessions/
├── claude-golem/
│   └── archive-2026-02-01T12-00-00/
│       ├── manifest.json          # Metadata for re-indexing
│       ├── abc123.jsonl           # Session file
│       └── abc123/                # Optional subagent dir
├── golems-zikaron/
│   └── ...
```

## Re-Indexing Support

Each archive includes a `manifest.json`:

```json
{
  "archivedAt": "2026-02-01T12:00:00Z",
  "projectId": "claude-golem",
  "originalPath": "/Users/etanheyman/Gits/claude-golem",
  "sessions": [
    {
      "uuid": "abc123",
      "originalMtime": "2026-01-15T10:00:00Z",
      "size": 1234567,
      "hasSubdir": true,
      "firstMessageTimestamp": "2026-01-15T10:00:00Z",
      "gitBranch": "feature/foo"
    }
  ],
  "metadata": {
    "archiver_version": "1.0.0",
    "sessions_kept": 7,
    "total_archived": 50,
    "total_size_bytes": 123456789
  }
}
```

This preserves enough metadata to:
- Re-index with new embedding models
- Restore sessions if needed
- Track session history per project

## Scheduled Archival

Install the launchd job:

```bash
cp launchd/com.golems.session-archiver.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.golems.session-archiver.plist
```

Runs daily at 4 AM.

## Configuration

| Env Variable | Default | Description |
|--------------|---------|-------------|
| `SESSIONS_TO_KEEP` | `7` | Sessions to keep per project |

## Files

| File | Purpose |
|------|---------|
| `src/session-archiver.ts` | Main archiver script |
| `.claude-project-id` | Stable project ID (in each repo) |
| `~/.claude/project-registry.json` | Maps project IDs to paths |
| `launchd/com.golems.session-archiver.plist` | Scheduled run config |
