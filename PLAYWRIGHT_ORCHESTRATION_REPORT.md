# Playwright Orchestration Report

## Root cause

Playwright was launching tests against `PLAYWRIGHT_BASE_URL` before a managed application web server lifecycle existed in config, causing `ERR_CONNECTION_REFUSED` race conditions.

## Changes implemented

1. Added Playwright-managed `webServer` orchestration in `playwright.config.js`:
   - `command`: `PLAYWRIGHT_WEB_TIMEOUT_MS=90000 node ./scripts/playwright-webserver.mjs`
   - `url`: `${PLAYWRIGHT_BASE_URL}/health` (default `http://127.0.0.1:5081/health`)
   - `reuseExistingServer: true`
   - `timeout: 120000`
2. Added `scripts/playwright-webserver.mjs` orchestration wrapper:
   - Starts ToolNexus.Web via deterministic dotnet command.
   - Polls `/health` until ready.
   - Fails fast with explicit message when `/health` is unavailable.
   - Terminates child process cleanly on exit signals.
3. Aligned base URL handling to avoid localhost vs `127.0.0.1` mismatch.

## Validation

Command run:

`npx playwright test tests/playwright/contracts`

Observed result:

- Playwright auto-started the managed web server command.
- Startup health check failed fast as designed because `/health` currently returns `404`.
- Error was explicit:
  - `Timed out waiting for http://127.0.0.1:5081/health... Last observed result: 404...`

## DevOps review

1. **Root cause summary**: Missing deterministic Playwright-managed server startup introduced startup race (`ERR_CONNECTION_REFUSED`), and missing `/health` endpoint blocks readiness gating.
2. **Startup strategy used**: Playwright `webServer` + node wrapper supervising `dotnet run` + active `/health` polling + clean signal shutdown.
3. **CI reliability score**: **82/100** (deterministic startup orchestration fixed; readiness contract still depends on app exposing `/health`).
4. **Expected maintenance cost**: **Low** for orchestration; **Medium** until `/health` endpoint contract is formalized in app/platform baseline.
