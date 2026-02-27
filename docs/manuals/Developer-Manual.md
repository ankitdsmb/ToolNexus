# ToolNexus Developer Manual

## 1. Architecture Overview
ToolNexus uses a governed execution architecture:
- Client runtime (tool shell + mount lifecycle)
- API and pipeline orchestration
- Universal execution engine
- Authority + snapshot + conformance governance
- Adapter and worker orchestration layer

## 2. Tool Creation Flow
1. Add/update tool entry in manifest.
2. Provide runtime module/template assets.
3. Ensure runtime contract compliance (`data-tool-*` anchors and lifecycle compatibility).
4. Validate execution path through API and runtime tests.

## 3. Auto UI Runtime System
- `uiMode=auto` and complexity metadata influence runtime composition.
- Runtime loader resolves module paths, template loading, lifecycle adapter compatibility, and fallback behavior.
- Runtime emits observability telemetry and incident-safe events.

## 4. Custom Runtime Integration
- Use `uiMode=custom` with module lifecycle contract (`create/init/destroy` or adapted equivalents).
- Keep cleanup reliable to avoid stale listeners/state.
- Ensure manifest metadata is present for runtime identity and telemetry tags.

## 5. Runtime Identity
Runtime identity includes:
- runtime type (auto/custom)
- resolution mode (explicit/fallback)
- module source and decision reason
- telemetry tags for diagnostics

## 6. Local Environment Setup and Maintenance
ToolNexus provides two operational scripts that preserve PostgreSQL-first execution architecture and migration safety.

### Setup script
- Command: `npm run env:setup` (or `bash ./scripts/setup-toolnexus.sh`)
- Responsibilities:
  - validates required commands (`dotnet`, `npm`, `psql`, `pg_isready`)
  - restores .NET and npm dependencies
  - validates PostgreSQL connectivity through `TOOLNEXUS_DB_CONNECTION` (or `ConnectionStrings__DefaultConnection`)
  - runs bootstrap validation and migration preflight
  - builds the solution baseline
- Optional behavior:
  - set `TOOLNEXUS_SKIP_PACKAGE_INSTALL=true` to skip apt package installation

### Maintenance script
- Full mode: `npm run env:maintenance`
- Quick mode: `npm run env:maintenance:quick`
- Responsibilities:
  - deterministic dependency restore
  - build validation
  - EF migration safety and drift checks
  - bootstrap gate validation
  - ordered test pipeline (quick mode skips Playwright smoke)

## 7. Test Strategy
- .NET tests: execution pipeline, policy/governance, adapters, telemetry.
- Vitest runtime tests: DOM/runtime contracts and loader behavior.
- Jest runtime tests: JS runtime behavior + coverage.
- Playwright runtime tests: browser-level runtime health and console safety.

## 8. Debugging Runtime Issues
- Use runtime diagnostics API (`window.ToolNexus.runtime.*`) for snapshots, insights, and last error.
- Validate DOM contract and mount state.
- Inspect conformance and runtime telemetry in server/client logs.

## 9. Adding a New Capability
1. Add capability metadata and category mapping.
2. Wire policy enforcement and runtime/UI projection.
3. Add tests for authority route, snapshot metadata, and UI/runtime behavior.
4. Document operational impact for admin governance.
