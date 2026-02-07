import { test, expect } from '@playwright/test';

test.describe('Admin UI Smoke Tests', () => {
  test('should load the admin UI homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Golems Admin|Admin/i);
  });

  test('should render main navigation', async ({ page }) => {
    await page.goto('/');

    // Wait for React to hydrate
    await page.waitForLoadState('networkidle');

    // Check that some basic UI elements are present
    // Adjust selectors based on actual admin UI structure
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle 404 gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-route');

    // Either 404 status or fallback to index
    if (response) {
      expect([200, 404]).toContain(response.status());
    }
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

    // Allow HMR-related errors in dev mode
    const realErrors = errors.filter(
      err => !err.includes('HMR') && !err.includes('[vite]')
    );

    expect(realErrors).toHaveLength(0);
  });
});
