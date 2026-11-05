# Credential Handling Guide

## Credential file (default for new suites)

The user keeps the accounts in one file, which is never committed:

| Source (first match wins) | Use |
| --- | --- |
| `CREDENTIALS_JSON` env var (whole JSON document) | CI secret |
| `CREDENTIALS_FILE` env var pointing to a `.json` or `.xlsx` file | file outside the repository (recommended) |
| `credentials/credentials.json` | local, git-ignored |
| `credentials/credentials.xlsx` | local, git-ignored |

Templates: `test-data/templates/credentials.example.json` and
`credentials.example.xlsx`.

- **JSON:** `{ "<app>": { "<role>": { "email": "...", "password": "..." } } }`.
  Keys beginning with `_` are ignored.
- **Excel:** use sheet `Credentials` (or the first sheet). Row 1 holds `App`,
  `Role`, then one column per field (`Email`, `Password`, `First Name`, ...).
  Headers become camelCase (`First Name` becomes `firstName`). Rows whose App
  starts with `#` and the `Notes` column are ignored.
- **Roles** are named by the user (for example `existingUser`, `newUser`,
  `admin`). The agent asks which roles exist and never guesses values.
- **Placeholders:** `{timestamp}` and `{random}` in a value are resolved on
  each use. Use `qa+{timestamp}@example.test` for registration.
- **Per-field overrides:** `E2E_<APP>_<ROLE>_<FIELD>`, for example
  `E2E_DEMO_WEB_SHOP_EXISTING_USER_PASSWORD`.

Tests read accounts only through `test-data/credentials-store.cjs` in a
fixture:

```ts
import { test as base } from '@playwright/test';
import { getAccount, type Account } from '../test-data/credentials-store.cjs';

export const test = base.extend<{ existingUser: Account }>({
  existingUser: async ({}, use) => {
    await use(await getAccount('my-app', 'existingUser', { required: ['email', 'password'] }));
  }
});
```

Agents check the file with masked output and **never read it directly**.
`.claude/settings.json` denies Read and Edit on `credentials/`.

```powershell
node scripts/credentials.mjs check --app my-app --require existingUser:email,password --require newUser:email,password
```

## Rules

- Never hard-code usernames, passwords, tokens, or real customer data.
- Never ask users to paste passwords into chat.
- Never open, print, copy, or summarize the credentials file. Use
  `scripts/credentials.mjs check`, which masks values.
- Never log account values in tests (`console.log`, test titles,
  annotations, or error messages).
- Prompt locally with `Read-Host -AsSecureString` for manual runs.
- Pass credentials to the test process through the credential file or environment variables.
- Clear credential variables in a `finally` block.
- Use CI secret storage for automated pipelines.
- Use a new email for registration tests and an existing account for login or
  duplicate-email tests.

## Local runner pattern

```powershell
$env:TEST_USERNAME = Read-Host "Username"
$securePassword = Read-Host "Password" -AsSecureString

try {
  $env:TEST_PASSWORD = ConvertFrom-SecureString $securePassword -AsPlainText
  npx playwright test
}
finally {
  Remove-Item Env:TEST_USERNAME, Env:TEST_PASSWORD -ErrorAction SilentlyContinue
}
```

Use process-scoped execution-policy bypass only when required by the local
machine policy:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Cancel a waiting prompt or running test with `Ctrl+C`.
