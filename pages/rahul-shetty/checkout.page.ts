import { expect, Page } from '@playwright/test';

export class CheckoutPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async completePurchase(location: string): Promise<void> {
    // Enter delivery details, accept terms, and submit the demo purchase.
    await this.page
      .getByRole('textbox', {
        name: 'Please choose your delivery location. Then click on purchase button'
      })
      .fill(location);
    await this.page
      .getByRole('checkbox', { name: 'I agree with the term & Conditions' })
      .click({ force: true });
    await this.page.getByRole('button', { name: 'Purchase' }).click();
  }

  async expectSuccess(): Promise<void> {
    // Confirm the demo order success message.
    await expect(this.page.getByText('Success!')).toBeVisible();
    await expect(
      this.page.getByText(
        'Thank you! Your order will be delivered in next few weeks :-).'
      )
    ).toBeVisible();
  }
}
