# Ralph Modular Library

Ralph's functionality is split into these modular files. All are sourced by the main `ralph.zsh`.

## File Tree

```
lib/
├── ralph-commands.zsh   # Helper commands (ralph-session, ralph-watch, jqf)
├── ralph-models.zsh     # Model routing, cost tracking, notifications
├── ralph-registry.zsh   # Project registry, repoGolem launcher generation
├── ralph-secrets.zsh    # 1Password integration for secrets
├── ralph-setup.zsh      # Interactive setup wizard (ralph-setup)
├── ralph-ui.zsh         # Colors, progress bars, display helpers
├── ralph-watcher.zsh    # Orphan detection, PID tracking, file watching
└── ralph-worktrees.zsh  # Git worktree management for task isolation
```

## Module Descriptions

| Module | Key Functions | Purpose |
|--------|---------------|---------|
| **commands** | `ralph-session`, `ralph-watch`, `ralph-logs`, `jqf` | User-facing helper commands |
| **models** | `get_model_for_story`, `_ralph_ntfy` | Model routing, cost tracking, ntfy notifications |
| **registry** | `repoGolem`, `_ralph_setup_mcps` | Project launchers, MCP server configuration |
| **secrets** | `_ralph_op_*` | 1Password CLI integration |
| **setup** | `ralph-setup` | First-run wizard, dependency checking |
| **ui** | Colors, `progress_bar`, box drawing | Terminal UI helpers |
| **watcher** | `ralph-kill-orphans`, PID tracking | Process lifecycle management |
| **worktrees** | `_ralph_worktree_*` | Git worktree isolation for parallel tasks |

## Loading Order

`ralph.zsh` sources these in dependency order:
1. `ralph-ui.zsh` (no dependencies)
2. `ralph-models.zsh` (uses UI)
3. `ralph-watcher.zsh` (uses UI)
4. `ralph-commands.zsh` (uses UI, models)
5. `ralph-secrets.zsh` (standalone)
6. `ralph-setup.zsh` (uses all above)
7. `ralph-registry.zsh` (uses all above)
8. `ralph-worktrees.zsh` (uses registry)

## Adding New Modules

1. Create `lib/ralph-<name>.zsh`
2. Add header comment with description
3. Source it in `ralph.zsh` in correct order
4. Add tests in `tests/test-ralph.zsh`
5. Update this README
