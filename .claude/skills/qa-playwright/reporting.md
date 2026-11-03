# Reporting and Artifact Guide

## Output structure

Store generated output by suite:

```text
artifacts/
├── rahul-shetty/
│   ├── report/
│   └── test-results/
├── demo-web-shop/
└── demo-web-shop-error/
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

Run the suite-specific PowerShell runner. Then open its report:

```powershell
npx playwright show-report artifacts/rahul-shetty/report
```

Screenshots are stored under the matching `test-results` directory. A report
showing `0 passed` and `0 failed` usually means no tests were discovered or
the report was opened before a valid run; rerun the suite and confirm the
console lists the expected test count.
