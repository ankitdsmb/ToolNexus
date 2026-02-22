# Playwright Browser Install Strategy

## Decision
Selected strategy **A: explicit CI install step**, with browser cache reuse.

## Why this is the safest enterprise option
1. **Deterministic and explicit**: the CI workflow now performs `npx playwright install --with-deps chromium` as a first-class step, so browser runtime setup is not implicit or developer-dependent.
2. **No hidden side effects during dependency install**: avoiding npm lifecycle hooks keeps `npm ci` predictable and auditable.
3. **Environment parity**: the same command can be run locally and in CI, ensuring consistent binaries.
4. **Reduced repeat cost**: CI caches `~/.cache/ms-playwright`, so browsers are restored between runs keyed by lockfile state.
5. **Minimal blast radius**: changes are isolated to environment automation (workflow only), with no app/runtime code modifications.

## Rejected alternatives
- **B. Docker stage only**: good for containerized test runs, but does not help standard GitHub-hosted workflow execution unless all Playwright tests are forced through that stage.
- **C. npm lifecycle preinstall**: couples browser provisioning to package install, increasing install time everywhere and obscuring failures in dependency lifecycle logic.

## Implementation notes
- Added cache step for Playwright browser binaries.
- Added explicit browser+system dependency install step for Chromium.
- Added Playwright contract test execution in CI to validate runtime availability.
