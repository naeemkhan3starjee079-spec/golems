# Phase 3 Findings

## Decisions
- Tiered approach: c-TF-IDF for all, LLM for top 2 levels only
- GLM-4.7-Flash at OLLAMA_NUM_PARALLEL=2

## Research
- Including c-TF-IDF keywords + representative chunks produces better labels than either alone
- Better than human naming in blind evaluations (BERTopic research)
- Existing enrichment tags (intent, tags) provide powerful quality signal for labeling

## Task Board
| Task | Owner | Status |
|------|-------|--------|
| Implement c-TF-IDF labeling | - | pending |
| Design LLM prompt | - | pending |
