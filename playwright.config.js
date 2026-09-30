import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173',
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
  },
  reporter: 'list',
  timeout: 45000,
  webServer: process.env.E2E_START_SERVER === 'true' ? { command: 'node scripts/test-server.mjs', url: 'http://127.0.0.1:5273', reuseExistingServer: false, timeout: 60000 } : undefined,
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
});
