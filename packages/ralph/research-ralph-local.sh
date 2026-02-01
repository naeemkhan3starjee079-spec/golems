#!/bin/bash
#
# Research: Can Ralph use local Ollama models?
#
# Usage: ./research-ralph-local.sh
#

cd "$(dirname "$0")" || exit 1

read -r -d '' RESEARCH_PROMPT << 'PROMPT'
# Research Task: Ralph with Local Models

You are researching the feasibility of running an autonomous coding loop (like Ralph) with LOCAL models instead of cloud APIs.

## Current Ralph Architecture

Ralph currently:
1. Spawns fresh Claude Code CLI instances in a loop
2. Each instance reads a PRD (JSON file with stories)
3. Claude Code has TOOLS: file editing, bash execution, web fetch
4. Implements one story, commits, loops

## The Question

Can we replace Claude Code with Ollama + some agent framework?

## What We Need

For Ralph to work with local models, we need:
1. **File reading/writing** - edit source code
2. **Bash execution** - run tests, git commands
3. **Context awareness** - understand the codebase
4. **Structured output** - mark stories as complete

## Research These Options

### Option 1: Aider + Ollama
- Aider supports Ollama models
- Has file editing capabilities
- Git-aware
- Question: Can it be scripted in a loop like Ralph?

### Option 2: OpenCode + Ollama
- Supports 75+ providers including Ollama
- Has tool use
- Question: Is it scriptable?

### Option 3: Continue.dev + Ollama
- IDE extension but has CLI
- Question: Can it run headless?

### Option 4: Custom Agent (LangChain/LlamaIndex)
- Build our own tool-using agent
- Question: How complex?

### Option 5: Goose (Block's agent)
- Open source agent
- Question: Does it support Ollama?

## Your Task

1. Analyze each option's feasibility
2. Rate them: Easy / Medium / Hard to integrate
3. Identify blockers (what's missing?)
4. Recommend the best path forward
5. Estimate effort (days/weeks)

## Output Format

Create a markdown analysis with:
- Feasibility table
- Recommended approach
- Next steps
- Risks/blockers

Think step by step. Be specific about what works and what doesn't.
PROMPT

echo "============================================"
echo "  Research: Ralph with Local Models"
echo "============================================"
echo ""
echo "This will research feasibility of:"
echo "  - Aider + Ollama"
echo "  - OpenCode + Ollama"
echo "  - Custom agent frameworks"
echo "  - Other options"
echo ""
echo "Output: Analysis of best path forward"
echo "============================================"
echo ""

# Use qwen3-coder for the research
MODEL="qwen3-coder"
if ! ollama list 2>/dev/null | grep -q "$MODEL"; then
    MODEL="llama3.1:8b"  # Fallback
fi

echo "Using model: $MODEL"
echo ""

ollama run "$MODEL" "$RESEARCH_PROMPT"
