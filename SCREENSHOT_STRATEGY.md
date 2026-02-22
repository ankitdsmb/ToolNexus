# Screenshot Strategy

## Targets by page type
- TYPE A: `/`, `/about`, `/contact-us`
- TYPE B: `/tools`, `/tools/json-tools`
- TYPE C: `/tools/json-formatter`, `/tools/base64-encode`

## Device matrix
- Desktop (1440x1024)
- Tablet (iPad)
- Mobile (Pixel 7)

## Baseline storage
- Baselines are produced by Playwright snapshot flow under test snapshot directories.
- Repository baseline root prepared: `tests/playwright/screenshots/baseline/`

## Dynamic masking
- Ignore volatile sections to reduce false positives:
  - `[data-tool-output]`
  - `[data-dynamic-stat]`
