import type { Locator, Page } from '@playwright/test';

/**
 * Page-ready locators shared by a page object and the header actions that navigate to it.
 * Defined once here because the header cannot import those page objects (they compose the header).
 */

/** Cart container holding the table or "Your Shopping Cart is empty!" (probe P4). */
export function cartContent(page: Page): Locator {
  return page.locator('.order-summary-content');
}

export function wishlistHeading(page: Page): Locator {
  return page.getByRole('heading', { level: 1, name: 'Wishlist' });
}

export function searchHeading(page: Page): Locator {
  return page.getByRole('heading', { level: 1, name: 'Search' });
}
