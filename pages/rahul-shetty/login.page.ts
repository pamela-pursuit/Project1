import { expect, Page } from '@playwright/test';

export class LoginPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async open(): Promise<void> {
    // Open the Rahul Shetty login page.
    await this.page.goto(
      process.env.BASE_URL ??
        'https://rahulshettyacademy.com/loginpagePractise/'
    );
  }

  async signIn(username: string, password: string): Promise<void> {
    // Enter credentials, accept terms, and submit the login form.
    await this.page
      .getByRole('textbox', { name: 'Username:' })
      .fill(username);
    await this.page
      .getByRole('textbox', { name: 'Password:' })
      .fill(password);
    await this.page
      .getByRole('checkbox', { name: 'I Agree to the terms and conditions' })
      .check();
    await this.page.getByRole('button', { name: 'Sign In' }).click();

    await expect(this.page).toHaveURL(/\/angularpractice\/shop$/);
  }
}
    // Confirm the shop page is displayed after login.
