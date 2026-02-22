# AI QA CI/CD Plan

## PR pipeline stages
1. Start ToolNexus.Web test host.
2. Run DOM contracts, runtime mount, and smoke tests.
3. Run visual regression suite.
4. Publish Playwright report and screenshots as CI artifacts.

## Merge gate rules
- Contract and runtime failures: **hard fail**.
- Visual diff over threshold: **hard fail**.
- Optional performance warnings: **soft warning** until SLA threshold is codified.

## Suggested commands
- `npx playwright test tests/playwright/contracts`
- `npx playwright test tests/playwright/runtime`
- `npx playwright test tests/playwright/smoke`
- `npx playwright test tests/playwright/screenshots`
