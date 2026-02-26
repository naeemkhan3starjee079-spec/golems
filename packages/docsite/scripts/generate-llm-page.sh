#!/usr/bin/env bash
# generate-llm-page.sh - Concatenate all docs into a single LLM-friendly page
# Run: ./scripts/generate-llm-page.sh
set -euo pipefail

DOCS_DIR="$(dirname "$0")/../docs"
OUTPUT="$DOCS_DIR/llm.md"

cat > "$OUTPUT" << 'HEADER'
---
sidebar_position: 99
title: For LLMs
description: Complete documentation in a single page, optimized for LLM consumption
---

# Golems Documentation (Full)

> This page contains the complete documentation concatenated into a single page.
> Use the "Copy" button to copy all content for use with LLMs.

---

HEADER

# Concatenate all docs, stripping frontmatter
for f in "$DOCS_DIR"/*.md "$DOCS_DIR"/golems/*.md; do
  [ -f "$f" ] || continue
  # Skip the llm.md file itself
  basename=$(basename "$f")
  [ "$basename" = "llm.md" ] && continue

  echo "## $(basename "$f" .md | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g')" >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  # Strip YAML frontmatter (between --- lines)
  awk '/^---$/ { if (++c <= 2) next } { print }' "$f" >> "$OUTPUT"

  echo "" >> "$OUTPUT"
  echo "---" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
done

echo "Generated: $OUTPUT ($(wc -l < "$OUTPUT") lines)"
