# Golems Documentation Site

> Interactive documentation for the Golems autonomous AI agent ecosystem.

**Live:** [etanhey.github.io/golems](https://etanhey.github.io/golems/)

Built with [Docusaurus 3](https://docusaurus.io/).

## Features

- **Interactive Hero** — Terminal emulator with golem status + Telegram mock, bidirectional sync
- **ASCII Golem Mascot** — 5 art variants (circuit, clay, dense, weathered, hybrid) in neofetch layout
- **Dark Theme** — Custom ember/crimson palette with grain texture overlay
- **Mobile-first** — Touch targets, reduced motion, responsive grid
- **Accessible** — ARIA roles, landmarks, keyboard navigation

## Development

```bash
npm install
npm start        # Dev server at localhost:3000
npm run build    # Production build
```

## Deployment

Deployed automatically via GitHub Pages on push to `master`.

```bash
GIT_USER=EtanHey npm run deploy
```

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `TerminalHero` | `src/components/TerminalHero.tsx` | Neofetch-style terminal with golem tabs |
| `TelegramMock` | `src/components/TelegramMock.tsx` | Telegram topics UI mock |
| `GolemMascot` | `src/components/mascots/GolemMascot.tsx` | ASCII art with 5 variants |
| Homepage | `src/pages/index.tsx` | Hero + Golems grid + Architecture section |

## Theme

Custom CSS variables in `src/css/custom.css`:
- **Primary:** `#e94560` (ember red)
- **Background:** `#0a0a0f` (deep dark)
- **Accents:** `#7b2ff7` (purple), `#00d4aa` (green)
- **Font:** `JetBrains Mono` for terminal, `Inter` for body
