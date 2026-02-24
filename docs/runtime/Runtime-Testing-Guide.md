# Runtime Testing Guide

## Vitest runtime suite
Runtime unit/contract tests live in `tests/runtime/` and run via:

```bash
npm run test:runtime
```

Coverage focus:
- Tool platform kernel registration/lifecycle.
- Lifecycle adapter mount/cleanup behavior.
- Execution normalizer safety for execution-only legacy modules.
- Metadata precedence coverage (`toolRuntimeType`) before arity fallback for legacy modules.
- DOM adapter contract node creation.
- Legacy bridge compatibility path.
- Runtime contract validation (toolRootId + required anchors).
- Runtime incident reporter degradation when `fetch` is unavailable (Node/SSR test runtimes) to preserve no-crash guarantees.

## Playwright runtime guards
`assertNoRuntimeConsoleErrors()` (in `tests/playwright/helpers/console-guard.js`) fails tests on:
- `console.error`
- runtime fallback warnings/signals
- unhandled `pageerror`

## Auto tool coverage
`tests/playwright/runtime/runtime-tool-autodiscovery.spec.js` reads `tools.manifest.json` and validates every `/tools/{slug}` route for:
- bootstrap success
- DOM contract anchors visible
- no console/runtime fallback errors

## Adding a new runtime test
1. Add Vitest file under `tests/runtime/*.test.js`.
2. Use deterministic DOM fixtures (jsdom).
3. Assert lifecycle cleanup + contract anchors.
4. For browser-level coverage, extend Playwright runtime specs and keep console guard active.

## CI regression prevention
Recommended pipeline order:
1. `npm run test:runtime`
2. `npm run test:js -- tests/js/runtime --runInBand`
3. `npm run test:playwright:runtime`

This sequence catches contract regressions before end-to-end runtime failures reach production.
