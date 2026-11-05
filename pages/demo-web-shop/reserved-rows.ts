import type { Locator } from '@playwright/test';
import { PROTECTED_ACCOUNT_ITEMS } from '../../test-data/demo-web-shop.data';

export interface RowSnapshot {
  name: string;
  qty: string;
}

export interface PurgeResult {
  /** Reserved rows that were removed. */
  removed: string[];
  /** Rows the purge did not own, verified present with the same quantity afterwards. */
  untouched: RowSnapshot[];
}

/**
 * Cleaner guard shared by the cart and the wishlist (architecture 4.4, D1). Removes only
 * the reserved rows and throws (a safety guard, not an assertion) if any other row changed.
 */
export async function removeReservedRows(options: {
  rows: Locator;
  names: readonly string[];
  removeCheckbox: (name: string) => Locator;
  submit: () => Promise<void>;
}): Promise<PurgeResult> {
  const { rows, names, removeCheckbox, submit } = options;
  const before = await snapshotRows(rows);
  const targets = before.filter((row) => names.includes(row.name)).map((row) => row.name);
  const protectedTargets = targets.filter((name) => (PROTECTED_ACCOUNT_ITEMS as readonly string[]).includes(name));
  if (protectedTargets.length > 0) {
    throw new Error(`Cleanup refused: protected item selected for removal: ${protectedTargets.join(', ')}`);
  }
  const others = before.filter((row) => !targets.includes(row.name));
  if (targets.length === 0) {
    return { removed: [], untouched: others };
  }
  for (const name of targets) {
    await removeCheckbox(name).check();
  }
  const ticked = await rows.locator('input[name=removefromcart]:checked').count();
  if (ticked !== targets.length) {
    throw new Error(`Cleanup refused: ${ticked} remove boxes ticked, expected ${targets.length}`);
  }
  await submit();
  const after = await snapshotRows(rows);
  for (const row of others) {
    const still = after.find((candidate) => candidate.name === row.name);
    if (!still || still.qty !== row.qty) {
      throw new Error(`Cleanup changed a row it does not own: ${row.name}`);
    }
  }
  const leftover = after.filter((row) => targets.includes(row.name)).map((row) => row.name);
  if (leftover.length > 0) {
    throw new Error(`Cleanup did not remove: ${leftover.join(', ')}`);
  }
  return { removed: targets, untouched: others };
}

/** Product name (exact link text in td.product) and quantity of every row. */
export async function snapshotRows(rows: Locator): Promise<RowSnapshot[]> {
  const snapshot = await rows.evaluateAll((trs) =>
    trs.map((tr) => ({
      name: (tr.querySelector('td.product a')?.textContent ?? '').trim(),
      qty: (tr.querySelector('input.qty-input') as HTMLInputElement | null)?.value ?? ''
    }))
  );
  if (snapshot.some((row) => row.name === '')) {
    throw new Error('Cleanup refused: a row without a product name was found (row markup changed?)');
  }
  return snapshot;
}
