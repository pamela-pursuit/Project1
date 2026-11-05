import type { Locator, Page } from '@playwright/test';

/**
 * nopCommerce AJAX notification bar (#bar-notification). It fades out about 4 s after it is
 * shown (implementation probe P2), so specs assert its text straight after the action.
 */
export class DemoWebShopNotificationBar {
  // No role=status/alert on the bar (discovery 5), so the stable id is used.
  readonly root: Locator;
  // The class carries the outcome; `.content` holds only the message text (probe P2).
  readonly success: Locator;
  readonly error: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  // Close icon without an accessible name.
  readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#bar-notification');
    this.success = page.locator('#bar-notification.success');
    this.error = page.locator('#bar-notification.error');
    this.successMessage = this.success.locator('.content');
    this.errorMessage = this.error.locator('.content');
    this.closeButton = page.locator('#bar-notification .close');
  }

  link(name: string): Locator {
    return this.root.getByRole('link', { name });
  }

  /** Closes a bar left by an earlier action so it cannot satisfy the next wait. */
  async dismissIfVisible(): Promise<void> {
    if (await this.root.isVisible()) {
      // dispatchEvent instead of click: the bar may start its own fade-out at the same moment,
      // and a real click would then wait for a visible target until it times out.
      await this.closeButton.dispatchEvent('click');
      await this.root.waitFor({ state: 'hidden' });
    }
  }

  async waitForShown(): Promise<void> {
    await this.root.waitFor({ state: 'visible' });
  }
}
