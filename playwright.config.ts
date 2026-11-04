import { defineConfig, devices } from '@playwright/test';

const suiteName = process.env.TEST_SUITE ?? 'default';
const artifactDirectory = `artifacts/${suiteName}`;

export default defineConfig({
  testDir: './tests',
  outputDir: `${artifactDirectory}/test-results`,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `${artifactDirectory}/report` }]
  ],
  use: {
    baseURL:
      process.env.BASE_URL ??
      (process.env.DEMO_SHOP_NEW_EMAIL ||
      process.env.DEMO_SHOP_EXISTING_EMAIL
        ? 'https://demowebshop.tricentis.com'
        : 'https://rahulshettyacademy.com/loginpagePractise/'),
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
});
