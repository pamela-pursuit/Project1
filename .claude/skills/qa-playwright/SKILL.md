---
name: qa-playwright
description: "Use when reviewing user stories, acceptance criteria, web UI behavior, QA coverage, or Playwright automation scenarios."
---

# QA and Playwright Test Design Skill

Use the focused guides in this skill directory when implementing or reviewing
automation:

- [test-design.md](./test-design.md) - risk-based scenario design and coverage
- [pom.md](./pom.md) - Page Object Model structure and responsibilities
- [locators.md](./locators.md) - stable locator and assertion practices
- [credentials.md](./credentials.md) - secure local and CI credential handling
- [reporting.md](./reporting.md) - runners, artifacts, screenshots, and reports

## Workflow

1. Read the complete requirement and relevant project context.
2. Separate stated behavior from assumptions.
3. Identify missing acceptance criteria and ask focused BA/PO questions.
4. Model positive, negative, validation, security, boundary, and edge-case behavior.
5. Rank scenarios by business risk.
6. Select automation candidates that are deterministic and valuable in CI.
7. Define stable locators and data setup strategies.
8. Produce a Playwright skeleton using fixtures, accessible locators, and meaningful assertions.
9. Summarize coverage gaps, risks, and remaining dependencies.

## Scenario checklist

- Happy path and alternate flows
- Required and optional fields
- Invalid, empty, whitespace, duplicate, and unexpected input
- Minimum and maximum limits
- Authentication, authorization, and session expiry
- Network, timeout, retry, and backend failure behavior
- Refresh, back navigation, duplicate submission, and concurrent edits
- Empty states, pagination, sorting, and filtering
- Responsive, cross-browser, accessibility, and localization behavior when in scope

## Locator strategy

Prefer, in order:

1. `getByRole` with an accessible name
2. `getByLabel`
3. `getByPlaceholder` only when stable and unique
4. `getByTestId` with an agreed test-id contract

Do not use implementation-specific selectors when a user-facing accessible locator is available.

## Test design rules

- Keep tests independent and repeatable.
- Avoid arbitrary waits; wait for locators, responses, or assertions.
- Use API calls or fixtures for setup instead of long UI setup where appropriate.
- Do not assert on unspecified copy or implementation details.
- Capture expected errors explicitly; never hide failures with broad catches.
- Keep destructive or environment-dependent actions behind explicit test configuration.

## Project conventions

- Group page objects and tests by application under `pages/<app>/` and
  `tests/<app>/`.
- Keep PowerShell runners under `scripts/`.
- Store generated reports and screenshots under `artifacts/<suite>/`.
- Reuse the focused guides above instead of duplicating these conventions.

## Deliverable format

Return:

1. Requirement Summary
2. Missing Acceptance Criteria
3. Ambiguities & Clarifications Needed
4. Testing Risks
5. Positive Test Scenarios
6. Negative Test Scenarios
7. Boundary Test Scenarios
8. Edge Cases
9. Playwright Automation Scenarios
10. Sample Playwright Test Skeleton
11. Overall Coverage Assessment
