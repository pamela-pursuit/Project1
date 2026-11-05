import { expect, recordObservation, reportOnly, test } from '../../fixtures/demo-web-shop.fixture';
import { LISTING, MAX_TABS_TO_EMAIL, PRODUCTS } from '../../test-data/demo-web-shop.data';

// P9: account values must not reach report artifacts. Values are filled without step titles
// (fillAccountValue); a trace would still record evaluate arguments and signed-in DOM snapshots,
// so tracing is off for this file (trace is worker-scoped, so it cannot be set per describe).
test.use({ trace: 'off' });

// Report-only (D4, R-31): findings are recorded as `a11y-gap` annotations and do not fail CI
// until a WCAG target is agreed. DWS-070 (axe scan) is Manual: @axe-core/playwright is not installed.
const QUICK = { timeout: 2_000 };

test.describe('Accessibility (report-only)', () => {
  test.describe('Existing account', () => {
    test('[DWS-068] Keyboard-only sign-in', async ({ signInAsExistingUser, header }) => {
      // A rejected sign-in still fails (and trips the lockout circuit breaker); only a11y findings are report-only.
      const report = await signInAsExistingUser({ keyboard: true });

      recordObservation('R-30', `Tab presses to reach Email: ${report.tabsToEmail ?? `not reached within ${MAX_TABS_TO_EMAIL}`}; Tab from Email reached Password: ${report.tabReachedPassword}`);
      await reportOnly('Email field reachable by Tab', async () => {
        expect(report.tabsToEmail, 'Email reached by Tab').not.toBeNull();
      });
      await reportOnly('Tab from Email moves to Password', async () => {
        expect(report.tabReachedPassword, 'Tab order Email -> Password').toBe(true);
      });
      await reportOnly('Signed in after keyboard-only sign-in', async () => {
        await expect(header.logoutLink).toBeVisible(QUICK);
      });
    });
  });

  test('[DWS-069] Known accessibility gaps are reported', async ({ homePage, header, categoryPage, productPage, cartPage }) => {
    await test.step('Home page', async () => {
      await homePage.open();
      await reportOnly('<html> has a lang attribute', async () => {
        await expect(homePage.htmlRoot).toHaveAttribute('lang', /\S+/, QUICK);
      });
      await reportOnly('Home page has an h1', async () => {
        await expect(homePage.heading).not.toHaveCount(0, QUICK);
      });
      await reportOnly('Header search input has an accessible name', async () => {
        await expect(header.searchInput).toHaveAccessibleName(/\S+/, QUICK);
      });
      await reportOnly('Newsletter email input has an accessible name', async () => {
        await expect(homePage.newsletterEmail).toHaveAccessibleName(/\S+/, QUICK);
      });
    });

    await test.step('Category listing', async () => {
      await categoryPage.open(LISTING.slug);
      for (const [name, select] of [
        ['Sort by', categoryPage.sortSelect],
        ['Display per page', categoryPage.pageSizeSelect],
        ['View as', categoryPage.viewModeSelect]
      ] as const) {
        await reportOnly(`Listing "${name}" select has an accessible name`, async () => {
          await expect(select).toHaveAccessibleName(/\S+/, QUICK);
        });
      }
    });

    await test.step('Cart', async () => {
      await productPage.open(PRODUCTS.computingAndInternet.path);
      await productPage.addToCart();
      await cartPage.open();
      const product = PRODUCTS.computingAndInternet.name;
      for (const [name, control] of [
        ['Cart quantity input', cartPage.rowQuantityInput(product)],
        ['Cart remove checkbox', cartPage.rowRemoveCheckbox(product)],
        ['Terms of service checkbox', cartPage.termsCheckbox],
        ['Coupon input', cartPage.couponInput],
        ['Gift card input', cartPage.giftCardInput]
      ] as const) {
        await reportOnly(`${name} has an accessible name`, async () => {
          await expect(control).toHaveAccessibleName(/\S+/, QUICK);
        });
      }
    });
  });
});
