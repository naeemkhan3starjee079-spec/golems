---
name: screenshot
description: Take screenshots, generate OG images, and scrape web visuals using Playwright
---

# Screenshots & Visual Scraping with Playwright

> Browser automation for visual content. Screenshots, OG images, web scraping for visual reference.

## Option A: Claude-in-Chrome MCP (Preferred)

If you have the Claude-in-Chrome extension, use its tools directly:

```
# Take a screenshot
mcp__claude-in-chrome__computer(action: "screenshot", tabId: <id>)

# Navigate to a page
mcp__claude-in-chrome__navigate(url: "https://etanheyman.com", tabId: <id>)

# Read page content
mcp__claude-in-chrome__get_page_text(tabId: <id>)
```

## Option B: Playwright MCP

For headless automation (better for batch work, CI, or when Chrome isn't available):

### Setup

The Playwright MCP should be configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Usage

Once configured, Playwright MCP provides tools for:
- `browser_navigate` — Go to URL
- `browser_screenshot` — Capture page/element
- `browser_click` — Click elements
- `browser_type` — Fill inputs
- `browser_snapshot` — Get accessibility tree

### Common Screenshot Patterns

**Full page screenshot:**
```
browser_navigate(url: "https://etanheyman.com")
browser_screenshot(fullPage: true)
```

**Element screenshot (for OG images):**
```
browser_navigate(url: "https://etanheyman.com/dashboard")
browser_screenshot(selector: ".hero-section")
```

**Multiple pages (batch):**
```
# Navigate and screenshot each page
for url in ["https://example.com/page1", "https://example.com/page2"]:
  browser_navigate(url)
  browser_screenshot(fullPage: true, path: f"out/{url.split('/')[-1]}.png")
```

## Option C: Playwright Script (Most Flexible)

For complex multi-step automation, write a custom Playwright script:

```typescript
// scripts/screenshot.ts
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

// OG Image generation
await page.goto("https://etanheyman.com");
await page.waitForLoadState("networkidle");
await page.screenshot({ path: "out/og-image.png", type: "png" });

// Social card screenshot
await page.setViewportSize({ width: 1080, height: 1080 });
await page.goto("https://etanheyman.com/dashboard");
await page.screenshot({ path: "out/dashboard-social.png" });

await browser.close();
```

Run with: `bunx playwright test scripts/screenshot.ts` or `bun run scripts/screenshot.ts`

## Use Cases

| Task | Approach |
|------|----------|
| Quick screenshot of a page | Claude-in-Chrome MCP |
| OG image generation (specific size) | Playwright script |
| Batch screenshots of multiple pages | Playwright script |
| Visual regression testing | Playwright script |
| Scraping visual layout for reference | Claude-in-Chrome or Playwright MCP |
| Dynamic content that needs JS execution | Any Playwright option |

## Output Location

Screenshots go to: `~/golems-content/outputs/screenshots/`
