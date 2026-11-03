import { expect, Page } from '@playwright/test';

export class DemoWebShopRegisterPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    // Open the registration form.
    await this.page.goto('/register');
  }

  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Promise<void> {
    // Select customer details and submit a new registration.
    await this.page.locator('input[name="Gender"][value="M"]').check();
    await this.page.locator('input[name="FirstName"]').fill(firstName);
    await this.page.locator('input[name="LastName"]').fill(lastName);
    await this.page.locator('input[name="Email"]').fill(email);
    await this.page.locator('input[name="Password"]').fill(password);
    await this.page
      .locator('input[name="ConfirmPassword"]')
      .fill(password);
    await this.page.locator('input[name="register-button"]').click();

    // Confirm registration succeeded.
    await expect(this.page.locator('.result')).toContainText(
      'Your registration completed'
    );
  }

  async registerWithExistingEmail(
    email: string,
    password: string
  ): Promise<void> {
    // Submit registration details using an email that already exists.
    await this.page.locator('input[name="Gender"][value="M"]').check();
    await this.page.locator('input[name="FirstName"]').fill('Existing');
    await this.page.locator('input[name="LastName"]').fill('Customer');
    await this.page.locator('input[name="Email"]').fill(email);
    await this.page.locator('input[name="Password"]').fill(password);
    await this.page
      .locator('input[name="ConfirmPassword"]')
      .fill(password);
    await this.page.locator('input[name="register-button"]').click();
  }

  async expectDuplicateEmailError(): Promise<void> {
    // Confirm the duplicate-email validation message.
    await expect(
      this.page.locator('.validation-summary-errors')
    ).toContainText('The specified email already exists');
  }
}
