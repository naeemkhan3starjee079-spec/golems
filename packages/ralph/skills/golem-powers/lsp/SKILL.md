---
name: lsp
description: Use when needing semantic code navigation - find definitions, references, or callers. Covers LSP, go to definition, find references, hover, code intelligence. NOT for: text pattern searches (use grep), file discovery (use glob).
---

# LSP Code Intelligence

## Quick Reference

| Operation | Use Case |
|-----------|----------|
| `goToDefinition` | Find where a symbol is defined |
| `findReferences` | Find all usages of a symbol |
| `hover` | Get type info and docs |
| `documentSymbol` | List symbols in a file |
| `workspaceSymbol` | Search symbols globally |
| `goToImplementation` | Find interface implementations |
| `incomingCalls` | Find callers of a function |
| `outgoingCalls` | Find callees of a function |

## LSP vs Grep/Glob

| Scenario | Use LSP | Use Grep/Glob |
|----------|---------|---------------|
| Find function definition | Yes | Fallback only |
| Find all usages of a symbol | Yes | Fallback only |
| Search for text patterns | No | Yes |
| Search comments/strings | No | Yes |
| LSP not configured | N/A | Yes |

## Troubleshooting

- **Not working?** Check if language server is installed: `which <server-name>`
- **No results?** LSP may not be fully initialized — try hover first
- **goToDefinition fails?** Symbol may be from external package (not in workspace)
