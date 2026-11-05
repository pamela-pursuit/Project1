import { expect, recordObservation, test } from '../../fixtures/demo-web-shop.fixture';
import { MESSAGES, PRODUCTS } from '../../test-data/demo-web-shop.data';

// The failure handler raises a native alert (implementation probe P1). Waiting for it is the
// synchronisation point; its text is recorded, not asserted (R-24).
test.describe('Network resilience', () => {
  test('[DWS-037] Aborted add-to-cart request leaves the cart empty', async ({ productPage, cartPage, cartNetwork, header }) => {
    await productPage.open(PRODUCTS.computingAndInternet.path);
    const { fired } = await cartNetwork.abortNext('details');
    const alert = await productPage.clickAddToCartExpectingAlert();
    await fired;
    recordObservation('R-24', `aborted request: alert "${alert}"`);

    await expect(productPage.notification.root).toBeHidden();
    await expect(header.cartLink).toHaveText('Shopping cart (0)');
    await cartPage.open();
    await expect(cartPage.content).toHaveText(MESSAGES.cartEmpty);
  });

  test('[DWS-038] Add to cart succeeds on retry after a simulated 500', async ({ productPage, cartPage, cartNetwork, header }) => {
    await productPage.open(PRODUCTS.computingAndInternet.path);
    await test.step('First attempt: HTTP 500', async () => {
      const { fired } = await cartNetwork.failNextWith(500, 'details');
      const alert = await productPage.clickAddToCartExpectingAlert();
      await fired;
      recordObservation('R-24', `HTTP 500: alert "${alert}"`);
    });

    await test.step('Retry: real request', async () => {
      await productPage.addToCart();
    });

    expect(cartNetwork.hits()).toBe(1);
    await expect(productPage.notification.successMessage).toHaveText(MESSAGES.addedToCart);
    await expect(header.cartLink).toHaveText('Shopping cart (1)');
    await cartPage.open();
    await expect(cartPage.rowQuantityInput(PRODUCTS.computingAndInternet.name)).toHaveValue('1');
  });
});
