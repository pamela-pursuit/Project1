import { expect, Page } from '@playwright/test';

export class DemoWebShopCheckoutPage {
  constructor(private readonly page: Page) {}

  async expectCheckoutPage(): Promise<void> {
    // Confirm the one-page checkout screen is displayed.
    await expect(this.page).toHaveURL(/\/onepagecheckout$/);
  }

  async expectOrderConfirmation(): Promise<void> {
    // Confirm the order completion page and success message.
    await expect(this.page).toHaveURL(/\/checkout\/completed/);
    await expect(this.page.locator('.title')).toContainText('Your order has been successfully processed!');
  }
}
