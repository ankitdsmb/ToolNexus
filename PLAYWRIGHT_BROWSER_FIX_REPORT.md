# Playwright Browser Fix Report

## 1) Root cause summary
Playwright test orchestration, web server startup, and readiness checks were functioning, but the browser runtime was missing from the execution environment. This caused Playwright to fail with:

- `Executable doesn't exist`
- `Please run: npx playwright install`

In short: **test runner installed, browser binaries absent**.

## 2) Install strategy chosen
Implemented **explicit CI browser installation** with cache-backed binaries:

- `npx playwright install --with-deps chromium`
- Cache path: `~/.cache/ms-playwright`
- Cache key includes lockfile hash to keep installs deterministic when dependencies change.

Also wired CI to execute:

- `npx playwright test tests/playwright/contracts`

This verifies browser availability as part of pipeline execution.

## 3) Validation evidence
Executed locally:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npx playwright test tests/playwright/contracts`

Result:

- ✅ Browser installation completed and Chromium executable was provisioned.
- ✅ Missing executable error did not occur.
- ⚠️ Contract tests executed but several assertions failed due to application/page contract mismatches (HTTP 404 and selector visibility), which are outside browser-install scope.

## 4) CI stability score
**90 / 100**

Rationale:
- + deterministic explicit install step
- + binary cache to reduce variability and duration
- + active contract-test execution to catch regressions early
- - minor residual risk from upstream Playwright/CDN availability and host package updates

## 5) Maintenance complexity
**Low**

- Single workflow-level install command.
- Standard Playwright cache location and keyed caching pattern.
- No application code coupling or lifecycle hook side effects.

## Exit condition check
- Browsers are provisioned automatically by CI environment automation.
- Tests now run past runtime bootstrap without missing browser executable failures.
