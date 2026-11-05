# Progress: demo-web-shop E2E run

Resume in a new session with `/e2e-agent https://demowebshop.tricentis.com --app demo-web-shop`
(or "continue the demo-web-shop E2E run"). Continue from the first step that is not **Done**.

| # | Phase / step | Status | Output |
| --- | --- | --- | --- |
| 0 | Intake: URL, account forms, credentials file, check | Done (2026-11-05) | intake.md, credentials/credentials.xlsx (local) |
| 1a | Discovery: public, signed in, checkout | Done | discovery.md (guest COD order #2411222 placed) |
| 1b | Requirements and user decisions D1 to D5 | Done | requirements.md (section 8), intake.md |
| 2 | Scenario catalogue and Excel workbook | Done (70 scenarios, 0 errors) | scenarios.json, demo-web-shop-e2e-scenarios.xlsx |
| 3a | Architecture | Done | architecture.md |
| 3b | Implementation (68 tests) and smoke | **In progress**: files written; tsc, list, smoke and catalogue update pending | pages/, fixtures/, test-data/, tests/demo-web-shop/ |
| 4 | Execution (user asked for parallel; see plan below) | Not started | artifacts/demo-web-shop/runs/ |
| 4b | Failure investigation and fixes (max 3 iterations per failure) | Not started | |
| 5a | Quality review | Not started | |
| 5b | Delivery report, commit and push | Not started | delivery-report.md |

## Execution plan (user: "run in parallel", 2026-11-05)

- **Pass A, guest specs:** chromium, firefox and webkit with several workers in parallel.
- **Pass B, signed-in specs** (any spec using the `existingUser` / `signedIn` fixtures): `--workers=1`, because D2 (one shared account) still applies. Chromium-only tests remain Chromium-only.
- After each pass: `node scripts/workbook.mjs sync --app demo-web-shop` then `build`.

## Constraints to keep (see intake.md D1 to D5)

Never touch the "14.1-inch Laptop" in the account cart. COD orders only as a guest. Signed-in checkout stops at Billing. No account creation. At most one wrong-password login per run. Never read or print credentials.
