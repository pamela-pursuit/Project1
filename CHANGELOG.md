# Changelog

## 2026-11-05

### Added

- Credential store: accounts per app and role are read from a git-ignored
  JSON or Excel file (`credentials/`, `CREDENTIALS_FILE`, or
  `CREDENTIALS_JSON`). Supports `{timestamp}` and `{random}` placeholders and
  `E2E_<APP>_<ROLE>_<FIELD>` overrides (`test-data/credentials-store.cjs`).
- `scripts/credentials.mjs` for masked checks and JSON/XLSX templates in
  `test-data/templates/`.
- `.claude/settings.json` deny rules that keep Claude from reading or
  editing the credentials folder.
- `-AccountsFile` option on `scripts/run-e2e.ps1`.
- URL-driven E2E automation agent: `/e2e-agent` orchestrator skill and ten
  Claude Code subagents under `.claude/agents/`.
- `scripts/explore-app.mjs` for read-only application discovery.
- `scripts/workbook.mjs` to validate the scenario catalogue, merge Playwright
  results, and build the five-sheet Excel workbook (exceljs).
- `scripts/run-e2e.ps1`, a generic cross-browser runner with hidden secret
  prompts and automatic workbook refresh.
- Playwright JSON reporter output at `artifacts/<suite>/results.json`.

### Changed

- E2E subagents now use the credential file instead of environment-variable
  prompts.
- `baseURL` now comes only from `BASE_URL` (set by `run-e2e.ps1`).
- README, guides, and `.env.example` now describe the agent workflow instead
  of individual suites.

### Changed (structure)

- Moved the credential loader to `lib/` and the credential templates to
  `templates/`. `test-data/` now holds only per-app test data.
- Added placeholder folders (`pages/`, `tests/`, `fixtures/`, `test-data/`,
  `test-plans/`) and documented the project structure in the README.

### Removed

- Rahul Shetty and Tricentis Demo Web Shop test suites, page objects, and
  their dedicated runners (`run-checkout-tests.ps1`,
  `run-demo-web-shop-tests.ps1`, `run-demo-web-shop-error-test.ps1`), to
  start fresh with agent-generated suites.

## 2026-11-04

### Changed

- Enhanced the QA Playwright agent with a URL-driven autonomous workflow.
- Added live-page inspection, locator discovery, root-cause repair, and
  cross-browser validation guidance.
- Added safety boundaries for credentials, destructive actions, and external
  side effects.

## 2026-11-04

### Added

- Chromium, Firefox, and WebKit projects for cross-browser Playwright runs.
- Browser-specific npm commands and an all-browsers command.
- Setup and execution documentation for browser coverage.

## 2026-11-03

### Added

- Playwright TypeScript automation for the Rahul Shetty ProtoCommerce demo.
- Playwright TypeScript automation for the Tricentis Demo Web Shop.
- Page Object Model classes grouped by application.
- Positive registration and login scenarios.
- Duplicate-email registration validation.
- Cart, checkout, and product-removal scenarios.
- Secure PowerShell runners for local credential prompts.
- Suite-specific reports, screenshots, videos, and test-result folders.
- QA/Playwright agent, skill guides, and workspace instructions.
- Automatic validated-change commit and push guidance.

### Git commits

- `89ec547` - Add Playwright QA automation suites
- `fdc54b3` - Automate validated changes delivery
