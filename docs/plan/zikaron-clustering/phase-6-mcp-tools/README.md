# Phase 6: MCP Tools

> [Back to main plan](../README.md)

## Goal

Expose cluster hierarchy through 5 new MCP tools for AI agents and content automation.

## Tools
- **Code:** Add to existing `mcp/__init__.py`
- **Test:** Verify with Claude Code MCP calls

## Steps

1. **`get_topic_clusters(level, parent_id?, min_chunks?)`**
   - Browse hierarchy top-down
   - L0 returns ~40 topics with labels and counts
   - Pass parent_id to drill down
2. **`get_cluster_details(cluster_id, include_chunks?)`**
   - Full info: label, children, cohesion, representative chunks
   - Content pipeline agent uses this to understand topic coverage
3. **`find_relevant_clusters(query, limit?)`**
   - Semantic search over vec_cluster_centroids
   - Returns ranked clusters for "find everything about X"
4. **`get_expert_topics(min_chunks?, sort_by?)`**
   - Clusters with demonstrable expertise
   - Expertise formula: depth + focus + breadth + sustained + fresh
5. **`suggest_content_topics(type?, limit?)`**
   - Four categories: authority, timely, unique angles, content gaps
   - Feeds into content automation pipeline
6. Add all tools to FastAPI daemon alongside existing endpoints
7. Update MCP server registration

## Expertise Score Formula
```text
expertise = 0.30 × log(chunk_count)/log(max_count)
          + 0.20 × silhouette_score
          + 0.20 × source_diversity/max_diversity
          + 0.15 × temporal_span/365
          + 0.15 × exp(-0.01 × days_since_last)
```

## Depends On
- Phase 2 (clusters), Phase 3 (labels), Phase 4 (search integration)

## Status
- [ ] Implement get_topic_clusters
- [ ] Implement get_cluster_details
- [ ] Implement find_relevant_clusters
- [ ] Implement get_expert_topics
- [ ] Implement suggest_content_topics
- [ ] Add to FastAPI daemon
- [ ] Update MCP registration
