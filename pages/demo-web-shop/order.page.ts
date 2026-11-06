import type { Locator, Page } from '@playwright/test';
import { escapeRegExp } from '../../test-data/demo-web-shop.data';
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

  /**
   * Product table row whose text starts with exactly this product name (the first column;
   * the order-details row markup was not probed, so no link role is assumed).
   */
  productRow(name: string): Locator {
    return this.pageBody.locator('tr').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}(?:\\s|$)`) });
  }
}
