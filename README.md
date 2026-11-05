# Project1

## Checkout Playwright tests

This repository contains Playwright tests for the Rahul Shetty Academy
ProtoCommerce demo checkout flow, organized with the Page Object Model (POM).

Page objects are grouped by application:

- `pages/rahul-shetty/`
- `pages/demo-web-shop/`

Tests are grouped the same way:

- `tests/rahul-shetty/`
- `tests/demo-web-shop/`

### Setup

```powershell
npm install
npx playwright install chromium firefox webkit
```

### Browser coverage

The Playwright configuration runs every test against Chromium, Firefox, and
WebKit by default. Run all browser projects with:

```powershell
npm run test:e2e:all-browsers
```

Run one browser project when debugging:

```powershell
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

The headed and PowerShell suite runners also execute all configured browser
projects. To target one browser for any command, use Playwright's project
option, for example:

```powershell
npx playwright test --project=firefox
```

Enter the credentials interactively in the current PowerShell session. The
password is hidden while typing and is not stored in the repository:

```powershell
$env:TEST_USERNAME = Read-Host "Username"
$securePassword = Read-Host "Password" -AsSecureString
$env:TEST_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
)
```

Run the checkout tests with a local username prompt and hidden password prompt:

```powershell
.\scripts\run-checkout-tests.ps1
```

The suite does not submit a real payment. The target demo currently exposes
shipping-location and terms controls but does not enforce them before purchase;
the tests cover the supported flow and document cart-removal behavior rather
than asserting unavailable validation.

After a run, Rahul Shetty artifacts are saved under:

```text
artifacts/rahul-shetty/
├── report/              # HTML report
└── test-results/        # screenshots and failure attachments
```

Screenshots are captured for every test. Open the report with:

```powershell
npx playwright show-report artifacts/rahul-shetty/report
```

Run the suite again to refresh the report. An HTML report opened before a
test run, or from a run with no discovered tests, can show 0 passed and 0
failed. A valid Rahul run should show 2 tests and create screenshot files
under `artifacts/rahul-shetty/test-results/`.

TypeScript diagnostics can be checked with:

```powershell
npx tsc --noEmit
```

### Tricentis Demo Web Shop

The separate Demo Web Shop POM suite is under `pages/demo-web-shop/` and
`tests/demo-web-shop/`. Enter credentials locally and run it headed with:

```powershell
.\scripts\run-demo-web-shop-tests.ps1
```

The Demo Web Shop suite separates registration, duplicate-email validation, and
login into independent tests. Use an existing registered customer email for
the login test and a new email for the registration test. It does not submit
an order or process a real payment.

The suite also includes a negative registration test. The runner asks for an
existing email and verifies that the application displays:
`The specified email already exists`.

To run only this error scenario:

```powershell
.\scripts\run-demo-web-shop-error-test.ps1
```

Demo Web Shop artifacts are saved under `artifacts/demo-web-shop/` and its
negative-only run under `artifacts/demo-web-shop-error/`.

## URL-driven E2E automation agent (Claude Code)

Give Claude Code an application URL and it explores the app, builds an Excel
scenario catalogue, writes Page Object Model tests, runs them on Chromium,
Firefox, and WebKit, fixes failures at the root cause, and reports the result.

```text
/e2e-agent https://example.com [flow to focus on] [--app my-app]
```

The orchestrator is `.claude/skills/e2e-agent/SKILL.md`. It coordinates ten
subagents in `.claude/agents/`:

| Subagent | Responsibility | Output |
| --- | --- | --- |
| application-explorer | Validate the URL, crawl safe pages, record observed behavior | `test-plans/<app>/discovery.md` |
| requirement-analyst | Requirements, assumptions, gaps, clarification questions | `test-plans/<app>/requirements.md` |
| scenario-designer | Risk-based scenario catalogue | `test-plans/<app>/scenarios.json` |
| excel-test-analyst | Build and refresh the workbook | `test-plans/<app>/<app>-e2e-scenarios.xlsx` |
| test-architect | POM, fixture, and data design | `test-plans/<app>/architecture.md` |
| playwright-implementer | Page objects, fixtures, specs, fixes | `pages/`, `tests/`, `fixtures/`, `test-data/` |
| test-executor | tsc, targeted, per-browser, and full-matrix runs; evidence | `artifacts/<app>/` |
| failure-investigator | Root-cause classification from evidence | fix prescriptions |
| quality-reviewer | Independent read-only review | Ready / Not ready verdict |
| delivery-reporter | Final 15-section report | `test-plans/<app>/delivery-report.md` |

Supporting tools:

```powershell
# Read-only discovery (no form submits, skips logout/delete-style links)
node scripts/explore-app.mjs --url https://example.com --app my-app --max-pages 12

# Scenario catalogue -> Excel (validate, merge results, build)
node scripts/workbook.mjs validate --app my-app
node scripts/workbook.mjs sync --app my-app
node scripts/workbook.mjs build --app my-app

# Run any app on all three browsers, prompt for secrets locally, refresh workbook
.\scripts\run-e2e.ps1 -App my-app -BaseUrl https://example.com -SecretVars MY_APP_USER,MY_APP_PASSWORD
```

Test titles start with their scenario ID, for example
`test('[MYA-001] signs in', ...)`. This links each Playwright result to its
row in the workbook. The catalogue format is described in
`.claude/skills/e2e-agent/scenario-schema.md`.

### Credentials file (JSON or Excel)

Put login, registration, and other accounts in **one** file. The agent and
the tests extract them from there, and you never type them into chat.

1. Copy a template from `test-data/templates/`:
   - `credentials.example.json` to `credentials/credentials.json`, or
   - `credentials.example.xlsx` to `credentials/credentials.xlsx`

   Alternatively, keep the file outside this OneDrive-synced folder and set
   `$env:CREDENTIALS_FILE = 'D:\secure\credentials.xlsx'` before starting
   Claude Code.
2. Fill one entry per application and role:

   ```json
   {
     "demo-web-shop": {
       "existingUser": { "email": "me@example.com", "password": "..." },
       "newUser": { "firstName": "QA", "lastName": "Bot", "email": "qa+{timestamp}@example.com", "password": "..." }
     }
   }
   ```

   In Excel, use one row per role, with the columns `App | Role | Email |
   Password | First Name | ...`. Add any field as a new column.
   `{timestamp}` and `{random}` make registration data unique on every run.
3. Check it. This prints masked values only:

   ```powershell
   node scripts/credentials.mjs check --app demo-web-shop
   ```

`credentials/`, `credentials.json`, and `credentials.xlsx` are git-ignored,
and `.claude/settings.json` blocks Claude from reading or editing
`credentials/`. In CI, supply the JSON through the `CREDENTIALS_JSON`
secret. A single field can be overridden with `E2E_<APP>_<ROLE>_<FIELD>`.
