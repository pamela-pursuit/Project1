import { expect, Page } from '@playwright/test';
import { CheckoutPage } from './checkout.page';

export class CartPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectProduct(productName: string): Promise<void> {
    // Confirm the selected product is present in the cart.
    await expect(
      this.page.getByRole('row', { name: new RegExp(productName) })
    ).toBeVisible();
  }

  async removeProduct(productName: string): Promise<void> {
    // Remove the selected product and verify its row disappears.
    const productRow = this.page.getByRole('row', {
      name: new RegExp(productName)
    });

    await productRow.getByRole('button', { name: 'Remove' }).click();
    await expect(productRow).toHaveCount(0);
  }

  async expectTotal(total: string): Promise<void> {
    // Confirm the cart total.
    await expect(
      this.page.getByRole('heading', { name: total })
    ).toBeVisible();
  }

  async proceedToCheckout(): Promise<CheckoutPage> {
    // Continue from the cart to checkout.
    await this.page.getByRole('button', { name: 'Checkout' }).click();
    return new CheckoutPage(this.page);
  }
}
