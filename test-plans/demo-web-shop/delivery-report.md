# Delivery Report: demo-web-shop

| Item | Value |
| --- | --- |
| Report date | 2026-11-06 |
| App slug / ID prefix | `demo-web-shop` / `DWS` |
| Source of all counts | `test-plans/demo-web-shop/scenarios.json` (70 scenarios, 12 test-data rows, 36 risks, 471 execution rows), computed on 2026-11-06 |
| Evidence runs | `artifacts/demo-web-shop/runs/2026-11-05_15-59-08` (guest pass) and `artifacts/demo-web-shop/runs/2026-11-05_16-05-03` (account pass) |
| Account values | Not included anywhere in this report. The signed-in role is referred to as `existingUser`. |

## 1. Requirement Summary

No user stories or acceptance criteria were supplied, and the user named no flows ("agent decides, by risk"). The scope was proposed in `requirements.md` and confirmed by the user decisions D1 to D5 (`intake.md`, `requirements.md` section 8).

| REQ | Flow | Priority | Scenarios |
| --- | --- | --- | --- |
| REQ-01 | Login (valid, wrong password, unknown email, empty, malformed) | High | 6 |
| REQ-02 | Session and logout | High | 5 |
| REQ-03 | Protected routes and ReturnUrl | High | 3 |
| REQ-04 | Registration validation only (no account is ever created) | Medium | 5 |
| REQ-05 | Search | Medium | 6 |
| REQ-06 | Category listing (`/books`) | Medium | 5 |
| REQ-07 | Product detail | High | 8 |
| REQ-08 | Cart (guest) | High | 9 |
| REQ-09 | Cart (signed in) | High | 3 |
| REQ-10 | Wishlist | Medium | 5 |
| REQ-11 | Checkout to Billing / guest checkout | High | 6 |
| REQ-12 | My account pages, read only | Medium | 3 |
| REQ-13 | Responsive (375x812) | Medium | 1 |
| REQ-14 | Accessibility, report only | Low | 3 |
| REQ-15 | Cross-browser (Chromium, Firefox, WebKit) | Medium | Execution model, no own scenario |
| REQ-16 | COD order end to end (amended by D5: guest only) | High | 1 |
| ASSUMPTION-01 | existingUser has no addresses, orders or reward points | n/a | 1 |

User decisions that shape the suite:

- **D1** Own items only in the account cart and wishlist; the pre-existing "14.1-inch Laptop" is never touched.
- **D2** One shared account for three browsers: run serially; state-changing signed-in tests run on Chromium only.
- **D3** Cash On Delivery orders may be placed (never any card or other payment method).
- **D4** Default priorities from `requirements.md`; accessibility is report-only.
- **D5** COD orders are placed **as a guest** with fictional data; signed-in checkout stops at Billing.

## 2. Application URL and Environment

- URL: `https://demowebshop.tricentis.com/` (no redirect chain; all 12 crawled pages returned 200, `discovery.md` section 1).
- Environment: public, shared nopCommerce demo operated by Tricentis, not owned by us. Its data is shared with other users of the site.
- No `data-testid` attributes exist (crawl `testIdCount: 0`).
- The third-party script `s7.addthis.com` fails DNS and stalls the page `load` event. The suite blocks it with an auto fixture and navigates with `domcontentloaded` (architecture K5, R-03).
- Tooling: Playwright 1.64; projects chromium, firefox and webkit; `screenshot: 'on'`, `video: 'retain-on-failure'` (`playwright.config.ts`).
- Credentials: role `existingUser` (email, password) in the git-ignored local file `credentials/credentials.xlsx`; `check` OK on 2026-11-05.

## 3. Subagents Used

| Subagent | Ran | Output |
| --- | --- | --- |
| application-explorer | Yes | `discovery.md` (route map, forms, locator candidates, probes p1 to p8 and a1 to a3, guest COD order #2411222) |
| requirement-analyst | Yes | `requirements.md` (REQ-01 to REQ-16, gaps, questions Q1 to Q4, section 8 decisions) |
| scenario-designer | Yes | `scenarios.json` (70 scenarios, test data, risk register) |
| test-architect | Yes | `architecture.md` (decisions K1 to K7, file plan, page objects, fixtures, probes in sections 9 and 10) |
| playwright-implementer | Yes | Page objects, fixture, test data, 17 spec files; tsc OK, Chromium smoke passed; checkpoint commit `9a5b5fc` |
| test-executor | Yes | First full run (Pass A in `2026-11-05_15-07-20`, Pass B in `2026-11-05_15-14-03`) |
| failure-investigator | Yes | Root causes and fixes for DWS-069, DWS-056 and DWS-050 (one iteration each); R-35 and R-36 added |
| quality-reviewer | Yes | Review 1: **Not ready** (M1 stale evidence, M2 workbook rollup). Re-review 2026-11-06: **Ready**, 3 optional Minors |
| delivery-reporter | Yes | This report |
| excel-test-analyst steps | Run by the orchestrator | `workbook.mjs validate`, `build`, `sync`; workbook `demo-web-shop-e2e-scenarios.xlsx` |

The orchestrator also ran the targeted re-runs after the fixes, the guest COD probe, and the final full run.

## 4. Discovered Application Flows

Source: `discovery.md` sections 3 and 4.

| Flow | Routes | Access |
| --- | --- | --- |
| Home and navigation | `/`, top menu (7 categories), footer | Public |
| Login | `/login` (Email, Password, "Remember me?") | Public |
| Registration | `/register` (gender, first/last name, email, password, confirm) | Public; validation only |
| Search and autocomplete | header search, `/search?q=` | Public |
| Category listing | `/books`, `/computers`, `/desktops`, `/notebooks`, `/accessories`, `/electronics`, `/camera-photo` | Public |
| Product detail | `/computing-and-internet`, `/health`, `/25-virtual-gift-card`, `/build-your-own-computer` (configurable) | Public |
| Cart | `/cart` (quantity update, remove, terms gate, coupon, gift card, estimate shipping) | Guest and signed in |
| Wishlist | `/wishlist` (add, remove, move to cart, share URL) | Guest and signed in |
| Checkout | `/login/checkoutasguest`, `/onepagecheckout` (Billing, Shipping, Shipping method, Payment method, Payment info, Confirm) | Guest end to end with COD; signed in to Billing only |
| Order completion and details | completion page, `/orderdetails/<id>` | Guest |
| My account | `/customer/info`, `/addresses`, `/orders`, `/changepassword`, `/rewardpoints`, `/backinstocksubscriptions`, `/downloadableproducts` | Signed in (guests are redirected, except back-in-stock) |
| Mobile | 375x812, `#mob-menu-button` | Public |

`/customer/downloadableproducts` never finished rendering (20 s twice, 45 s once).

## 5. Excel Workbook Location

- `test-plans/demo-web-shop/demo-web-shop-e2e-scenarios.xlsx` (68,810 bytes, modified, tracked in git).
- Sheets: Scenario Catalogue, Test Data, Coverage Summary, Execution Results, Risks and Assumptions.
- Built from `scenarios.json` by `node scripts/workbook.mjs build --app demo-web-shop` after `sync` of both evidence runs.

## 6. Scenario Coverage Summary

Total scenarios: **70** (68 automated, 1 blocked, 1 manual).

By priority and status:

| Priority | Total | Automated | Blocked | Manual | Passed | Not Run |
| --- | --- | --- | --- | --- | --- | --- |
| High | 19 | 19 | 0 | 0 | 19 | 0 |
| Medium | 32 | 32 | 0 | 0 | 32 | 0 |
| Low | 19 | 17 | 1 | 1 | 17 | 2 |
| **Total** | **70** | **68** | **1** | **1** | **68** | **2** |

By test type:

| Test type | Count | Test type | Count |
| --- | --- | --- | --- |
| Positive | 21 | Session | 3 |
| Validation | 8 | Authorization | 3 |
| Edge Case | 8 | Persistence | 3 |
| Negative | 6 | Accessibility | 3 |
| Boundary | 5 | Authentication | 2 |
| Navigation | 4 | Error Handling | 2 |
| Cross-Browser | 1 | Responsive | 1 |

Browser scope: 61 scenarios on all three browsers; 9 on Chromium only (7 automated by design: DWS-002, 049, 050, 051, 052, 057, 061; plus DWS-066 Blocked and DWS-070 Manual). That gives 68 tests per browser project, 204 in total.

**High-priority gaps:** none in the catalogue. All 19 High scenarios are automated and passed. High-priority behaviour outside the catalogue by decision: signed-in checkout past Billing (D5) and signed-in order placement (REQ-16 as originally written).

Not run: DWS-066 (Blocked, Downloadable products never renders) and DWS-070 (Manual, `@axe-core/playwright` not installed).

### Execution scope (why 68 of 70 run, and why browser counts differ)

- **68 of 70** scenarios are automated and run. 2 are not automated.
- A full run executes **190** tests: chromium 68, firefox 61, webkit 61.

#### Not automated (not run)

| Scenario | Priority | Status | Reason |
| --- | --- | --- | --- |
| DWS-066 Downloadable products page loads | Low | Blocked | Blocked by environment: /customer/downloadableproducts did not render within 20 s (twice) and 45 s (once) during discovery (discovery.md 3, 4.11). Excluded from CI gating; re-check manually (R-05). |
| DWS-070 Automated axe scan of key pages | Low | Manual | @axe-core/playwright is not installed in package.json; adding a dependency needs approval. Run manually with the axe browser extension until then. |

#### Browser-limited by design

| Scenario | Priority | Runs on | Not run on | Reason |
| --- | --- | --- | --- | --- |
| DWS-002 Known email with a wrong password is rejected | High | chromium | firefox, webkit | Chromium only (R-04): limits wrong-password attempts against the shared existingUser account to one per run, because the account lockout threshold is unknown. Firefox and WebKit login rejection is still covered by DWS-003 (unknown email). |
| DWS-049 Signed-in customer adds an own item without touching existing items | High | chromium | firefox, webkit | Chromium only (D2): adds and removes an item in the shared account cart. Runs once per full run because it changes the one shared test account (user decision D2: one account, serial runs). Running it on all three browsers would modify the account three times without adding browser coverage; on Firefox and WebKit the cart and wishlist pages are covered as a guest, and signed-in read-only flows (login, session, account pages) run on all three browsers. |
| DWS-050 Account cart persists across logout and login | High | chromium | firefox, webkit | Chromium only (D2): logs out and back in to check that the account cart is kept. Runs once per full run because it changes the one shared test account (user decision D2: one account, serial runs). Running it on all three browsers would modify the account three times without adding browser coverage; on Firefox and WebKit the cart and wishlist pages are covered as a guest, and signed-in read-only flows (login, session, account pages) run on all three browsers. |
| DWS-051 Guest cart merges into the account cart on login | High | chromium | firefox, webkit | Chromium only (D2): merges a guest cart into the shared account cart on login. Runs once per full run because it changes the one shared test account (user decision D2: one account, serial runs). Running it on all three browsers would modify the account three times without adding browser coverage; on Firefox and WebKit the cart and wishlist pages are covered as a guest, and signed-in read-only flows (login, session, account pages) run on all three browsers. |
| DWS-052 Signed-in checkout reaches Billing with prefilled details (stop at Billing) | High | chromium | firefox, webkit | Chromium only (D2): uses the shared account cart for signed-in checkout up to Billing. Runs once per full run because it changes the one shared test account (user decision D2: one account, serial runs). Running it on all three browsers would modify the account three times without adding browser coverage; on Firefox and WebKit the cart and wishlist pages are covered as a guest, and signed-in read-only flows (login, session, account pages) run on all three browsers. Guest checkout steps run on all three browsers (DWS-058 to DWS-060). |
| DWS-057 Signed-in customer adds and removes an own wishlist item | Medium | chromium | firefox, webkit | Chromium only (D2): adds and removes an item in the shared account wishlist. Runs once per full run because it changes the one shared test account (user decision D2: one account, serial runs). Running it on all three browsers would modify the account three times without adding browser coverage; on Firefox and WebKit the cart and wishlist pages are covered as a guest, and signed-in read-only flows (login, session, account pages) run on all three browsers. The guest wishlist runs on all three browsers (DWS-053 to DWS-056). |
| DWS-061 Guest places a Cash On Delivery order end to end | High | chromium | firefox, webkit | Chromium only (D2/D5, R-06): places a real, permanent guest Cash On Delivery order on the public demo site, so it runs once per full run. Every checkout step up to the Confirm summary runs on Firefox and WebKit in DWS-060. |

Skipped results for these scenarios on other browsers are expected and are not failures.

## 7. Implemented Page Objects

In `pages/demo-web-shop/`:

| Class | File |
| --- | --- |
| DemoWebShopHeader | `header.page.ts` |
| DemoWebShopNotificationBar | `notification-bar.page.ts` |
| DemoWebShopHomePage | `home.page.ts` |
| DemoWebShopLoginPage | `login.page.ts` |
| DemoWebShopRegisterPage | `register.page.ts` |
| DemoWebShopSearchPage | `search.page.ts` |
| DemoWebShopCategoryPage | `category.page.ts` |
| DemoWebShopProductPage | `product.page.ts` |
| DemoWebShopCartPage | `cart.page.ts` |
| DemoWebShopWishlistPage | `wishlist.page.ts` |
| DemoWebShopCheckoutPage | `checkout.page.ts` |
| DemoWebShopOrderCompletedPage | `order-completed.page.ts` |
| DemoWebShopOrderPage | `order.page.ts` |
| DemoWebShopAccountPage | `account.page.ts` |

Helpers:

- `navigation.ts`: `navigateBy`, `waitForReadyOrServerError`, `waitForImagesComplete`.
- `ready-locators.ts`: new and untracked; shared page-ready locators.
- `reserved-rows.ts`: the D1 cleanup guard.
- `secret-input.ts`: `fillAccountValue`, which keeps account values out of reports.

Supporting files:

- `fixtures/demo-web-shop.fixture.ts`: signed-in fixture with a login circuit breaker, `accountCartCleaner`, `cartNetwork`, the addthis blocker, `chromiumOnly()` and `reportOnly`.
- `test-data/demo-web-shop.data.ts`.

## 8. Implemented Test Files

In `tests/demo-web-shop/` (17 specs, 68 tests):

| Spec | Scenarios | Tests |
| --- | --- | --- |
| auth.spec.ts | DWS-001 to 006 | 6 |
| session.spec.ts | DWS-007 to 011 | 5 |
| authorization.spec.ts | DWS-012 to 014 | 3 |
| register.spec.ts | DWS-016 to 020 | 5 |
| search.spec.ts | DWS-021 to 026 | 6 |
| listing.spec.ts | DWS-027 to 031 | 5 |
| product.spec.ts | DWS-032 to 036, 039 | 6 |
| resilience.spec.ts | DWS-037, 038 | 2 |
| cart-guest.spec.ts | DWS-040 to 048 | 9 |
| cart-signed-in.spec.ts | DWS-049 to 051 | 3 |
| checkout-signed-in.spec.ts | DWS-052 | 1 |
| wishlist.spec.ts | DWS-053 to 057 | 5 |
| checkout-guest.spec.ts | DWS-015, 058 to 060, 062 | 5 |
| checkout-cod.spec.ts | DWS-061 (retries 0) | 1 |
| account.spec.ts | DWS-063 to 065 (DWS-066 has no test) | 3 |
| responsive.spec.ts | DWS-067 | 1 |
| accessibility.spec.ts | DWS-068, 069 (DWS-070 has no test) | 2 |

## 9. Browser Execution Results

Latest run, combining the guest pass `2026-11-05_15-59-08` (started 2026-11-05T15:59:08Z, `--workers=3`) with the account pass `2026-11-05_16-05-03` (started 2026-11-05T16:05:03Z, `--workers=1`). Figures are from each run's `summary.md` and `results.json` stats, and they match the latest execution per scenario and browser in `scenarios.json`.

| Browser | Passed | Failed | Flaky | Skipped |
| --- | --- | --- | --- | --- |
| chromium | 68 | 0 | 0 | 0 |
| firefox | 61 | 0 | 0 | 7 |
| webkit | 61 | 0 | 0 | 7 |
| **Total** | **190** | **0** | **0** | **14** |

Per pass:

| Run | Passed | Failed | Flaky | Skipped |
| --- | --- | --- | --- | --- |
| Guest pass `15-59-08` | 103 | 0 | 0 | 2 |
| Account pass `16-05-03` | 87 | 0 | 0 | 12 |

- All 14 skips are the 7 Chromium-only scenarios on Firefox and WebKit: DWS-002, 049, 050, 051, 052, 057, 061. They are skipped by design under D2, R-04 and R-06.
- No test needed a retry. `scenarios.json` has 0 execution rows with more than one attempt.

## 10. Failures and Discrepancies

### Failures in the first full run (Pass B, `2026-11-05_15-14-03`: 83 passed, 4 failed, 12 skipped)

The first full run's Pass A (`2026-11-05_15-07-20`) was launched with `--reporter=list` by mistake, so it has no JSON or summary. Its log showed 103 passed and 2 skipped.

| Scenario | Browser | Result | Classification | Evidence |
| --- | --- | --- | --- | --- |
| DWS-069 | firefox | timedOut (30.2 s) | Test defect (timing) | "Test timeout of 30000ms exceeded." The 12 report-only checks used retrying expects with a 2 s timeout on names known to be absent. Chromium passed in 30.5 s. |
| DWS-069 | webkit | timedOut (31.2 s) | Test defect (timing) | Same cause as on Firefox. |
| DWS-056 | firefox | failed (6.1 s) | Test robustness; underlying UI issue R-36 | "locator.check: Clicking the checkbox did not change its state". An unsized wishlist thumbnail shifted the checkbox 24.5 px under the click. Probe F2c reproduced it deterministically. |
| DWS-050 | chromium | timedOut (15.5 s) | Environment, single occurrence | "Fixture "accountCartCleaner" timeout of 60000ms exceeded during teardown." The test body passed. Teardown "Update shopping cart" hung for about 35 s, then the server returned "We're sorry, an internal error occurred." The same purge succeeded in DWS-049, 051 and 052. The next setup purge removed the leftover Health Book, so the D1 guard worked. Recorded as R-35. |

The final runs had no failures.

### Discrepancies

These are possible product defects. The tests assert the current behaviour.

| Risk | Scenario | Observation |
| --- | --- | --- |
| R-11 | DWS-042 | Cart quantity 0 or -1 with "Update shopping cart" silently removes the row, with no message. |
| R-12 | DWS-045 | An invalid gift card shows the coupon text "The coupon code you entered couldn't be applied to your order". |
| R-13 | DWS-047, 060, 061 | Estimate shipping shows "Ground (0.00)" for US 10001, while checkout charges "Ground (10.00)" for the same address. |
| R-14 | DWS-002, 003, 004 | Login reveals whether an email is registered ("No customer account found" versus "The credentials provided are incorrect"). This is an account enumeration risk. |
| R-15 | DWS-055 | The wishlist share URL uses `http`, not `https`. |
| R-36 | DWS-056 | Cart and wishlist thumbnails have no width or height, which causes layout shift under the pointer. |
| R-05 | DWS-066 | `/customer/downloadableproducts` never renders (possible defect; the scenario is Blocked). |
| R-21 | DWS-014 | `/customer/backinstocksubscriptions` renders for guests, while other `/customer/*` pages redirect. |

## 11. Corrections Applied

`git diff --stat` against checkpoint `9a5b5fc` shows 22 files changed (6,562 insertions, 258 deletions). Most of the insertions are execution rows in `scenarios.json`. There is also one new untracked page helper, `pages/demo-web-shop/ready-locators.ts`.

| Item | Change | Why the acceptance criteria are intact |
| --- | --- | --- |
| DWS-069 | Retrying expects on known-absent names were replaced by single accessible-name and attribute reads after the page-ready wait. | Report-only expectations are unchanged. The final run records the same 12 gaps on all three browsers. Probe F1 found the same 12 gaps on every engine in under 0.1 s per page. The test now takes 5.9 s on Chromium, down from 30.5 s. |
| DWS-056 | The wishlist and cart page objects wait for row images to complete in `open()` and in the update methods. | Only synchronisation was added; no assertion changed. Verified with `--repeat-each=3` on Firefox (run `15-40-07`, 3 of 3 passed). |
| DWS-050 | Cart actions detect the server error page and fail fast (`waitForReadyOrServerError`) instead of hanging. | The assertions and the D1 guard are unchanged. Re-run on Chromium passed (run `15-41-18`). |
| M1 (review 1) | Stale evidence was replaced by the final full run (`15-59-08` and `16-05-03`). | All 68 automated scenarios have the status Passed from the current code. |
| M2 (review 1) | In `scripts/workbook.mjs`, the rollup now takes the worst result per browser in the latest run and returns Failed, Flaky, Partial or Skipped where applicable. It also redacts email addresses from the tracked catalogue. | A failure can no longer be hidden by a later partial run. |
| Minor hardening | Further changes to the page objects, fixture, data and specs (see the diff stat). R-35 and R-36 were added to the risk register. | The re-review on 2026-11-06 returned **Ready**, with no Blocker or Major findings. |

## 12. Remaining Risks and Blockers

The register has 36 risks: 33 Open and 3 Closed (R-17, R-23, R-24). By type: 8 Risk, 6 Discrepancy, 5 Assumption, 14 Ambiguity, 2 Blocker, 1 Defect.

- **Shared single account (R-01, D2).** Signed-in runs must be serial (`--workers=1`). State-changing signed-in tests run on Chromium only.
- **Shared public demo site (R-02).** Other users change data, and the site can be slow or down.
- **R-35 (Blocker, Open).** The server intermittently returns "We're sorry, an internal error occurred." on cart form POSTs. Seen once. The suite now fails fast.
- **Discrepancies asserted as current behaviour:**
  - Quantity 0 silently removes the item (R-11).
  - The gift-card error shows the coupon text (R-12).
  - Estimate shipping shows Ground 0.00 while checkout charges 10.00 (R-13).
  - Login reveals whether an email is registered (R-14).
  - The wishlist share URL uses http (R-15).
  - Unsized thumbnails cause layout shift (R-36).
- **Accessibility.** DWS-069 reports 12 known gaps but does not fail on them:
  - no `lang` attribute
  - no h1 on the home page
  - unnamed controls: header search, newsletter email, three listing selects, cart quantity, cart remove checkbox, terms checkbox, coupon input, gift card input

  No WCAG target is defined (R-31). DWS-068 also records a Firefox gap: Tab from page start does not reach the Email field.
- **DWS-066 Blocked (R-05).** The Downloadable products page never renders.
- **DWS-070 Manual (R-32).** `@axe-core/playwright` is not installed.
- **Exposure in artifacts.** Screenshots (`screenshot: 'on'`) and failure videos of signed-in pages show the account email in the header. They are stored in the git-ignored `artifacts/`, which is inside a OneDrive-synced folder. Reports, `results.json` and `summary.md` were checked clean of account values (probe P9).
- **Weak password (from the hand-over).** The orchestrator reports that the account password is a very common one, and the user should not reuse it. I did not verify this, because credentials are never read.
- **Permanent guest COD orders.** Each full run places one permanent guest COD order (R-06). Orders placed so far:
  - #2411222 (discovery)
  - one with no captured number (run `15-07-20`)
  - #2411261 (run `15-27-19`)
  - #2411276 (run `15-59-08`)
- **Lockout threshold unknown (R-04).** DWS-002 is the only wrong-password attempt, and it runs with retries set to 0.
- **Not covered:**
  - successful registration (no new-user details were provided)
  - signed-in checkout past Billing (D5)
  - payment methods other than COD
  - Downloadable products
  - real session timeout (R-18; expiry is simulated by clearing cookies)
  - email features (forgot password, email a friend, contact us)
  - also from R-34: Remember me persistence, valid coupons and gift cards, configurable product attributes, advanced search, compare list
- **Remaining manual checks:**
  - DWS-066 Downloadable products
  - DWS-070 axe scan with the browser extension
  - COD order placement on Firefox and WebKit, if a browser-specific defect is suspected (R-08)

## 13. Commands Executed

In order. `TEST_SUITE=demo-web-shop` and `BASE_URL=https://demowebshop.tricentis.com/` were set for every test run.

```
node scripts/explore-app.mjs --url https://demowebshop.tricentis.com/ --app demo-web-shop --max-pages 12
node scripts/credentials.mjs init --app demo-web-shop --format xlsx --role existingUser:email,password
node scripts/credentials.mjs check --app demo-web-shop --require existingUser:email,password
node scripts/workbook.mjs validate --app demo-web-shop
node scripts/workbook.mjs build --app demo-web-shop
npx tsc --noEmit
# First full run, Pass A (run 15-07-20, launched with --reporter=list by mistake)
npx playwright test tests/demo-web-shop/{search,listing,product,resilience,cart-guest,checkout-guest,checkout-cod,responsive}.spec.ts --project=chromium --project=firefox --project=webkit --workers=3
# First full run, Pass B (run 15-14-03)
npx playwright test tests/demo-web-shop/{auth,session,authorization,register,cart-signed-in,checkout-signed-in,wishlist,account,accessibility}.spec.ts --project=chromium --project=firefox --project=webkit --workers=1
# Pass A re-run for reports (run 15-27-19, per progress.md)
npx playwright test tests/demo-web-shop/{search,listing,product,resilience,cart-guest,checkout-guest,checkout-cod,responsive}.spec.ts --project=chromium --project=firefox --project=webkit --workers=3
node scripts/workbook.mjs sync --app demo-web-shop
node scripts/workbook.mjs build --app demo-web-shop
# Targeted re-runs after the fixes
npx playwright test --grep "DWS-056" --project=firefox --repeat-each=3
npx playwright test --grep "DWS-069" --project=webkit --project=firefox
npx playwright test --grep "DWS-050" --project=chromium
# Final full run: guest pass (run 15-59-08), then account pass (run 16-05-03)
npx playwright test tests/demo-web-shop/{search,listing,product,resilience,cart-guest,checkout-guest,checkout-cod,responsive}.spec.ts --project=chromium --project=firefox --project=webkit --workers=3
npx playwright test tests/demo-web-shop/{auth,session,authorization,register,cart-signed-in,checkout-signed-in,wishlist,account,accessibility}.spec.ts --project=chromium --project=firefox --project=webkit --workers=1
node scripts/workbook.mjs sync --app demo-web-shop
node scripts/workbook.mjs build --app demo-web-shop
```

`workbook.mjs sync` and `build` were run after each pass.

The exact commands for the following run directories were not handed over to the reporter:

- smoke and probe runs `14-56-28` to `15-03-26`
- `15-39-03` (DWS-069 on Firefox)
- `15-39-26` (DWS-037 and 038 on Chromium)
- `15-41-53` (cart-guest, 33 passed)
- `15-44-28` (wishlist, cart-signed-in and accessibility, 22 passed, 8 skipped)
- `15-57-48` (5 scenarios on Chromium)

All of them passed. They are listed here for completeness.

Reporter commands (read only): `git status`, `git diff --stat`, `git log --oneline -6`, and node scripts that tally `scenarios.json` and the run `results.json` files.

## 14. Overall Automation Readiness

**Ready with limitations**

The latest full run of the current code passed all 68 automated scenarios on their intended browsers: 190 passed, 0 failed, 0 flaky, and 14 skips that are by design. Every High-priority scenario (19 of 19) is automated and passing. The four first-run failures each have an evidenced root cause and a fix that leaves the acceptance criteria unchanged, and the quality re-review returned Ready with no Blocker or Major findings.

The suite is not unconditionally ready, for these reasons:

- It depends on one shared account, which forces serial signed-in runs and limits state-changing signed-in coverage to Chromium.
- It runs against a public shared demo with an intermittent server error (R-35).
- Every run creates a permanent guest order.
- Two Low scenarios are not automated (DWS-066 Blocked, DWS-070 Manual).
- Six behaviour discrepancies are asserted as current behaviour until a product owner decides on them.
- Signed-in checkout past Billing is out of scope by decision D5.

## 15. Recommended Next Steps

1. Optional Minors from the re-review:
   - Add a positive control to DWS-069.
   - Remove the redundant `reportOnly` check in DWS-068.
   - Decide what to do with the untracked `templates/generic-e2e-scenario-catalogue.sample.xlsx`, which this workflow did not create. Exclude it from the commit.
2. Approve and install `@axe-core/playwright`, then automate DWS-070. Set a WCAG target (R-31) before making accessibility checks gate CI.
3. Provide a dedicated test account, or one per browser, so signed-in tests can run in parallel and state-changing signed-in tests can cover Firefox and WebKit.
4. Monitor R-35. If the server error page recurs, escalate it to the site owner as a defect.
5. Review the discrepancies R-11, R-12, R-13, R-14, R-15 and R-36 (and R-05, R-21) with a product owner. Update the assertions if the intended behaviour differs.
6. Set up CI with the credentials supplied as the `CREDENTIALS_JSON` secret. Keep `--workers=1` for the account pass, and keep retries at 0 for DWS-002 and DWS-061.
7. The user should change the account password, and should not reuse it elsewhere.
8. Re-check DWS-066 manually and reclassify it if the page renders.
9. Housekeeping: R-20, R-25, R-27, R-28 and R-30 are still Open in the register, although their scenarios now record or assert the observed behaviour. Review them and close any that are resolved.

---

## Addendum: re-run on 2026-11-06 (user request)

Code unchanged since commit `df75acb`. Credentials check OK; `npx tsc --noEmit` passed.

| Browser | Passed | Failed | Flaky | Skipped (by design) |
| --- | --- | --- | --- | --- |
| chromium | 68 | 0 | 0 | 0 |
| firefox | 61 | 0 | 0 | 7 |
| webkit | 61 | 0 | 0 | 7 |

- Guest pass: run `2026-11-06_13-14-06`, `--workers=3`, 103 passed and 2 skipped in 7.0 min.
- Account pass: run `2026-11-06_13-21-14`, `--workers=1`, 87 passed and 12 skipped in 9.8 min.
- No login was rejected and no internal-error page (R-35) appeared.
- DWS-061 placed guest COD order **#2411680**. Orders so far: #2411222, one uncaptured, #2411261, #2411276, #2411680.
- Workbook synced: 675 execution rows; `validate` 0 errors and 0 warnings; 68 Passed, 2 Not Run (DWS-066 Blocked, DWS-070 Manual).
- The readiness verdict is unchanged: **Ready with limitations**. The results are reproducible across two independent full runs on consecutive days.
