# Runtime Test Environment Governance

## Rollup optional native dependency stabilization

Vitest depends on Vite, and Vite pulls Rollup internals that attempt to load a platform-specific native package (for example `@rollup/rollup-linux-x64-gnu`). In CI and cached install scenarios, npm can occasionally skip optional native dependencies, which causes Vitest runtime startup to crash before tests execute.

### Tooling-layer safeguards

1. `package.json` now declares explicit `optionalDependencies` for:
   - `@rollup/rollup-linux-x64-gnu`
   - `@rollup/wasm-node`

   This improves reproducibility for Linux test runners and keeps the JS/WASM fallback available.

2. `vitest.config.js` includes a Rollup fallback strategy:
   - Detect the expected native Rollup package for the current platform/arch.
   - If the native package cannot be resolved, alias `rollup` to `@rollup/wasm-node`.

   This keeps runtime test execution in a tooling-safe mode without mutating runtime code.

## Validation command

Use the direct Vitest invocation to validate runtime test startup:

```bash
node ./node_modules/vitest/vitest.mjs run tests/runtime
```

Expected outcome: Vitest starts and executes `tests/runtime` without the native Rollup module crash.
