# Phase: Style Card v2 (Multi-Source Profiles)

> [Back to main plan](../README.md)

## Goal

Build per-context style profiles from multiple data sources: WhatsApp messages, Claude Code sessions, email writing, and eventually LinkedIn. Move from the current rule-based style card (emoji rates, informal markers) to semantic clustering by intent and topic.

## Current State

| Source | Data Available | Currently Used |
|--------|---------------|----------------|
| WhatsApp | Indexed in Zikaron (source=whatsapp) | Basic style metrics only |
| Claude Code | 238K+ chunks in Zikaron | Not used for style |
| Email | Gmail API (subjects, snippets, now bodies) | Not used for style |
| LinkedIn | Not yet — will add when Etan starts writing more | N/A |

### Existing Style Infrastructure
- `packages/shared/src/lib/style-export.ts` — Current rule-based style card
- `~/.golems-zikaron/style/semantic-style-data.json` — Style analysis data
- `packages/claude/SOUL.md` — ClaudeGolem's personality (based on style card)
- Zikaron enrichment (Phase 5) adds intent, tags, importance per chunk

## Vision

Query: "How does Etan write in WhatsApp?"
```
Context: WhatsApp (Hebrew TechGym group)
- Language: 80% Hebrew, 20% English code terms
- Formality: 1/10 — ultra casual
- Length: 1-3 sentences max
- Emojis: moderate (🫶, 😂, 💪)
- Patterns: question-then-answer, shares links with 1-line commentary
- Topics: Claude Code, AI agents, dev tools
```

Query: "How does Etan instruct Claude?"
```
Context: Claude Code sessions
- Language: 95% English
- Formality: 3/10 — direct but casual
- Length: varies (1 line commands to paragraph specs)
- Patterns: imperative ("fix this", "add body"), often references prior context
- Decision style: quick iteration, test-driven, "just do it"
```

## Steps

### Data Extraction
1. Query Zikaron for WhatsApp chunks: `source=whatsapp`
2. Query Zikaron for CC user_message chunks: `content_type=user_message`
3. Query Zikaron for email writing patterns (from draft-reply, sent items)
4. Group by: source, language, topic cluster

### Profile Building
5. For each source, extract:
   - Language distribution (Hebrew/English/mixed)
   - Average message length
   - Formality score (via GLM classification)
   - Common patterns (via GLM summarization of N sample messages)
   - Emoji usage rate and favorites
   - Topic clusters (from enrichment tags)
   - Time-of-day patterns
6. Store profiles in Supabase `style_profiles` table:
   ```sql
   CREATE TABLE style_profiles (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     context TEXT NOT NULL,         -- 'whatsapp', 'claude_code', 'email', 'linkedin'
     language TEXT,                  -- 'hebrew', 'english', 'mixed'
     formality_score REAL,           -- 1-10
     avg_message_length INTEGER,
     emoji_rate REAL,                -- emojis per message
     top_emojis TEXT[],
     patterns JSONB,                 -- common writing patterns
     topic_clusters JSONB,           -- topic distribution
     sample_count INTEGER,           -- how many messages analyzed
     last_updated TIMESTAMPTZ DEFAULT NOW()
   );
   ```

### Integration
7. Update `style-export.ts` to read from `style_profiles` table
8. Update ClaudeGolem SOUL.md generation to use per-context profiles
9. Add MCP tool: `style_getProfile(context)` — returns style profile for a context
10. Add CLI: `golems style [context]` — show/refresh style profiles

### LinkedIn (Future)
11. When Etan starts posting on LinkedIn:
    - Index posts via LinkedIn API or manual paste
    - Build "professional writing" profile
    - Use for ghostwriting suggestions

## Depends On

- Phase 5 (Zikaron enrichment — done)
- Zikaron WhatsApp indexing (already done)

## Status

- [ ] Extract WhatsApp style metrics from Zikaron
- [ ] Extract CC instruction style metrics
- [ ] Extract email writing patterns
- [ ] Build per-context profiles
- [ ] Create style_profiles Supabase table
- [ ] Update style-export.ts
- [ ] MCP tool + CLI command
- [ ] Integrate with ClaudeGolem SOUL.md
