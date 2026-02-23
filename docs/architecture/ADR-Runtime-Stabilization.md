# ADR: Runtime Stabilization

- **Status:** Accepted
- **Date:** 2026-02-23

## Problem
Platform-level runtime bootstrap produced cross-tool failures (`Unsupported action [HTMLDivElement]`, `raw.trim is not a function`, fallback recovery noise) caused by lifecycle normalization invoking execution-oriented `runTool(action, input)` methods during mount.

## Root cause
Execution normalizer treated any `runTool` as mount lifecycle and called it with `(root, manifest, context)`. Tools that expose `runTool(action,input)` interpreted the DOM root argument as an action payload, causing action parsing and downstream type errors.

## Decision
1. Classify `runTool` contracts with arity `>= 2` as `legacy.runTool.execution-only`.
2. Skip bootstrap-time invocation for execution-only handlers.
3. Preserve lifecycle mount behavior for true mount/run contracts.
4. Enforce runtime safety with Vitest tests and Playwright console guard.

## Alternatives rejected
- Tool-specific guards in each tool module (creates fragmentation).
- Disabling fallback warnings in tests (masks platform regressions).
- Removing legacy bridge entirely (breaks migration path).

## Migration impact
- Existing execution-style tool modules no longer receive invalid bootstrap arguments.
- Runtime fallback rate should decrease and console errors become actionable test failures.
- Tool developers must keep mount logic in lifecycle methods (`create/init/mount`) and execution logic in explicit run actions.
