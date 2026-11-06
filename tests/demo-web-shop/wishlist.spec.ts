import { chromiumOnly, expect, recordObservation, test } from '../../fixtures/demo-web-shop.fixture';
import { formatPrice, MESSAGES, PRODUCTS } from '../../test-data/demo-web-shop.data';

// P9: account values must not reach report artifacts. Values are filled without step titles
// (fillAccountValue); a trace would still record evaluate arguments and signed-in DOM snapshots,
// so tracing is off for this file (trace is worker-scoped, so it cannot be set per describe).
test.use({ trace: 'off' });

const product = PRODUCTS.healthBook;

test.describe('Wishlist', () => {
  test('[DWS-053] New guest sees the empty wishlist state', async ({ wishlistPage, header }) => {
    await wishlistPage.open();

    await expect(wishlistPage.content).toHaveText(MESSAGES.wishlistEmpty);
    await expect(header.wishlistLink).toHaveText('Wishlist (0)');
  });

  test('[DWS-054] Guest adds a product to the wishlist', async ({ productPage, header }) => {
    await productPage.open(product.path);
    await productPage.addToWishlist();

    await expect(productPage.notification.successMessage).toHaveText(MESSAGES.addedToWishlist);
    await expect(header.wishlistLink).toHaveText('Wishlist (1)');
  });

  test('[DWS-055] Guest wishlist shows the share URL and removes the item', async ({ productPage, wishlistPage, header }) => {
    await test.step(`Arrange: add "${product.name}" to the wishlist`, async () => {
      await productPage.open(product.path);
      await productPage.addToWishlist();
    });
    await wishlistPage.open();

    await expect(wishlistPage.row(product.name)).toBeVisible();
    await expect(wishlistPage.rowUnitPrice(product.name)).toHaveText(formatPrice(product.price));
    await expect(wishlistPage.rowQuantityInput(product.name)).toHaveValue('1');
    await expect(wishlistPage.shareInfo).toContainText(MESSAGES.wishlistShare);
    // R-15: the URL is currently http; only the /wishlist/<guid> path is asserted.
    expect(await wishlistPage.shareUrl()).toMatch(/^\/wishlist\/[0-9a-f-]{36}$/i);

    await wishlistPage.removeProduct(product.name);
    await expect(wishlistPage.content).toHaveText(MESSAGES.wishlistEmpty);
    await expect(header.wishlistLink).toHaveText('Wishlist (0)');
  });

  test('[DWS-056] Wishlist item moves to the cart', async ({ productPage, wishlistPage, cartPage, header }) => {
    await test.step(`Arrange: add "${product.name}" to the wishlist`, async () => {
      await productPage.open(product.path);
      await productPage.addToWishlist();
    });
    const cartBefore = await header.cartCount();
    await wishlistPage.open();
    const landedOn = await wishlistPage.moveToCart(product.name);

    await cartPage.open();
    await expect(cartPage.row(product.name)).toBeVisible();
    await expect(header.cartLink).toHaveText(`Shopping cart (${cartBefore + 1})`);

    // R-27: whether the item leaves the wishlist is recorded, not asserted.
    await wishlistPage.open();
    const stillInWishlist = await wishlistPage.row(product.name).count();
    recordObservation('R-27', `landed on ${new URL(landedOn).pathname}; item still in wishlist: ${stillInWishlist > 0 ? 'yes' : 'no'}`);
  });

  test.describe('Signed in', () => {
    chromiumOnly();
    test(
      '[DWS-057] Signed-in customer adds and removes an own wishlist item',
      { tag: ['@mutates-account', '@chromium-only'] },
      async ({ accountCartCleaner, productPage, wishlistPage, header }) => {
        const { wishlistCount: w } = accountCartCleaner.baseline;
        await productPage.open(product.path);
        await productPage.addToWishlist();
        await expect(productPage.notification.successMessage).toHaveText(MESSAGES.addedToWishlist);
        await expect(header.wishlistLink).toHaveText(`Wishlist (${w + 1})`);

        await wishlistPage.open();
        await expect(wishlistPage.heading).toBeVisible();
        await expect(wishlistPage.row(product.name)).toBeVisible();

        // Guarded primitive (D1): removes only this row and verifies every other row is unchanged.
        const result = await wishlistPage.removeReservedRows([product.name]);
        expect(result.removed).toEqual([product.name]);
        await expect(header.wishlistLink).toHaveText(`Wishlist (${w})`);
        await expect(wishlistPage.row(product.name)).toHaveCount(0);
      }
    );
  });
});
