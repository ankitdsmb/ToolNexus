# Runtime Mount Test Report

## Scope
- Tool pages validated:
  - `/tools/json-formatter`
  - `/tools/base64-encode`

## Assertions
- Tool shell root `#tool-root[data-tool-root="true"]` is visible.
- Runtime output region `[data-tool-output]` is mounted and visible.

## Test entrypoint
- `tests/playwright/runtime/runtime-mount.spec.js`
