# Locator and Assertion Guide

## Locator priority

Prefer:

1. `getByRole` with an accessible name
2. `getByLabel`
3. `getByPlaceholder` when stable and unique
4. `getByTestId` with an agreed test-id contract
5. Stable `id` or `name` attributes when accessibility locators are unavailable

## Rules

- Scope locators to a component, row, or form where possible.
- Use exact names when one label is contained by another, such as `Male` and
  `Female`.
- Avoid brittle XPath, generated IDs, CSS chains, and volatile text.
- Avoid broad selectors such as `input[type="checkbox"]` when multiple
  checkboxes exist; target a specific `id` or `name`.
- Avoid `force` unless the UI intentionally overlays a usable control and the
  reason is documented.

## Assertions

- Assert the resulting URL after navigation.
- Assert visible success, validation, or error messages.
- Assert persisted data after the operation.
- Prefer web-first assertions such as `toBeVisible`, `toHaveText`, and
  `toHaveURL`.
- Do not assert copy or behavior that the requirement does not define.
