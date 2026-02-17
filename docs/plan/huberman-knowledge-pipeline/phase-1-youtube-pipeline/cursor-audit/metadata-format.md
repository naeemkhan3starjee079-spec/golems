# Metadata Format — All Fields

## Top-Level Chunk Dict (input to upsert_chunks)

These keys are read by `upsert_chunks` and written to the chunks table:

| Key | Required | Default | Written to DB |
|-----|----------|---------|---------------|
| `id` | Yes | — | chunks.id |
| `content` | Yes | — | chunks.content |
| `metadata` | Yes | — | chunks.metadata (JSON) |
| `source_file` | Yes | — | chunks.source_file |
| `project` | No | None | chunks.project |
| `content_type` | No | None | chunks.content_type |
| `value_type` | No | None | chunks.value_type |
| `char_count` | No | 0 | chunks.char_count |
| `source` | No | `"claude_code"` | chunks.source |

**Note:** `sender`, `conversation_id`, `position` exist as columns but are **not** written by `upsert_chunks`. They would need a schema/upsert extension.

## Metadata JSON (stored in chunks.metadata)

Arbitrary JSON. Common fields by source:

### Claude Code

```json
{}
```

Often empty. May contain block-level info from tool results.

### WhatsApp (from format_whatsapp_for_pipeline)

```json
{
  "source": "whatsapp",
  "contact": "Contact Name",
  "jid": "972544667708@s.whatsapp.net",
  "starred": false
}
```

### YouTube (recommended)

```json
{
  "source": "youtube",
  "video_id": "abc123",
  "title": "Video Title",
  "channel": "Channel Name",
  "timestamp": "00:05:30",
  "start_seconds": 330,
  "end_seconds": 390
}
```

## Valid source Values

From MCP schema and backfill-metadata:

| Value | Description |
|-------|-------------|
| `claude_code` | Claude Code conversations (default) |
| `whatsapp` | WhatsApp chat messages |
| `youtube` | YouTube transcripts |
| `all` | Search filter only (means "no filter") |

## content_type Values

From `classify.py` ContentType enum:

- `ai_code`, `stack_trace`, `user_message`, `assistant_text`
- `file_read`, `git_diff`, `build_log`, `dir_listing`, `config`
- `learning`, `skill`, `project_config`, `research`, `prd_archive`, `verification`, `documentation`
- `noise` (skipped)

For YouTube: use `assistant_text` (spoken content) or consider adding `transcript` if you extend the enum.

## value_type Values

- `high` — preserve verbatim
- `medium` — context-dependent
- `low` — summarize or mask

## Enrichment Fields (populated later by LLM)

Not in initial upsert; added by `update_enrichment`:

- `summary`, `tags`, `importance`, `intent`
- `primary_symbols`, `resolved_query`, `epistemic_level`, `version_scope`, `debt_impact`, `external_deps`
- `enriched_at`
