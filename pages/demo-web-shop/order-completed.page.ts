import type { Locator, Page } from '@playwright/test';
import { DemoWebShopHeader } from './header.page';
import { navigateBy } from './navigation';
import { DemoWebShopNotificationBar } from './notification-bar.page';
import { DemoWebShopOrderPage } from './order.page';

/** /checkout/completed/ */
export class DemoWebShopOrderCompletedPage {
  readonly header: DemoWebShopHeader;
  readonly notification: DemoWebShopNotificationBar;
  readonly heading: Locator;
  // P4 fallback: the completion texts sit in the page body (c3 probe read .page-body).
  readonly details: Locator;
  readonly orderDetailsLink: Locator;
  readonly continueButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new DemoWebShopHeader(page);
    this.notification = new DemoWebShopNotificationBar(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Thank you' });
    this.details = page.locator('.page-body');
    this.orderDetailsLink = page.getByRole('link', { name: 'Click here for order details.' });
    this.continueButton = page.getByRole('button', { name: 'Continue' });
  }

  /** The numeric order number from "Order number: n". Throws if absent. */
  async orderNumber(): Promise<string> {
    const text = await this.details.innerText();
    const match = text.match(/Order number:\s*(\d+)/);
    if (!match) {
      throw new Error('No "Order number: <digits>" text on the completion page');
    }
    return match[1];
  }

  async openOrderDetails(): Promise<DemoWebShopOrderPage> {
    await navigateBy(this.page, () => this.orderDetailsLink.click(), /\/orderdetails\/\d+/);
    const order = new DemoWebShopOrderPage(this.page);
    await order.heading.waitFor();
    return order;
  }
}
