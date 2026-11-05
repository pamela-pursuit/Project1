import type { Locator, Page } from '@playwright/test';
import { DemoWebShopHeader } from './header.page';
import { navigateBy } from './navigation';
import { DemoWebShopNotificationBar } from './notification-bar.page';

export type AccountSection =
  | 'info'
  | 'addresses'
  | 'orders'
  | 'changepassword'
  | 'downloadableproducts'
  | 'rewardpoints'
  | 'backinstocksubscriptions';

/**
 * /customer/* pages. Read-only: there are no submit methods (requirements section 6).
 * Save, Add new and Change password are only checked for visibility, never clicked.
 */
export class DemoWebShopAccountPage {
  readonly header: DemoWebShopHeader;
  readonly notification: DemoWebShopNotificationBar;
  readonly heading: Locator;
  // Scope: "Addresses" and "Orders" repeat in the footer.
  readonly navigation: Locator;
  // Text container for the empty-state and reward-points texts (P4 fallback).
  readonly pageBody: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly saveButton: Locator;
  readonly addNewAddressButton: Locator;
  readonly oldPassword: Locator;
  readonly newPassword: Locator;
  readonly confirmNewPassword: Locator;
  readonly changePasswordButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new DemoWebShopHeader(page);
    this.notification = new DemoWebShopNotificationBar(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.navigation = page.locator('.block-account-navigation');
    this.pageBody = page.locator('.page-body');
    this.firstName = page.getByLabel('First name:', { exact: true });
    this.lastName = page.getByLabel('Last name:', { exact: true });
    this.email = page.getByLabel('Email:', { exact: true });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.addNewAddressButton = page.getByRole('button', { name: 'Add new' });
    this.oldPassword = page.getByLabel('Old password:');
    this.newPassword = page.getByLabel('New password:');
    this.confirmNewPassword = page.getByLabel('Confirm password:');
    this.changePasswordButton = page.getByRole('button', { name: 'Change password' });
  }

  gender(name: 'Male' | 'Female'): Locator {
    return this.page.getByLabel(name, { exact: true });
  }

  navLink(name: string): Locator {
    return this.navigation.getByRole('link', { name, exact: true });
  }

  /** Raw navigation with no ready wait (a redirect to /login may be expected). */
  async goto(section: AccountSection): Promise<void> {
    await this.page.goto(`customer/${section}`, { waitUntil: 'domcontentloaded' });
  }

  async open(section: AccountSection): Promise<this> {
    await this.goto(section);
    await this.heading.waitFor();
    return this;
  }

  async openSection(linkName: string): Promise<void> {
    await navigateBy(this.page, () => this.navLink(linkName).click(), /\/customer\//);
    await this.heading.waitFor();
  }

  /** Secret-safe comparison of the Email field value. */
  async emailFieldShows(email: string): Promise<boolean> {
    return (await this.email.inputValue()).trim() === email;
  }
}
