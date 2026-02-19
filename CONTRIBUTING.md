# Contributing to Golems

Thanks for your interest in contributing to the Golems ecosystem!

## Quick Start

```bash
git clone https://github.com/EtanHey/golems.git
cd golems
```

Each package has its own setup:

| Package | Setup |
|---------|-------|
| **autonomous** | `cd packages/autonomous && bun install` |
| **docsite** | `cd packages/docsite && npm install` |
| **ralph** | `cd packages/ralph` (zsh scripts, no install needed) |
| **brainlayer** | `pip install git+https://github.com/EtanHey/brainlayer.git` (external repo) |

## Development Workflow

1. Create a branch from `master`
2. Make your changes
3. Run tests: `bun test` (autonomous) or `npm test` (docsite)
4. Create a PR — CodeRabbit, Cursor Bugbot, and DeepSource will review automatically
5. Address review feedback
6. Merge when all checks pass

## Code Style

- TypeScript for all new code in `autonomous` and `ralph`
- No `any` types — use proper interfaces
- JSDoc on exported functions
- Tests live next to source files: `foo.ts` has `foo.test.ts`
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`

## What to Contribute

- Bug fixes (check Issues tab)
- New golem personalities in `session-registry.ts`
- Teaching prompts in `teaching.ts`
- Maintenance checks in `maintainer-golem.ts`
- Documentation improvements
- Docsite components and pages

## Architecture

See the main [README](README.md) for the monorepo structure. Each package has its own `CLAUDE.md` with detailed documentation.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
