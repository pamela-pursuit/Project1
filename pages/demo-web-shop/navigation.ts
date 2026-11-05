import type { Page } from '@playwright/test';

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
