import type { Locator, Page } from '@playwright/test';

/**
 * Runs an action that triggers a full-page navigation and waits for the new document's
 * DOMContentLoaded. Never waits on `load` (the addthis script can stall it, R-03).
 *
 * `page.waitForURL` resolves at once when the current URL already matches, so it cannot
 * detect a form POST back to the same URL (cart update, coupon, login rejection). Waiting
 * for the main frame's `framenavigated` event covers both cases. When `url` is given, the
 * final URL is also awaited (for redirects that commit more than one document).
 */
export async function navigateBy(page: Page, action: () => Promise<unknown>, url?: RegExp): Promise<void> {
  await Promise.all([page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()), action()]);
  await page.waitForLoadState('domcontentloaded');
  if (url) {
    await page.waitForURL(url, { waitUntil: 'domcontentloaded' });
  }
}

/**
 * Waits for a page's ready locator or the site's generic error page, whichever comes first,
 * and throws (fail fast, no retry) when the error page is shown. The shared demo server can
 * return "We're sorry, an internal error occurred." after a long cart form POST (environment).
 */
export async function waitForReadyOrServerError(ready: Locator, serverError: Locator, action: string): Promise<void> {
  await ready.or(serverError).first().waitFor();
  if (await serverError.isVisible()) {
    throw new Error(`Server returned its internal error page after "${action}" (environment)`);
  }
}

/**
 * Waits until every image matched by `selector` has finished loading. Cart and wishlist row
 * thumbnails have no width/height, so a late-loading image shifts the row controls (24.5 px
 * observed on Firefox) and a click can land on the wrong spot. Used after page-ready waits.
 */
export async function waitForImagesComplete(page: Page, selector: string): Promise<void> {
  try {
    await page.waitForFunction(
      (css) => Array.from(document.querySelectorAll<HTMLImageElement>(css)).every((image) => image.complete),
      selector,
      { timeout: 10_000 }
    );
  } catch (error) {
    throw new Error(`Row images did not finish loading (${selector})`, { cause: error });
  }
}
