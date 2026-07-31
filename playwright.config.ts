import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the real stack — nginx serving the built SPA,
// the Go backend, and Postgres seeded from the committed snapshot. Unit tests
// mock the API, so only these prove the pieces work together.
//
//   docker compose up -d --build
//   npm run e2e
//
// Override the target with E2E_BASE_URL to test a deployed environment.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost';

export default defineConfig({
  testDir: './e2e',
  // The suite hits a live backend and real transit data; a single slow query
  // should not fail a run.
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // Fail the build if a test was committed with .only.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The app is mobile-first, and the layout differs enough to be worth
    // covering rather than assuming.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
