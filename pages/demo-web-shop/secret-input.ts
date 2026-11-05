import type { Locator } from '@playwright/test';

/**
 * Fills an input with an account value without putting the value in a report step title.
 *
 * Probe P9 found that `locator.fill(value)` and `keyboard.type(value)` are reported as
 * `Fill "<value>"` / `Type "<value>"` in the HTML report, and a boxed test.step does not hide
 * nested steps. `evaluate` is reported as "Evaluate" without its argument. It sets the value
 * and fires the input/change events that a typed value fires. Specs that use this also turn
 * trace off, because a trace records evaluate arguments.
 */
export async function fillAccountValue(input: Locator, value: string): Promise<void> {
  await input.waitFor();
  await input.evaluate((element, text) => {
    const field = element as HTMLInputElement;
    field.focus();
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
