# Visual Diff Validation Report

## Logic implemented
- `toHaveScreenshot` snapshot comparison on each target page.
- Fails test when diff exceeds configured threshold (`maxDiffPixelRatio = 0.03`).
- Masks dynamic runtime output and stat counters before comparison.

## Test entrypoint
- `tests/playwright/screenshots/visual-regression.spec.js`
