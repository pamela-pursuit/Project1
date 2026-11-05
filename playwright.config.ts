import { defineConfig, devices } from '@playwright/test';

// Every run is saved under artifacts/<suite>/runs/<runId>/:
//   report/        HTML report
//   test-results/  raw screenshots, videos, traces per test
//   screenshots/   readable copies: <browser>/<ID>_<title>_<status>_<n>.png
//   results.json   machine-readable results (synced into the Excel workbook)
//   summary.md     per-test table with screenshot links
// artifacts/<suite>/latest.json points to the newest run.
const suiteName = process.env.TEST_SUITE ?? 'default';
const suiteDirectory = `artifacts/${suiteName}`;

// Set once in the main process; worker processes inherit it, so all share one run folder.
process.env.E2E_RUN_ID ??= new Date().toISOString().replace(/\.\d+Z$/, '').replace('T', '_').replaceAll(':', '-');
const runId = process.env.E2E_RUN_ID;
const runDirectory = `${suiteDirectory}/runs/${runId}`;

export default defineConfig({
  testDir: './tests',
  outputDir: `${runDirectory}/test-results`,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `${runDirectory}/report` }],
    ['json', { outputFile: `${runDirectory}/results.json` }],
    ['./lib/artifact-reporter.ts', { runDirectory, suiteDirectory, runId }]
  ],
  use: {
    // Set per application by scripts/run-e2e.ps1 (or BASE_URL in the shell).
    baseURL: process.env.BASE_URL,
    screenshot: 'on',
    trace: 'retain-on-failure',
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
