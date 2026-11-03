# Test Design Guide

## Scope

Use this guide when creating or reviewing Playwright scenarios for a user
story, registration flow, login flow, cart, checkout, or validation case.

## Required coverage

For each feature, identify:

1. Happy path
2. Alternate paths
3. Required and optional fields
4. Invalid, empty, whitespace, duplicate, and unexpected input
5. Boundary and limit values
6. Authentication, authorization, and session expiry
7. Network, timeout, retry, and backend failures
8. Refresh, back navigation, duplicate submission, and concurrent edits
9. Empty states, pagination, sorting, and filtering
10. Accessibility, responsive, browser, and localization behavior when in scope

## Prioritization

- **High:** revenue, authentication, authorization, data integrity, and core
  business flows
- **Medium:** validation, recovery, responsive behavior, and common alternate
  paths
- **Low:** cosmetic, rare, or low-impact exploratory cases

## Test rules

- Keep tests independent and repeatable.
- Use deterministic data and explicit setup.
- Assert observable user outcomes, not implementation details.
- Do not invent business rules, messages, limits, or URLs.
- Record unsupported behavior as a requirement gap instead of asserting it.
