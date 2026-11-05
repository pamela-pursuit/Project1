# Project1

URL-driven Playwright TypeScript E2E automation. Give Claude Code an
application URL, and it explores the app, builds an Excel scenario catalogue,
writes Page Object Model tests, runs them on Chromium, Firefox, and WebKit,
fixes failures at the root cause, and reports the result.

## Setup

```powershell
npm install
npx playwright install chromium firefox webkit
```

## Start a new application

```text
/e2e-agent https://example.com [flow to focus on] [--app my-app]
```

Each application gets its own folders:

```text
test-plans/<app>/     # discovery, requirements, scenarios.json, Excel workbook, reports
pages/<app>/          # page objects
tests/<app>/          # specs (titles start with [ID])
fixtures/<app>.fixture.ts
test-data/<app>.data.ts
artifacts/<app>/      # HTML report, screenshots, traces, results.json (git-ignored)
```

## URL-driven E2E automation agent (Claude Code)

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

# Run an app on all three browsers and refresh its workbook
.\scripts\run-e2e.ps1 -App my-app -BaseUrl https://example.com

# Debug a single browser or scenario
.\scripts\run-e2e.ps1 -App my-app -BaseUrl https://example.com -Browsers firefox -Grep "\[MYA-004\]" -Headed

# Open the HTML report
npx playwright show-report artifacts/my-app/report

# Type-check
npx tsc --noEmit
```

Test titles start with their scenario ID, for example
`test('[MYA-001] signs in', ...)`. This links each Playwright result to its
row in the workbook. The catalogue format is described in
`.claude/skills/e2e-agent/scenario-schema.md`.

## Credentials file (JSON or Excel)

Put login, registration, and other accounts in **one** file. The agent and
the tests extract them from there, and you never type them into chat.

1. Copy a template from `test-data/templates/`:
   - `credentials.example.json` to `credentials/credentials.json`, or
   - `credentials.example.xlsx` to `credentials/credentials.xlsx`

   Alternatively, keep the file outside this OneDrive-synced folder and set
   `$env:CREDENTIALS_FILE = 'D:\secure\credentials.xlsx'` before starting
   Claude Code, or pass `-AccountsFile` to `run-e2e.ps1`.
2. Fill one entry per application and role:

   ```json
   {
     "my-app": {
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
   node scripts/credentials.mjs check --app my-app
   ```

`credentials/`, `credentials.json`, and `credentials.xlsx` are git-ignored,
and `.claude/settings.json` blocks Claude from reading or editing
`credentials/`. In CI, supply the JSON through the `CREDENTIALS_JSON`
secret. A single field can be overridden with `E2E_<APP>_<ROLE>_<FIELD>`.
