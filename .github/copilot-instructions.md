# Workspace Delivery Rules

## Git delivery

After every completed code or configuration change:

1. Run the smallest relevant validation command.
2. Review the diff and confirm no secrets, credentials, generated reports, or
   local artifacts are included.
3. Create a focused commit with the required Copilot co-author trailer.
4. Push the commit to `origin main`.
5. Report the commit hash and push result.

Do not push when validation fails, the change is incomplete, or credentials,
tokens, `.env` files, screenshots, reports, `node_modules`, or other ignored
artifacts would be included. If push permission or authentication fails, keep
the commit locally and report the exact error.
