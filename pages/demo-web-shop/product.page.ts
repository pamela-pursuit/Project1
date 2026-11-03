import { expect, Page } from '@playwright/test';
import { DemoWebShopCartPage } from './cart.page';

export class DemoWebShopProductPage {
  constructor(private readonly page: Page) {}

  async open(productSlug: string): Promise<void> {
    // Open the selected product details page.
    await this.page.goto(`/${productSlug}`);
  }

  async addToCart(): Promise<DemoWebShopCartPage> {
    // Add the product and wait for the success notification.
    await this.page.locator('#add-to-cart-button-31').click();
    await expect(this.page.locator('.bar-notification.success')).toBeVisible();
    // Open the shopping cart.
    await this.page.getByRole('link', { name: /Shopping cart/ }).first().click();

    return new DemoWebShopCartPage(this.page);
  }
}
