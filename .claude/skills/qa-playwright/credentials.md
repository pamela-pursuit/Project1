# Credential Handling Guide

## Rules

- Never hard-code usernames, passwords, tokens, or real customer data.
- Never ask users to paste passwords into chat.
- Prompt locally with `Read-Host -AsSecureString` for manual runs.
- Pass credentials to the test process through environment variables.
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
