import { test } from '@playwright/test';
import { LoginPage } from '../../pages/rahul-shetty/login.page';
import { ShopPage } from '../../pages/rahul-shetty/shop.page';

function getCredentials(): { username: string; password: string } {
  const { TEST_USERNAME: username, TEST_PASSWORD: password } = process.env;

  if (!username || !password) {
    throw new Error(
      'Set TEST_USERNAME and TEST_PASSWORD before running checkout tests.'
    );
  }

  return { username, password };
}

test.describe('ProtoCommerce checkout', () => {
  test.beforeEach(async ({ page }) => {
    // Step 1: Log in before each checkout scenario.
    const loginPage = new LoginPage(page);
    const credentials = getCredentials();

    await loginPage.open();
    await loginPage.signIn(credentials.username, credentials.password);
  });

  test('completes checkout without a real payment transaction', async ({
    page
  }) => {
    // Step 2: Add a product and open the cart.
    const shopPage = new ShopPage(page);
    await shopPage.addProduct('iphone X');

    const cartPage = await shopPage.openCart(1);
    await cartPage.expectProduct('iphone X');

    const checkoutPage = await cartPage.proceedToCheckout();
    await checkoutPage.completePurchase('India');
    await checkoutPage.expectSuccess();
  });

  test('removes a product before checkout', async ({ page }) => {
    // Step 2: Add a product and open the cart.
    const shopPage = new ShopPage(page);
    await shopPage.addProduct('iphone X');

    const cartPage = await shopPage.openCart(1);
    await cartPage.removeProduct('iphone X');
    await cartPage.expectTotal('₹. 0');
  });
});
    // Step 3: Complete the demo checkout and verify confirmation.
    // Step 3: Remove the product and verify the cart is empty.
