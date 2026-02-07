import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests for Golems admin UI and docsite.
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'admin-ui',
      testDir: './tests/admin-ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
      },
    },
    {
      name: 'docsite',
      testDir: './tests/docsite',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },
  ],

  // Uncomment if you want Playwright to start the dev servers automatically
  // webServer: [
  //   {
  //     command: 'cd ../admin-ui && npm run dev',
  //     url: 'http://localhost:5173',
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'cd ../docsite && npm run start',
  //     url: 'http://localhost:3000',
  //     reuseExistingServer: !process.env.CI,
  //   },
  // ],
});
