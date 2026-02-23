# Storage Map — Where to Find Things

| What You're Looking For | Where to Look |
|------------------------|---------------|
| Past decisions, learnings | `brain_search("topic")` |
| File history | `brain_search(file_path="filename.ts")` |
| Current work context | `brain_recall()` (mode=context, default) |
| Stored memories by tag | `brain_search(tag="decision")` |
| Plan progress | `docs.local/plan/<name>/README.md` |
| Scratchpad / temp notes | `claude.scratchpad.md` |
| Session transcript | BrainLayer auto-indexed |
| Voice session notes | `/tmp/voicelayer-thinking.md` |
| Architecture decisions | `docs/architecture/*.md` |
| Learnings | `docs.local/learnings/` or `~/.claude/learnings/` |
| Auto-memory | `~/.claude/projects/<project>/memory/MEMORY.md` |
| Rules (always loaded) | `.claude/rules/*.md` |
| Skills (on demand) | `~/.claude/commands/golem-powers/` |
| Voice profiles | `~/.voicelayer/voices.json` |
| BrainLayer DB | `~/.local/share/brainlayer/brainlayer.db` |
| Golems runtime state | `~/.golems-zikaron/` (state.json, event-log.json) |
