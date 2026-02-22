# Tool Smoke Test Report

## Smoke path
- Page: `/tools/json-formatter`
- Action:
  1. Load runtime page
  2. Enter safe sample JSON
  3. Click first runtime action button
  4. Verify output area becomes non-empty

## Outcome definition
- Focus is runtime health and execution path availability (not full semantic correctness).

## Test entrypoint
- `tests/playwright/smoke/tool-execution-smoke.spec.js`
