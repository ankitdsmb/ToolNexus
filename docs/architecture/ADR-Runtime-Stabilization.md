# ADR: Runtime Stabilization

- **Status:** Accepted
- **Date:** 2026-02-23

## Problem
Platform-level runtime bootstrap produced cross-tool failures (`Unsupported action [HTMLDivElement]`, `raw.trim is not a function`, fallback recovery noise) caused by lifecycle normalization invoking execution-oriented `runTool(action, input)` methods during mount.

## Root cause
Execution normalizer treated any `runTool` as mount lifecycle and called it with `(root, manifest, context)`. Tools that expose `runTool(action,input)` interpreted the DOM root argument as an action payload, causing action parsing and downstream type errors.

## Decision
1. Introduce explicit runtime metadata contract: `toolRuntimeType = "execution" | "mount"`.
2. Resolve `runTool` mode by checking explicit metadata first.
3. Use arity fallback (`runTool.length >= 2`) only for legacy modules that do not declare metadata.
4. Skip bootstrap-time invocation for execution-only handlers.
5. Preserve lifecycle mount behavior for true mount/run contracts.
6. Enforce runtime safety with Vitest tests and Playwright console guard.

## Alternatives rejected
- Tool-specific guards in each tool module (creates fragmentation).
- Disabling fallback warnings in tests (masks platform regressions).
- Removing legacy bridge entirely (breaks migration path).

## Migration impact
- Existing execution-style tool modules no longer receive invalid bootstrap arguments.
- Runtime fallback rate should decrease and console errors become actionable test failures.
- Tool developers should prefer explicit `toolRuntimeType` metadata to avoid arity ambiguity, while mount logic remains in lifecycle methods (`create/init/mount`) and execution logic in explicit run actions.

## Addendum 2026-02-24 — Runtime Availability over Content DB Dependency

- **Decision**: Tool runtime pages must degrade gracefully when content database queries fail; render path must continue with catalog/manifest metadata.
- **Rationale**: Runtime execution and tool operability are higher-priority than enriched editorial content during partial outages.
- **Implementation**: `EfToolContentRepository` now catches data-access exceptions and returns null/empty results with warning logs; `ToolsController` already supports SEO fallback values when content is null.
- **Compatibility**: Added `/tools/{category}-tools` alias normalization to preserve legacy links and contract tests.
