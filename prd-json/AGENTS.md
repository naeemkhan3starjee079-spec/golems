# AI Agent Instructions - Research PRD

## 🎯 Purpose

This is a **research PRD** - no code changes, just web research and documentation.

## 📋 Story Format

Each RS-XXX story follows this pattern:
1. Run WebSearch queries as specified in criteria
2. Compile findings into markdown document in `docs.local/research/`
3. Synthesize actionable recommendations

## 🔧 Tools to Use

| Tool | Purpose |
|------|---------|
| `WebSearch` | Execute the research queries |
| `Write` | Create markdown documentation |

## 📝 Output Format

Each research doc should include:

```markdown
# [Topic] Research

## Summary
[2-3 sentence overview]

## Key Findings

### Finding 1: [Title]
- Source: [URL]
- Details: [What we learned]
- Applicability: [How this applies to GolemsZikaron]

### Finding 2: [Title]
...

## Recommendations

1. **[Improvement 1]**: [Description]
2. **[Improvement 2]**: [Description]
...

## Sources
- [Title](URL)
- ...
```

## ⚠️ Notes

- No commits needed - this is pure research
- No CodeRabbit reviews - no code to review
- Output goes to `docs.local/research/` (gitignored)
- Focus on actionable insights, not comprehensive surveys
