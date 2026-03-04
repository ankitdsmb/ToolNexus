# Playwright Chromium Deployment Safety

## Deployment script

Run the deterministic install script during deployment:

```bash
bash ./scripts/deployment/install-playwright-chromium.sh
```

The script runs:

```bash
playwright install chromium
```

## CI configuration snippet

```yaml
- name: Install Playwright Chromium runtime
  run: npm run playwright:install:chromium
```

## Runtime health check

`/health/runtime` now reports Playwright Chromium availability from startup verification:

- `playwright_chromium_available`
- `playwright_chromium_path`
- `playwright_error`

Startup verification logs a **critical** error when Chromium executable is missing.
