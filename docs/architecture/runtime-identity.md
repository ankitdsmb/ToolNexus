# Runtime Identity Contract

## Goal
ToolNexus now emits a single server-owned `RuntimeIdentity` contract so frontend telemetry, backend execution, and admin diagnostics all reference the same runtime fingerprint.

## Contract
`RuntimeIdentity` fields:

- `runtimeType`: runtime language selected by the server execution engine (`dotnet`, `python`, etc.).
- `adapter`: adapter selected for execution (`DotNetExecutionAdapter`, `PythonExecutionAdapter`, `LegacyDotNetStrategy`, or `none`).
- `workerType`: normalized worker identity (`{runtimeType}:{capability}`).
- `fallbackUsed`: `true` when execution used a fallback path (`legacy`, `admission_denied`, `missing`).
- `executionAuthority`: server authority decision (`LegacyAuthoritative`, `UnifiedAuthoritative`, `ShadowOnly`).

## Lifecycle
1. **Origin (server-side):** `UniversalExecutionEngine` initializes runtime identity context values before any adapter call.
2. **Flow through execution:** adapters can refine context (for example Python updates worker orchestration identity).
3. **Response contract:** normalized `UniversalToolExecutionResult` is decorated with `RuntimeIdentity`, then mapped to `ToolExecutionResponse`.
4. **Ledger/admin visibility:** execution detail projections include `RuntimeIdentity` so Admin Execution Detail shows the same runtime fingerprint used for API responses.

## Consistency Rules
- Runtime identity is never authored by the browser.
- Runtime identity is composed from execution context keys that are also used by telemetry collection.
- Adapter mapping and fallback classification are validated with application tests.
