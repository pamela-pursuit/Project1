/** Fields of one account, keyed in camelCase (email, password, firstName, ...). */
export type Account = Record<string, string>;

export interface CredentialStore {
  /** Human-readable source label, or null when no source exists. */
  source: string | null;
  apps: Record<string, Record<string, Account>>;
}

export const DEFAULT_FILES: string[];

/** Where credentials are read from; null when no source exists. */
export function resolveSource(): { kind: 'env' | 'file'; file?: string; label: string } | null;

export function loadCredentialStore(options?: { reload?: boolean }): Promise<CredentialStore>;

/**
 * Returns one account with {timestamp} and {random} placeholders resolved.
 * Throws a descriptive error (never containing values) when the app, role,
 * or a required field is missing.
 */
export function getAccount(app: string, role: string, options?: { required?: string[] }): Promise<Account>;

/** Masked view of the store, safe to print. */
export function describeStore(): Promise<{
  source: string | null;
  rows: { app: string; role: string; fields: Record<string, string> }[];
}>;

export function mask(field: string, value: string): string;
export function toKey(header: string): string;
export function envOverrideName(app: string, role: string, field: string): string;
