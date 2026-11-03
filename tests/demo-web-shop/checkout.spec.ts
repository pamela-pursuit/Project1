import { test } from '@playwright/test';
import { DemoWebShopLoginPage } from '../../pages/demo-web-shop/login.page';
import { DemoWebShopRegisterPage } from '../../pages/demo-web-shop/register.page';

function getPassword(): string {
  const password = process.env.DEMO_SHOP_PASSWORD;

  if (!password) {
    throw new Error(
      'Set DEMO_SHOP_PASSWORD before running Demo Web Shop tests.'
    );
  }

  return password;
}

function getRequiredEmail(
  variableName: 'DEMO_SHOP_NEW_EMAIL' | 'DEMO_SHOP_EXISTING_EMAIL'
): string {
  const email = process.env[variableName];

  if (!email) {
    throw new Error(
      `Set ${variableName} before running Demo Web Shop tests.`
    );
  }

  return email;
}

test.describe('Tricentis Demo Web Shop checkout', () => {
  test('registers a new customer', async ({ page }) => {
    // Step 1: Read the new customer credentials.
    const registerPage = new DemoWebShopRegisterPage(page);
    const email = getRequiredEmail('DEMO_SHOP_NEW_EMAIL');
    const password = getPassword();

    // Step 2: Register the new customer.
    await registerPage.open();
    await registerPage.register(
      'Test',
      'Customer',
      email,
      password
    );
  });

  test('shows an error when registering an existing customer email', async ({
    page
  }) => {
    // Step 1: Open registration with credentials for an existing customer.
    const registerPage = new DemoWebShopRegisterPage(page);

    await registerPage.open();
    await registerPage.registerWithExistingEmail(
      getRequiredEmail('DEMO_SHOP_EXISTING_EMAIL'),
      getPassword()
    );
    // Step 2: Verify duplicate-email validation.
    await registerPage.expectDuplicateEmailError();
  });

  test('logs in an existing customer', async ({ page }) => {
    // Step 1: Read credentials for an already registered customer.
    const loginPage = new DemoWebShopLoginPage(page);
    const email = getRequiredEmail('DEMO_SHOP_EXISTING_EMAIL');
    const password = getPassword();

    // Step 2: Log in and verify the customer account.
    await loginPage.open();
    await loginPage.signIn(email, password);
  });
});
