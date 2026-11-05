import type { Locator, Page } from '@playwright/test';
import { DemoWebShopHeader } from './header.page';
import { DemoWebShopNotificationBar } from './notification-bar.page';

/** /orderdetails/<id> (read-only). */
export class DemoWebShopOrderPage {
  readonly header: DemoWebShopHeader;
  readonly notification: DemoWebShopNotificationBar;
  readonly heading: Locator;
  // P4 fallback: the detail containers were not verified, so text checks use the page body.
  readonly pageBody: Locator;

  constructor(private readonly page: Page) {
    this.header = new DemoWebShopHeader(page);
    this.notification = new DemoWebShopNotificationBar(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Order information' });
    this.pageBody = page.locator('.page-body');
  }

  /** Product table row matched by its product name. */
  productRow(name: string): Locator {
    return this.pageBody.locator('tr', { hasText: name });
  }
}
