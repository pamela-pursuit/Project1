# Page Object Model Guide

## Structure

Group page objects by application:

```text
pages/
├── rahul-shetty/
└── demo-web-shop/
```

Keep tests in matching folders:

```text
tests/
├── rahul-shetty/
└── demo-web-shop/
```

## Responsibilities

- Page objects own locators and page-specific actions.
- Tests coordinate business flows and contain scenario-level assertions.
- Methods should express user intent, such as `signIn`, `addToCart`, or
  `expectDuplicateEmailError`.
- Return the next page object when an action navigates to another page.
- Keep setup, data, and cleanup deterministic.

## Avoid

- Duplicating locators in test files
- Long procedural flows inside a single test
- Generic page objects that hide unrelated application behavior
- Assertions that belong to a different page
- Arbitrary waits

## Example

```ts
const loginPage = new LoginPage(page);
await loginPage.open();
await loginPage.signIn(email, password);
```
