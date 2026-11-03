import { expect, Page } from '@playwright/test';
import { CartPage } from './cart.page';

export class ShopPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async addProduct(productName: string): Promise<void> {
    // Find the requested product and add it to the cart.
    const product = this.page
      .locator('.card')
      .filter({ hasText: productName });

    await expect(product).toBeVisible();
    await product.getByRole('button', { name: /Add/ }).click();
  }

  async openCart(itemCount: number): Promise<CartPage> {
    // Open the cart link with the expected item count.
    const cartLink = this.page.locator('a.nav-link').filter({
      hasText: new RegExp(`Checkout\\s*\\(\\s*${itemCount}\\s*\\)`)
    });

    await expect(cartLink).toHaveCount(1);
    await cartLink.click({ force: true });

    return new CartPage(this.page);
  }
}
