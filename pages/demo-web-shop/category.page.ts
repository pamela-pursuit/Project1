import type { Locator, Page } from '@playwright/test';
import { ADD_TO_CART_URL } from '../../test-data/demo-web-shop.data';
import { DemoWebShopHeader } from './header.page';
import { navigateBy } from './navigation';
import { DemoWebShopNotificationBar } from './notification-bar.page';

export class DemoWebShopCategoryPage {
  readonly header: DemoWebShopHeader;
  readonly notification: DemoWebShopNotificationBar;
  readonly heading: Locator;
  // The three listing <select>s have no accessible name; getByRole('combobox') gives 3.
  readonly sortSelect: Locator;
  readonly pageSizeSelect: Locator;
  readonly viewModeSelect: Locator;
  readonly removeFilterLink: Locator;
  // Container scope for the listing items and the view mode state check.
  readonly productItems: Locator;
  readonly productGrid: Locator;
  readonly productList: Locator;
  readonly productTitles: Locator;
  // .actual-price excludes the old (struck-through) price (probe P5).
  readonly itemPrices: Locator;

  constructor(private readonly page: Page) {
    this.header = new DemoWebShopHeader(page);
    this.notification = new DemoWebShopNotificationBar(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.sortSelect = page.locator('#products-orderby');
    this.pageSizeSelect = page.locator('#products-pagesize');
    this.viewModeSelect = page.locator('#products-viewmode');
    this.removeFilterLink = page.getByRole('link', { name: 'Remove Filter' });
    this.productItems = page.locator('.product-item');
    this.productGrid = page.locator('.product-grid');
    this.productList = page.locator('.product-list');
    this.productTitles = this.productItems.locator('.product-title');
    this.itemPrices = this.productItems.locator('.actual-price');
  }

  priceFilterLink(label: string): Locator {
    return this.page.getByRole('link', { name: label });
  }

  // Scoped to the pager: "2" and "Next" also occur elsewhere on the page.
  pagerLink(name: string): Locator {
    return this.page.locator('.pager').getByRole('link', { name, exact: true });
  }

  productItem(name: string): Locator {
    return this.productItems.filter({ has: this.page.getByRole('link', { name, exact: true }) });
  }

  itemAddToCart(name: string): Locator {
    return this.productItem(name).getByRole('button', { name: 'Add to cart' });
  }

  async open(slug: string): Promise<this> {
    await this.page.goto(slug, { waitUntil: 'domcontentloaded' });
    await this.heading.waitFor();
    return this;
  }

  /** Each select's onchange triggers a full navigation (setLocation). */
  async sortBy(label: string): Promise<void> {
    await navigateBy(this.page, () => this.sortSelect.selectOption({ label }), /orderby=/);
    await this.heading.waitFor();
  }

  async setPageSize(size: string): Promise<void> {
    await navigateBy(this.page, () => this.pageSizeSelect.selectOption({ label: size }), /pagesize=/);
    await this.heading.waitFor();
  }

  async viewAs(mode: 'Grid' | 'List'): Promise<void> {
    await navigateBy(this.page, () => this.viewModeSelect.selectOption({ label: mode }), /viewmode=/);
    await this.heading.waitFor();
  }

  async filterByPrice(label: string): Promise<void> {
    await navigateBy(this.page, () => this.priceFilterLink(label).click(), /price=/);
    await this.heading.waitFor();
  }

  async removePriceFilter(): Promise<void> {
    await navigateBy(this.page, () => this.removeFilterLink.click());
    await this.heading.waitFor();
  }

  async goToPage(name: string): Promise<void> {
    await navigateBy(this.page, () => this.pagerLink(name).click(), /pagenumber=/);
    await this.heading.waitFor();
  }

  async productNames(): Promise<string[]> {
    return (await this.productTitles.allInnerTexts()).map((name) => name.trim());
  }

  async productPrices(): Promise<number[]> {
    return (await this.itemPrices.allInnerTexts()).map((price) => Number(price.trim().replace(/,/g, '')));
  }

  /** Adds the first listed product that has an "Add to cart" button. Returns its name. */
  async addFirstAvailableProductToCart(): Promise<string> {
    const item = this.productItems.filter({ has: this.page.getByRole('button', { name: 'Add to cart' }) }).first();
    const name = (await item.locator('.product-title').innerText()).trim();
    await this.notification.dismissIfVisible();
    await Promise.all([
      this.page.waitForResponse((response) => ADD_TO_CART_URL.catalog.test(response.url())),
      item.getByRole('button', { name: 'Add to cart' }).click()
    ]);
    await this.notification.waitForShown();
    return name;
  }
}
