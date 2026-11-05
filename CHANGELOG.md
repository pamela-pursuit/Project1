# Changelog

## 2026-11-05

### Added

- URL-driven E2E automation agent: `/e2e-agent` orchestrator skill and ten
  Claude Code subagents under `.claude/agents/`.
- `scripts/explore-app.mjs` for read-only application discovery.
- `scripts/workbook.mjs` to validate the scenario catalogue, merge Playwright
  results, and build the five-sheet Excel workbook (exceljs).
- `scripts/run-e2e.ps1`, a generic cross-browser runner with hidden secret
  prompts and automatic workbook refresh.
- Playwright JSON reporter output at `artifacts/<suite>/results.json`.

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
