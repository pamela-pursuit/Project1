import { expect, Page } from '@playwright/test';
import { DemoWebShopCheckoutPage } from './checkout.page';

export class DemoWebShopCartPage {
  constructor(private readonly page: Page) {}

  async expectProduct(productName: string): Promise<void> {
    // Confirm the expected product is present in the cart.
    await expect(this.page.locator('.cart-item-row')).toContainText(productName);
  }

  async proceedToCheckout(): Promise<DemoWebShopCheckoutPage> {
    // Accept terms and continue to the one-page checkout.
    await this.page.locator('#termsofservice').check();
    await this.page
      .getByRole('button', { name: 'Checkout' })
      .click();

    return new DemoWebShopCheckoutPage(this.page);
  }
}
