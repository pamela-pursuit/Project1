import type { Locator, Page } from '@playwright/test';
import { DemoWebShopHeader } from './header.page';
import { navigateBy } from './navigation';
import { DemoWebShopNotificationBar } from './notification-bar.page';
import { removeReservedRows, snapshotRows, type PurgeResult } from './reserved-rows';

export class DemoWebShopWishlistPage {
  readonly header: DemoWebShopHeader;
  readonly notification: DemoWebShopNotificationBar;
  readonly heading: Locator;
  // Container holding the table or "The wishlist is empty!" (probe P4).
  readonly content: Locator;
  // The wishlist table also has class "cart" (probe P4).
  readonly rows: Locator;
  readonly updateWishlistButton: Locator;
  readonly addToCartButton: Locator;
  // Holds "Your wishlist URL for sharing:" and the link (probe P4).
  readonly shareInfo: Locator;
  readonly shareLink: Locator;

  constructor(private readonly page: Page) {
    this.header = new DemoWebShopHeader(page);
    this.notification = new DemoWebShopNotificationBar(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Wishlist' });
    this.content = page.locator('.wishlist-content');
    this.rows = this.content.locator('table.cart tbody tr');
    this.updateWishlistButton = page.getByRole('button', { name: 'Update wishlist' });
    this.addToCartButton = page.getByRole('button', { name: 'Add to cart' });
    this.shareInfo = page.locator('.share-info');
    this.shareLink = this.shareInfo.getByRole('link');
  }

  row(name: string): Locator {
    return this.rows.filter({ has: this.page.getByRole('link', { name, exact: true }) });
  }

  // No accessible names on the row checkboxes, price or quantity.
  rowRemoveCheckbox(name: string): Locator {
    return this.row(name).locator('input[name=removefromcart]');
  }

  rowAddToCartCheckbox(name: string): Locator {
    return this.row(name).locator('input[name=addtocart]');
  }

  rowUnitPrice(name: string): Locator {
    return this.row(name).locator('.product-unit-price');
  }

  rowQuantityInput(name: string): Locator {
    return this.row(name).locator('input.qty-input');
  }

  async open(): Promise<this> {
    await this.page.goto('wishlist', { waitUntil: 'domcontentloaded' });
    await this.heading.waitFor();
    return this;
  }

  async productNames(): Promise<string[]> {
    return (await snapshotRows(this.rows)).map((row) => row.name);
  }

  async updateWishlist(): Promise<void> {
    await navigateBy(this.page, () => this.updateWishlistButton.click(), /\/wishlist/);
    await this.heading.waitFor();
  }

  async removeProduct(name: string): Promise<void> {
    await this.rowRemoveCheckbox(name).check();
    await this.updateWishlist();
  }

  /** Ticks the row's add-to-cart box and submits. Probe R-27: lands on /cart. Returns the URL. */
  async moveToCart(name: string): Promise<string> {
    await this.rowAddToCartCheckbox(name).check();
    await navigateBy(this.page, () => this.addToCartButton.click());
    return this.page.url();
  }

  /** Cleaner primitive (D1): removes only reserved rows, guarded (architecture 4.4). */
  async removeReservedRows(names: readonly string[]): Promise<PurgeResult> {
    return removeReservedRows({
      rows: this.rows,
      names,
      removeCheckbox: (name) => this.rowRemoveCheckbox(name),
      submit: () => this.updateWishlist()
    });
  }

  /** The /wishlist/<guid> path from the share link (R-15: the scheme is not asserted). */
  async shareUrl(): Promise<string> {
    const text = await this.shareInfo.innerText();
    const match = text.match(/\/wishlist\/[0-9a-f-]{36}/i);
    if (!match) {
      throw new Error('No /wishlist/<guid> URL found in the share text');
    }
    return match[0];
  }
}
