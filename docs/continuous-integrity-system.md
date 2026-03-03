# ToolNexus Continuous CSS/JS Integrity Enforcement

## 1) Folder Structure

```text
config/integrity/
  config.json
  bundle-baseline.json
scripts/integrity/
  shared.mjs
  static-graph-validator.mjs
  manifest-validator.mjs
  runtime-coverage.mjs
  css-prune-simulation.mjs
  bundle-size-regression.mjs
  ci-enforce.mjs
reports/integrity/
  *.json (generated)
.github/workflows/
  integrity-enforcement.yml
```

## 2) Required npm dependencies

- `playwright` (runtime coverage via Chromium coverage API)
- `purgecss` (dry-run unused selector analysis)
- `fast-glob` (deterministic file graph scanning)

## 3) Playwright Coverage Script

- Script: `scripts/integrity/runtime-coverage.mjs`
- Captures JS + CSS coverage using Chromium page coverage.
- Visits configured Razor routes from `config/integrity/config.json`.
- Writes `reports/integrity/runtime-coverage.json`.

## 4) CSS Prune Simulation Script

- Script: `scripts/integrity/css-prune-simulation.mjs`
- Uses PurgeCSS in dry-run mode (`rejected: true`).
- Scans Razor (`.cshtml`) + JS runtime files.
- Applies safelist for dynamic runtime classes + immutable tool-shell anchors.
- Writes `reports/integrity/css-purge-simulation.json`.

## 5) Static Graph Validation Script

- Script: `scripts/integrity/static-graph-validator.mjs`
- Builds JS import graph for first-party runtime code.
- Validates static imports and literal dynamic `import('...')` targets.
- Detects unreachable modules from Razor script entrypoints.
- Writes `reports/integrity/static-graph.json` and fails on violations.

## 6) Manifest Validator

- Script: `scripts/integrity/manifest-validator.mjs`
- Validates `tools.manifest.json` slugs (presence, uniqueness).
- Validates optional `modulePath` file existence.
- Validates slug-based dynamic runtime module existence with deterministic candidate paths.
- Writes `reports/integrity/manifest-validation.json` and fails on violations.

## 7) CI Enforcement Script

- Script: `scripts/integrity/ci-enforce.mjs`
- Runs, in order:
  1. manifest validation
  2. static graph validation
  3. CSS purge simulation
  4. bundle size regression checks
  5. runtime coverage (optional when `INTEGRITY_WITH_RUNTIME=1`)
- Hard-fails CI on first failing gate.

## 8) Example GitHub Actions Pipeline

- Workflow: `.github/workflows/integrity-enforcement.yml`
- Executes static gates first.
- Installs Chromium, starts ToolNexus web server, runs runtime coverage gate.
- Uploads `reports/integrity/*.json` as artifacts.

## 9) package.json Scripts

- `npm run integrity:manifest`
- `npm run integrity:graph`
- `npm run integrity:css`
- `npm run integrity:bundle`
- `npm run integrity:bundle:baseline`
- `npm run integrity:runtime`
- `npm run integrity:ci`

## 10) Run Locally

```bash
npm ci
npm run integrity:ci
```

Runtime coverage mode:

```bash
# terminal 1
node scripts/playwright-webserver.mjs

# terminal 2
npm run integrity:runtime
```

Update bundle baseline intentionally:

```bash
npm run integrity:bundle:baseline
```

## Determinism & Safety Design Notes

- Read-only analysis system: no auto-delete logic.
- JSON report output for every gate.
- Dynamic import support by validating literal import targets and manifest/slug contracts.
- Razor-compatible scanning via `.cshtml` content source mapping.
- Runtime anchor safelisting included to avoid false positives in dynamic class pruning.
