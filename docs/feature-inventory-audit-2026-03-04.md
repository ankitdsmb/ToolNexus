# ToolNexus Feature Inventory & Usage Analysis (Forensic Audit)

Date: 2026-03-04
Scope: repository-wide static analysis plus executable-path inspection of runtime bootstrap, DI registration, routing, and worker scheduling.

## 1) Feature Inventory

### A. Web runtime & tool execution subsystem
- Runtime entry and bootstrap: `Views/Tools/ToolShell.cshtml` -> `/js/tool-runtime.js`.
- Runtime phases: manifest/dom/module/mount/recovery phase modules.
- Loader chain: manifest fetch, dependency loader, template loader, module loader, lifecycle adapter.
- Compatibility/fallbacks: legacy execution bridge, legacy bootstrap, legacy auto init hook.
- Runtime policy/intelligence: execution density validator, UI law validator, AI runtime orchestrator, execution intelligence engine.
- Runtime observability: runtime observer, runtime observability snapshot, telemetry event emitter, incident reporter.

### B. Tool registry & manifest subsystem
- Server-side loader: `ToolManifestLoader` and `ToolRegistryService`.
- Runtime registry loader: `/js/runtime/registry/tool-registry-loader.js`.
- Runtime index fallback: tool index + pack resolver.

### C. API platform subsystem
- `ToolNexus.Api` controllers: admin, marketplace, tool execution, analytics, runtime incidents.
- Cross-cutting middleware pipeline: security headers, correlation, request/response logging, admin logging, execution logging, sanitization, exception logging, cache headers.
- AuthN/AuthZ + rate limiting + CORS.

### D. Observability, telemetry, governance subsystem
- OpenTelemetry metrics and prometheus endpoint.
- Background telemetry queue + telemetry background worker.
- Runtime incident ingestion endpoint and DB persistence.
- Governance decision APIs and execution ledger APIs.

### E. Security subsystem
- Web SSRF protection and private network validation (`UrlSecurityValidator`, `PrivateNetworkValidator`, `ToolSecurityMiddleware`).
- API JWT/cookie auth scheme and authorization policies.
- Security logging middleware.

### F. CSS analysis & scanning subsystem
- API endpoint to queue scans (`CssAnalyzerController`).
- Hosted worker pipeline (`CssScanWorker`) with crawler, coverage, selector analysis, optimizer, framework detector, artifact storage.

### G. Background worker subsystem
- Web: `CssScanWorker` hosted service.
- Infrastructure/API: startup orchestrator, telemetry worker, audit outbox worker.

### H. Marketplace / AI generation subsystem
- Marketplace publish + submission validation service.
- AI tool generator controllers/services.
- AI capability factory and governance decision endpoints.

---

## 2) Runtime pipeline verification (requested chain)

Verified path:

`ToolShell.cshtml` -> `/js/tool-runtime.js` -> phase chain (`manifestPhase` -> `domPhase` -> `modulePhase` -> `mountPhase` -> `recoveryPhase`) -> manifest fetch -> template load -> module import -> lifecycle adapter -> tool module execution.

Evidence observed:
- `ToolShell.cshtml` injects runtime config and loads `type="module"` `/js/tool-runtime.js`.
- `tool-runtime.js` imports all 5 phase modules and executes them in order.
- Manifest resolution calls loader and falls back to generated manifest object.
- Template loading uses `tool-template-loader` and mounts through `[data-tool-content-host]` handoff target.
- Module resolution imports runtime module (or schema runtime branch), validates contract, and executes lifecycle adapter.
- Fallback compatibility path invokes legacy execution bridge/legacy bootstrap when lifecycle does not mount.

Conclusion: core runtime pipeline is ACTIVE and reachable in production tool pages.

---

## 3) Feature Usage Table

| Feature | Location | Status | Notes |
|---|---|---|---|
| Runtime bootstrap | `Views/Tools/ToolShell.cshtml` + `wwwroot/js/tool-runtime.js` | **ACTIVE** | ToolShell loads module script and runtime calls `bootstrapToolRuntime()` when `#tool-root` exists. |
| Runtime phase pipeline | `wwwroot/js/runtime/phases/*.js` | **ACTIVE** | All phase modules imported and invoked sequentially from `tool-runtime.js`. |
| Manifest loader (runtime) | `tool-runtime.js` manifest phase | **ACTIVE** | Loads manifest, emits telemetry, falls back safely on failure. |
| Template loader | `wwwroot/js/runtime/tool-template-loader.js` | **ACTIVE** | Invoked in DOM prep phase before lifecycle mount. |
| Module importer / module loader | `tool-runtime.js`, `tool-module-loader.js` | **ACTIVE** | Main path imports module and validates contract; indexed loader used conditionally. |
| Lifecycle adapter | `runtime/tool-lifecycle-adapter.js` | **ACTIVE** | Primary lifecycle mount path used in `safeMount()`. |
| Legacy execution bridge | `runtime/legacy-execution-bridge.js` | **PARTIALLY USED** | Executed only when lifecycle fails to mount UI; fallback path not primary. |
| `legacyAutoInit` hook | `runtime/tool-lifecycle-adapter.js` | **PARTIALLY USED / effectively NO-OP** | Called in deep fallback branch; function currently returns empty lifecycle result only. |
| AI runtime orchestrator | `runtime/orchestrator/ai-runtime-orchestrator.js` | **ACTIVE (policy-gated)** | Called when runtime policy does not disable orchestrator. |
| Execution density validator/reporter | `runtime/execution-density-validator.js` | **ACTIVE** | Always validates; report write scheduled as non-blocking best effort. |
| Runtime incident reporter | `runtime/runtime-incident-reporter.js` | **ACTIVE** | Used by runtime to report mount/runtime failures; posts to admin incidents endpoint. |
| Runtime incidents API | `Api/Controllers/Admin/RuntimeIncidentsController.cs` | **ACTIVE** | Ingest and query endpoints are routed by `MapControllers()`. |
| Web tool registry service | `ToolManifestLoader`, `ToolRegistryService` | **ACTIVE** | Registered in DI and consumed by Web `ToolsController`; warmed at startup. |
| API middleware stack (most) | `ToolNexus.Api/Program.cs` + middleware files | **ACTIVE** | Most middleware explicitly wired in pipeline. |
| `ApiKeyValidationMiddleware` | `ToolNexus.Api/Middleware/ApiKeyValidationMiddleware.cs` | **ORPHANED** | Exists but never added to API middleware pipeline. |
| CSS scan worker pipeline | `Web/Services/CssScanWorker.cs` + `CssAnalyzerController` | **ACTIVE** | Worker hosted; queue jobs created by controller endpoint. |
| Schema runtime path (`createSchemaToolModule`) | `tool-runtime.js` + `schema-engine` | **PARTIALLY USED / currently dormant** | Branch triggers only for `manifest.type == "schema"`; current manifest set has zero schema tools. |
| SEO AI generator service | `Api/Services/SEO/AiSeoContentGenerator.cs` | **ORPHANED** | Class exists but no DI registration or references. |
| Reputation services (`ToolRatingService`, `DeveloperReputationService`) | `Api/Services/Reputation/*` | **UNUSED (registered but not consumed)** | Added to DI in API program but no controller/service references found. |

---

## 4) Dead Code Candidates (evidence-backed)

High-confidence candidates:
1. `src/ToolNexus.Api/Middleware/ApiKeyValidationMiddleware.cs`  
   - No `UseMiddleware<ApiKeyValidationMiddleware>()` call in API startup pipeline.
2. `src/ToolNexus.Api/Services/SEO/AiSeoContentGenerator.cs`  
   - No registrations/injections/references.
3. `src/ToolNexus.Api/Services/Reputation/ToolRatingService.cs` and `DeveloperReputationService.cs`  
   - Registered but no downstream consumer references.

Low-confidence candidates:
- Legacy fallback runtime paths (`legacyAutoInit`, legacy bridge branches) are low-frequency rather than strictly dead; retain unless telemetry proves zero usage over time.

---

## 5) Redundant Systems

1. Runtime telemetry duplication risk
- Runtime emits both internal telemetry events and incident reporting HTTP calls; operational overlap exists between event logging and incident ingestion.

2. Registry sources overlap
- Runtime registry can come from bundled index, fetched registry endpoint, or legacy manifest fallback. This is resilient but adds complexity and possible drift in source-of-truth semantics.

3. Cache layering overlap
- API/Web both use memory/distributed cache registrations, while runtime loaders also keep in-memory JS caches (`templateCache`, module cache, registry cache).

---

## 6) Architectural Drift / inconsistencies

1. Middleware capability drift
- `ApiKeyValidationMiddleware` exists but is not wired; security design may imply API-key checks that currently never run.

2. Dormant schema-runtime architecture
- Full schema-engine execution path is implemented in runtime, but no current manifests mark tools as schema type.

3. Runtime observability data gap
- Existing runtime import observation artifact currently records zero loaded modules (`artifacts/runtime-import-observed.json`), so production/QA runtime execution evidence is missing in repo snapshots.

---

## 7) Runtime risk areas

1. Non-awaited density report persistence
- Density report write is scheduled and intentionally non-blocking; failures are swallowed, so governance artifacts can silently go missing.

2. Undefined symbols in tool-module-loader error path
- `tool-module-loader.js` references telemetry symbols in `.catch` without local imports; this can fail only during import-error paths and obscure root cause.

3. Broad fallback masking
- Runtime fallback chain (adapter -> legacy bridge -> legacy bootstrap -> auto init) prioritizes continuity, but can hide tool contract regressions in non-strict environments.

4. Incident reporter suppression
- Reporter catches and suppresses send failures by design; this avoids user impact but may underreport operational incidents during network/API degradation.

---

## 8) Cleanup recommendations

### Remove (after confirmation telemetry)
- `AiSeoContentGenerator` if no roadmap owner/use-case.
- `ApiKeyValidationMiddleware` or wire it intentionally (prefer wiring if security requirement still exists).

### Refactor
- Clarify source-of-truth for runtime registry (bundled vs endpoint vs legacy manifest fallback) and document precedence contract.
- Add explicit runtime metric for fallback branch activation (`legacyExecuteTool`, `legacyAutoInit`) to measure actual need.

### Consolidate
- Consolidate runtime observability event streams (telemetry event bus vs incident reporter) into a unified schema mapping.

### Document
- Document schema-runtime enablement conditions and rollout plan; currently implemented but dormant.
- Document that density report persistence is best-effort and not durability-guaranteed.

### Leave unchanged
- Core runtime phase chain and ToolShell bootstrap flow are coherent and actively used.
- CSS scan worker architecture is wired end-to-end and should remain intact.
