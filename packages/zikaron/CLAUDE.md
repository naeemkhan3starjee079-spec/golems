# Zikaron -> BrainLayer

> This package has been extracted to a standalone open-source project.

**[BrainLayer](https://github.com/EtanHey/brainlayer)** — Like git for your AI conversations.

- Install: `pip install brainlayer`
- CLI: `brainlayer --help`
- MCP: `brainlayer-mcp`
- Docs: https://github.com/EtanHey/brainlayer

## Local Development

The source code in `packages/zikaron/` still works as the active installation.
For new development, contribute to the BrainLayer repo instead.

```bash
# Current local install (still works)
pip install -e packages/zikaron/

# New way (from PyPI, when published)
pip install brainlayer
```

## Name Change

- `zikaron` CLI -> `brainlayer`
- `zikaron-mcp` -> `brainlayer-mcp`
- `zikaron-daemon` -> `brainlayer-daemon`
- `zikaron_search` MCP tool -> `brainlayer_search`
- `~/.local/share/zikaron/` -> `~/.local/share/brainlayer/`
