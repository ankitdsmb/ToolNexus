# CI/CD Playwright Validation

## CI safety checks

- **Pipeline compatibility**: Existing production image stages remain unchanged.
- **New test target**: CI can build/run `playwright-ci` target for browser tests without impacting runtime deployment artifacts.
- **Environment variables**: No new required environment variables introduced by this fix.
- **Determinism**:
  - Uses pinned Playwright base major/minor tag (`v1.55.0-jammy`).
  - Uses `npm ci` with lockfile.

## Recommended CI usage

- Build test target:
  - `docker build --target playwright-ci -t toolnexus-playwright-ci -f dockerfile .`
- Run listing/smoke from that image (or override CMD in CI job).

## Expected behavior in CI

- Browser runtime dependencies are present in test image.
- No `libatk-1.0.so.0` missing-library crash.
- Functional test success still depends on app endpoint availability (`PLAYWRIGHT_BASE_URL` / app startup orchestration).
