# Playwright Environment Analysis

## Runtime detection summary

- **Application Docker base images (current)**
  - Build stage: `mcr.microsoft.com/dotnet/sdk:8.0`
  - Runtime stage: `mcr.microsoft.com/dotnet/aspnet:8.0-alpine`
- **Container OS family**
  - Runtime image is **Alpine** (musl) for app delivery.
  - Host/container validation environment is **Ubuntu 24.04 (Debian-family)**.
- **Node.js version (validation environment)**: `v22.21.1`
- **Playwright version**
  - Project dev dependency: `@playwright/test ^1.55.0`
  - Effective CLI in validation: `1.58.2` (from `npx playwright --version`)

## Root cause confirmation

The failing command reproduced:

- `npx playwright test tests/playwright/contracts`

Observed error before dependency provisioning:

- `chrome-headless-shell: error while loading shared libraries: libatk-1.0.so.0: cannot open shared object file`

This confirms the browser binaries were present, but Linux runtime dependencies were missing.

## Risk assessment

- Directly replacing the production `aspnet:8.0-alpine` runtime with a Playwright image is high risk and unnecessary for API runtime.
- Safer pattern is to preserve production runtime image and provide a dedicated Playwright-capable container target for CI/test execution.
