import { expect, Page } from '@playwright/test';

export class DemoWebShopLoginPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    // Open the login form.
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string): Promise<void> {
    // Enter credentials and submit the login form.
    await this.page.locator('input[name="Email"]').fill(email);
    await this.page.locator('input[name="Password"]').fill(password);
    await this.page.locator('input[value="Log in"]').click();

    // Confirm the signed-in customer is shown.
    await expect(
      this.page.locator('a.account').filter({ hasText: email }).first()
    ).toBeVisible();
  }
}
