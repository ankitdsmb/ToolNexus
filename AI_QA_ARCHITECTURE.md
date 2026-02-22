# AI QA Architecture

## Test topology
- `tests/playwright/contracts`: DOM contract verification by page type.
- `tests/playwright/runtime`: runtime mount and container health checks.
- `tests/playwright/smoke`: end-to-end safe action smoke execution.
- `tests/playwright/screenshots`: screenshot baseline and visual diff assertions.
- `tests/playwright/helpers`: shared helpers (`page-loader`, selector validator, page matrix).

## Shared components
- **Page loader utility**: normalizes navigation + HTTP/DOM readiness checks.
- **Selector validator**: reusable fail-fast selector contract checker.
- **Page matrix**: source of truth for TYPE A/B/C route targets and required selectors.

## Execution model
- Playwright projects run desktop/tablet/mobile in parallel.
- `PLAYWRIGHT_BASE_URL` allows CI and local override.
- Screenshot matcher uses bounded diff ratio and masks dynamic regions.
