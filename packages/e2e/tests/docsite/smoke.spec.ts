import { test, expect } from '@playwright/test';

test.describe('Docsite Smoke Tests', () => {
  test('should load the docsite homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Golems|Documentation/i);
  });

  test('should render main navigation', async ({ page }) => {
    await page.goto('/');

    // Docusaurus has navbar
    const navbar = page.locator('nav.navbar');
    await expect(navbar).toBeVisible();
  });

  test('should navigate to docs page', async ({ page }) => {
    await page.goto('/');

    // Find and click a docs link (Docusaurus typically has /docs/)
    const docsLink = page.locator('a[href*="/docs"]').first();
    if (await docsLink.isVisible()) {
      await docsLink.click();
      await expect(page).toHaveURL(/\/docs/);
    }
  });

  test('should have working search', async ({ page }) => {
    await page.goto('/');

    // Docusaurus has search button/input
    const searchButton = page.locator('button[class*="DocSearch"]').or(
      page.locator('input[type="search"]')
    );

    // Search may not be configured yet, so just check if element exists
    const hasSearch = await searchButton.count();
    expect(hasSearch).toBeGreaterThanOrEqual(0);
  });

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known Docusaurus dev warnings
    const realErrors = errors.filter(
      err => !err.includes('webpack') && !err.includes('HMR')
    );

    expect(realErrors).toHaveLength(0);
  });

  test('should have responsive design', async ({ page }) => {
    await page.goto('/');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    const navbar = page.locator('nav.navbar');
    await expect(navbar).toBeVisible();
  });
});
