# Docker Optimization Report

## Change implemented

- Added a dedicated Docker stage:
  - `FROM mcr.microsoft.com/playwright:v1.55.0-jammy AS playwright-ci`
- Kept existing app build/runtime stages untouched.

## Why this is production-safe

- No changes to the existing production runtime (`aspnet:8.0-alpine`) stage.
- Playwright runtime requirements are isolated to CI/test target only.

## Layer and size considerations

- No duplicate apt layers were added to the production image path.
- The Playwright CI stage uses the official prebuilt runtime image to avoid ad-hoc dependency layers.
- `npm ci` is executed in the dedicated stage only and does not impact final app image size.

## Cache/reproducibility notes

- `package.json` + `package-lock.json` are copied before `npm ci` for deterministic install behavior.
- Test-only files (`playwright.config.js`, `tests/playwright`) are copied into the test stage after dependency install for better layer caching.
