# Reporting and Artifact Guide

## Output structure

Store generated output by suite:

```text
artifacts/
└── <app>/
    ├── report/          # HTML report
    ├── test-results/    # screenshots, videos, traces
    └── results.json     # JSON results synced into the workbook
```

## Recommended configuration

```ts
outputDir: `artifacts/${suiteName}/test-results`,
reporter: [['list'], ['html', {
  open: 'never',
  outputFolder: `artifacts/${suiteName}/report`
}]],
use: {
  screenshot: 'on',
  video: 'retain-on-failure',
  trace: 'on-first-retry'
}
```

## Running and reviewing

Run the suite with `scripts/run-e2e.ps1`. Then open its report:

```powershell
npx playwright show-report artifacts/<app>/report
```

Screenshots are stored under the matching `test-results` directory. A report
showing `0 passed` and `0 failed` usually means no tests were discovered or
the report was opened before a valid run; rerun the suite and confirm the
console lists the expected test count.
