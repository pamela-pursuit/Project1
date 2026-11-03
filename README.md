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
npx playwright install chromium
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