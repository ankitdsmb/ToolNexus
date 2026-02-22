import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5081';
const webServerTimeout = Number(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT_MS ?? 120000);

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'tests/playwright/report', open: 'never' }]],
  webServer: {
    command: 'PLAYWRIGHT_WEB_TIMEOUT_MS=90000 node ./scripts/playwright-webserver.mjs',
    url: new URL('/health', baseURL).toString(),
    reuseExistingServer: true,
    timeout: webServerTimeout
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.03,
      animations: 'disabled'
    }
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 } }
    },
    {
      name: 'tablet-chromium',
      use: { ...devices['iPad (gen 7)'] }
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] }
    }
  ]
});
