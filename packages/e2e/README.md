# E2E Tests

End-to-end tests for Golems packages using Playwright.

## Setup

```bash
bun install
bunx playwright install chromium
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific project
bun test:admin-ui
bun test:docsite

# Run with UI mode
bun test:ui

# Run in headed mode (see browser)
bun test:headed
```

## Test Structure

- `tests/admin-ui/` - Tests for admin UI (Vite + React)
- `tests/docsite/` - Tests for documentation site (Docusaurus)

## Dev Servers

Tests expect dev servers to be running:

- Admin UI: `http://localhost:5173` (run `cd packages/admin-ui && bun dev`)
- Docsite: `http://localhost:3000` (run `cd packages/docsite && bun start`)

Alternatively, uncomment the `webServer` config in `playwright.config.ts` to auto-start servers.

## Writing Tests

See [Playwright documentation](https://playwright.dev/docs/writing-tests) for guides.

Example:

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My App/);
});
```
