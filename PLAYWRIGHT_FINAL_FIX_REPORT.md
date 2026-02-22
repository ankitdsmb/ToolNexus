# Playwright Final Readiness Fix Report

## 1) Root Cause
Playwright orchestration was polling `http://127.0.0.1:5081/health`, but `ToolNexus.Web` does not expose `/health`. This caused readiness polling to fail despite the server process starting correctly.

## 2) Why `/health` Was Incorrect
- `/health` was not implemented in the target application.
- Readiness checks should target a stable route that is known to exist and return a successful response.
- For this app, `/` is a safer readiness target because it is an SSR route returning HTML.

## 3) Implemented Fix
### Orchestration script update (`scripts/playwright-webserver.mjs`)
- Replaced `/health` polling with configurable readiness path (default `/`).
- Added strict readiness validation:
  - requires HTTP status `200`
  - requires HTML content (`<html ...>` or `<!doctype html>`)
- Kept fail-fast behavior with timeout and child-process exit detection.

### Playwright config alignment (`playwright.config.js`)
- Added shared `readinessPath` and `readinessUrl` derivation.
- Set `webServer.url` to the same readiness URL used by orchestration logic.
- Preserved `127.0.0.1` consistency to avoid localhost/loopback mismatches.

## 4) Validation Run
Command executed:
- `npx playwright test tests/playwright/contracts`

Observed outcome:
- Web server orchestration started and readiness no longer failed on `/health`.
- Test execution proceeded to browser launch stage.
- Run failed afterward due to missing Playwright browser binaries in the environment (`Executable doesn't exist ...`, recommends `npx playwright install`).

## 5) Reliability Score
- **8.5 / 10** for readiness orchestration reliability.

Rationale:
- Positive: uses a stable SSR endpoint, checks for both transport and content validity, aligned config/script URL handling.
- Residual risk: environment provisioning still required for browser binaries in CI/dev containers.

## 6) Future Recommendation
1. Add `npx playwright install --with-deps chromium` (or project browser set) to CI bootstrap.
2. Keep readiness path configurable via `PLAYWRIGHT_READINESS_PATH` for environment-specific routing.
3. Consider adding a lightweight app-owned readiness contract later (if policy allows), but current fix intentionally avoids app logic changes.
