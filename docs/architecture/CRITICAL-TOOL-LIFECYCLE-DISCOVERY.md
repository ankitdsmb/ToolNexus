# ToolNexus Critical Architecture Discovery — Full Technical Document

## 1. Executive Summary

This document traces the **actual runtime path** for tool pages in ToolNexus from `/tools/{slug}` through client mount, API execution, universal server execution, conformance normalization, telemetry, and UI rendering.

At a high level:

- The Razor tool shell (`ToolShell.cshtml`) always renders an SSR placeholder runtime container (`#tool-root`) and injects `window.ToolNexusConfig` plus module bootstrap scripts.  
- `tool-runtime.js` orchestrates runtime boot and decides whether to use:
  - a **custom module** (`manifest.modulePath`), or
  - an **auto-generated runtime module** (`createAutoToolRuntimeModule`) when `uiMode=auto`, module import fails, or module path is missing.
- `tool-auto-runtime.js` then builds a schema-driven unified UI, calls `POST /api/v1/tools/{slug}/{action}`, and renders JSON results.
- Server execution flows through `ToolService` → pipeline steps → `UniversalExecutionEngine` → authority resolution + snapshot freeze + admission control + adapter selection (dotnet/python) + conformance normalization.
- Telemetry tags are attached in `ToolExecutionContext.Items` and emitted by `ExecutionTelemetryStep`.

---

## 2. Client-Side Lifecycle

### 2.1 Entry point: `/tools/{slug}` request

1. Browser requests `/tools/{segment}`.
2. `ToolNexus.Web.Controllers.ToolsController.Segment`:
   - resolves category vs tool slug,
   - loads tool metadata + content,
   - resolves runtime descriptor via `IToolRegistryService` (`modulePath`, `templatePath`, `styles`, `uiMode`, `complexityTier`),
   - sets `ToolPageViewModel` values:
     - `RuntimeModulePath`
     - `RuntimeCssPath`
     - `RuntimeUiMode`
     - `RuntimeComplexityTier`
     - API base URL/path prefix.
3. Returns `Views/Tools/ToolShell.cshtml`.

### 2.2 Razor/HTML runtime shell

`ToolShell.cshtml` provides:

- Runtime root container:
  - `#tool-root`
  - `data-tool-root="true"`
  - `data-tool-slug="{slug}"`
- SSR placeholder content in input/output/actions panels (loading text + disabled button).
- Runtime config object (`window.ToolNexusConfig`):
  - `apiBaseUrl`
  - `toolExecutionPathPrefix`
  - `runtimeModulePath`
  - `runtimeUiMode`
  - `runtimeComplexityTier`
  - tool details (actions, operationSchema, etc.)
  - runtime log endpoint settings.
- Script includes:
  - `tool-runtime.js` (module bootstrap)
  - `tool-shell-feel.js` (UI effects)
- Optional runtime stylesheet in `@section Head` if `RuntimeCssPath` exists.

### 2.3 Script loading order

1. Global layout scripts (`_Layout.cshtml`): UI state/theme/version/header/command palette.
2. Conditional dynamic imports in layout (tools grid, motion, etc.) where selectors match.
3. Page-specific scripts from `ToolShell.cshtml`:
   - inline config scripts (ToolNexusConfig, logging, correlation ID)
   - `tool-runtime.js`
   - `tool-shell-feel.js`
4. `tool-runtime.js` auto-boot runs if `#tool-root` exists.

### 2.4 Runtime loader/boot logic

`tool-runtime.js` creates runtime via `createToolRuntime()` and calls `bootstrapToolRuntime()`:

- de-dupes duplicate boots via `__toolNexusRuntimeBootPromise`.
- runs previous cleanup callback if present (`__toolNexusRuntimeCleanup`).
- reads slug from `#tool-root[data-tool-slug]`.
- `safeMountTool({root,slug})` performs:
  1. manifest load (`/tools/manifest/{slug}`), fallback manifest on failure.
  2. execution context creation (cleanup/listener/timer tracking).
  3. capability detection + safe DOM mount strategy.
  4. stylesheet injection from manifest `styles`/`cssPath`.
  5. template load (`templatePath`) with fallback if template fails.
  6. template data binding.
  7. DOM contract validation + adaptation + hard failure rendering when invalid.
  8. dependency loading (`manifest.dependencies`) with non-fatal errors.
  9. lifecycle module resolution (custom module import vs auto-runtime module).
 10. lifecycle mount attempt + compatibility/legacy bridge fallbacks + healing loop.
 11. post-mount assertions and cleanup registration.

### 2.5 Dynamic import and auto-runtime decision logic

`safeResolveLifecycle()` attempts `import(modulePath)` if modulePath is present.

Then runtime chooses module:

- `uiMode = normalizeUiMode(manifest.uiMode || ToolNexusConfig.runtimeUiMode)` (only `custom` survives; anything else becomes `auto`)
- `complexityTier = clamp(1..5)`
- `modulePath = manifest.modulePath || ToolNexusConfig.runtimeModulePath`

Selection condition:

- `shouldUseAutoModule = (uiMode === 'auto') || importFailed || !modulePath`
- if true → use `createAutoToolRuntimeModule(...)` (`tool-auto-runtime.js`)
- else → use imported custom module.

### 2.6 Why `tool-auto-runtime.js` is being called

`tool-auto-runtime.js` is called whenever **any** of these are true:

1. Manifest/UI mode resolves to `auto` (default path).
2. Custom module import fails.
3. Module path is missing.

Additionally, complexity logic:

- `tool-runtime.js` flags `enforceCustomForTier` at `complexityTier >= 4`, but still auto-selects module if `uiMode=auto`.
- In `tool-auto-runtime.js`, `create()` blocks runtime UI for `complexityTier >= 4 && uiMode === 'auto'` and renders a config error panel.

So for high-tier tools misconfigured as `uiMode=auto`, auto-runtime still initializes but intentionally displays a blocking config error instead of functional UI.

### 2.7 Custom vs auto UI behavior

- **Custom path:** module imported from manifest path and mounted through lifecycle adapter (modern contract preferred, then normalized legacy paths).
- **Auto path:** schema-driven controls generated by `tool-auto-runtime.js` + `tool-unified-control-runtime.js`.

Auto UI details:

- schema source: `manifest.operationSchema` or `window.ToolNexusConfig.tool.operationSchema`.
- input fields are flattened from schema properties.
- grouped rendering by `group`/`x-group` when `complexityTier >= 2`.
- fallback to raw `payload` JSON textarea when schema unavailable.

### 2.8 Execution trigger flow (client)

In auto-runtime:

1. User clicks `Run`.
2. Runtime validates required fields and parses typed inputs (number/boolean/json/text).
3. Button disabled; status set to `Running…`.
4. `fetch()` request to:
   - `${apiBaseUrl}${toolExecutionPathPrefix}/{slug}/{action}`
   - method: POST
   - headers: `Content-Type: application/json`
   - credentials: `include`
   - body: `{ input: JSON.stringify(payload) }`
5. Response JSON parsed.
6. On success: preview + expanded payload rendered.
7. On failure: inline error panel + status `Execution failed`.
8. Button re-enabled.

### 2.9 Result rendering logic

`tool-unified-control-runtime.js`:

- inline preview (`pre`) with truncation.
- expandable full JSON result (`details > pre`).
- error panel rendering via `.tool-auto-runtime__error` blocks.

### 2.10 Error handling and fallback paths (client)

- Manifest load failure: runtime uses fallback manifest.
- Template failure: continues with legacy DOM/fallback shell.
- DOM contract failure: adapter attempts fix; if unresolved, contract error UI rendered.
- Dependency load failure: logged + execution continues.
- Module import failure: auto-runtime selected.
- Mount failure: compatibility retries, legacy bridge, healing attempts, final fallback container insertion.
- Incident reporter is best-effort; errors are swallowed.

### 2.11 Loading states and non-JS fallback

- SSR shell includes loading placeholders before runtime mounts.
- If JS is disabled or bootstrap fails hard before replacement, SSR placeholders remain and documentation rail content stays available.
- runtime fallback shell can be injected to guarantee non-empty root after failures.

### 2.12 Client telemetry/observability emission

Sources:

- `runtimeObserver.emit(...)`
- `runtimeObservability.record(...)`
- `runtimeIncidentReporter.report(...)`

Emitted events include (examples):

- `bootstrap_start/complete`
- `template_load_start/complete/failure`
- `dependency_start/complete/failure`
- `module_import_start/complete/failure`
- `mount_start/success/failure`
- `healing_*`
- `tool_unrecoverable_failure`

Incident reporter batches and posts to `/api/admin/runtime/incidents`; optional runtime log forwarding posts to configured log endpoint (must be routable).

### 2.13 CSS/style sources in client lifecycle

Applied sources for tool pages:

1. Global bundle chain:
   - `site.css` (imports theme.css)
   - `home-system.css`
   - `product-transform.css`
2. Optional runtime CSS in `<head>` via `Model.RuntimeCssPath`.
3. Runtime-injected styles from manifest `styles` via `ensureStylesheet(...)`.
4. Unified auto-runtime and shared runtime shell classes in `ui-system.css`.

### 2.14 Icon resolution logic

Auto unified UI icon is resolved in `tool-unified-control-runtime.js`:

- uses `manifest.icon` (if provided), mapped through a known keyword icon table (`code`, `json`, `api`, etc.).
- unknown icon values fallback to `code` symbol (`</>`).

### 2.15 Potential race conditions

1. Duplicate bootstrap attempts are guarded, but parallel callers still await a shared boot promise.
2. Style injection can race with first render paint (FOUT-like transient).
3. Template + module load timing differences can trigger compatibility path retries.
4. Runtime cleanup from previous mount is async; failures are logged and ignored.
5. Possible latent bug risk: `runtimeLogger` reference at `tool-runtime.js` bootstrap catch appears unresolved in-file.

### 2.16 Client lifecycle sequence diagrams (text)

#### Primary happy path

Browser  
→ `ToolsController.Segment`  
→ `ToolShell.cshtml` SSR + config + `tool-runtime.js`  
→ `tool-runtime.js bootstrapToolRuntime`  
→ fetch `/tools/manifest/{slug}`  
→ load template + dependencies + module  
→ lifecycle adapter mount  
→ user clicks Run  
→ POST `/api/v1/tools/{slug}/{action}`  
→ render result preview + details.

#### Auto-runtime selection path

Browser  
→ runtime boot  
→ resolve `uiMode/modulePath/import status`  
→ condition true (`uiMode=auto` OR import failed OR no modulePath)  
→ `createAutoToolRuntimeModule`  
→ generate controls from schema  
→ execute API on Run click  
→ render JSON output.

#### Failure/fallback path

Boot  
→ template/dependency/import failure  
→ compatibility adapter + legacy bridge retries  
→ healing loop  
→ unrecoverable  
→ fallback shell + incident telemetry.

---

## 3. Server-Side Lifecycle

### 3.1 Request ingress to API endpoint

Client auto-runtime executes:

- `POST /api/v1/tools/{slug}/{toolAction}` with body `{ input, options? }`

Handled by `ToolNexus.Api.Controllers.ToolsController.Execute(...)`.

Model binding:

- route: `slug`, `toolAction`
- body: `ExecuteToolRequest(Input, Options)`

Controller delegates to `ExecuteInternalAsync`.

### 3.2 Controller to service

`ExecuteInternalAsync` creates `ToolExecutionRequest(slug, action, input, options)` and calls `IToolService.ExecuteAsync`.

`ToolService`:

- validates basic request fields.
- normalizes slug/action to lowercase.
- invokes `IToolExecutionPipeline.ExecuteAsync(...)`.
- enriches output with optional insight.
- catches unhandled exceptions and returns generic failure response.

### 3.3 Pipeline execution order

`ToolExecutionPipeline` orders steps by `Order` and executes sequentially.

Registered step chain:

1. `ValidationStep` (100)
2. `PolicyEnforcementStep` (200)
3. `CachingExecutionStep` (200)
4. `RateLimitStep` (300)
5. `ExecutionStep` (500)
6. `ExecutionTelemetryStep` (650)
7. `MetricsStep` (700)

(For equal order values, DI registration order currently determines effective sequence.)

### 3.4 Authority resolution + snapshot freeze + admission

Inside `UniversalExecutionEngine.ExecuteAsync(...)`:

1. Initialize context tags (`language`, `capability`, worker flags, conformance defaults, admission defaults).
2. Resolve authority via `IExecutionAuthorityResolver`:
   - `ShadowOnly` when shadow mode + language/capability/risk-tier match configured allowlists.
   - `UnifiedAuthoritative` when unified authority enabled + language/capability match.
   - else `LegacyAuthoritative`.
3. Build execution snapshot (`IExecutionSnapshotBuilder`):
   - snapshot id, authority, runtime language, capability, correlation/tenant id, UTC timestamp, conformance version, policy snapshot.
   - snapshot stored in context items (freeze point).
4. Admission control (`IExecutionAdmissionController`) evaluates snapshot/context.
   - if denied: short-circuit with failure result and admission metadata.

### 3.5 Adapter selection and execution

Branching after admission:

- **LegacyAuthority:** use `IApiToolExecutionStrategy` directly (legacy dotnet strategy path).
- **Unified/Shadow authority:** adapter lookup by runtime language.

Adapters:

- `DotNetExecutionAdapter` → `IApiToolExecutionStrategy` execution, timed duration.
- `PythonExecutionAdapter` → `WorkerExecutionOrchestrator`:
  - acquire worker lease,
  - set lease busy,
  - prepare runtime via runtime manager,
  - release lease in finally.
  - returns current-phase fallback payload (`runtime-not-enabled` preview), not full python execution.

### 3.6 Worker orchestration lifecycle (python path)

`WorkerExecutionOrchestrator.PrepareExecutionAsync(...)`:

1. Acquire lease (`IWorkerPoolCoordinator`).
2. Mark lease busy.
3. Call `IWorkerRuntimeManager.PrepareExecutionAsync(...)`.
4. Return `WorkerOrchestrationResult(preparation, leaseAcquired, state)`.
5. Always release lease in `finally` if acquired.

Current default DI uses no-op implementations (`NoOpWorkerPoolCoordinator`, `NoOpWorkerRuntimeManager`), simulating orchestration without real process/container runtime.

### 3.7 Conformance validation/normalization point

After adapter returns `UniversalToolExecutionResult`:

- `IExecutionConformanceValidator.Validate(...)` enforces:
  - valid status in allowed set,
  - metrics object non-null,
  - incidents list non-null.
- invalid/missing values are normalized and tracked in `ConformanceIssues`.
- context tags updated: `conformanceValid`, `conformanceNormalized`, `conformanceIssueCount`.
- normalized result returned.

### 3.8 Telemetry tagging points (server)

Tag values written into `ToolExecutionContext.Items` primarily in `UniversalExecutionEngine` and adapters:

- authority, adapter, language/capability,
- worker manager + lease tags,
- snapshot id/authority/language/capability,
- admission tags,
- conformance tags.

`ExecutionTelemetryStep` reads these tags and records `ToolExecutionEvent` through `IToolExecutionEventService` with duration, success, payload size, and all runtime tags.

### 3.9 Response normalization and HTTP response

- Engine returns normalized universal result.
- Execution step maps to `ToolExecutionResponse`.
- Controller maps to HTTP:
  - `404` when tool not found,
  - `400` when execution unsuccessful,
  - `200` on success,
  - optional `X-Tool-Deprecated: true` header.

Payload remains JSON `ToolExecutionResponse` (plus `Insight` added by `ToolService`).

### 3.10 Error propagation

- Pipeline step errors may return failure response or throw.
- `ExecutionTelemetryStep` records both success and thrown exception paths.
- top-level unhandled exceptions caught in `ToolService` and converted to generic failure response.

---

## 4. End-to-End Flow Diagram

User clicks **Run**  
↓  
`tool-auto-runtime` gathers/validates payload  
↓  
`fetch POST /api/v1/tools/{slug}/{action}` (`{ input: JSON.stringify(payload) }`)  
↓  
API `ToolsController.Execute` model binding  
↓  
`ToolService.ExecuteAsync` validation + normalization  
↓  
Pipeline (`Validation → Policy/Cache → Concurrency → Execution`)  
↓  
`UniversalExecutionEngine`  
↓  
Authority resolve  
↓  
Snapshot build (freeze point)  
↓  
Admission decision  
↓  
Adapter route (dotnet/python/legacy)  
↓  
Conformance validation + normalization  
↓  
Execution telemetry event emission  
↓  
Controller HTTP mapping (200/400/404 + headers)  
↓  
Client receives JSON  
↓  
Unified UI renders preview + expanded details.

### Decision points

- Client: auto vs custom module selection.
- Server: authority selection, adapter selection, admission allow/deny.

### Metadata attachment points

- Client config seeded in `window.ToolNexusConfig`.
- Server context tags added in `UniversalExecutionEngine` + adapters.
- Snapshot object attached before admission and execution.

### Failure points

- Client: manifest/template/dependency/module import/mount/API call.
- Server: policy/rate/auth/admission/adapter lookup/strategy execution.

### Fallback points

- Client: auto-runtime selection, compatibility adapter, legacy bridge, fallback shell.
- Server: legacy authority branch, python runtime-not-enabled fallback payload.

---

## 5. Runtime Loader Decision Tree

```text
Start bootstrap
 └─ Load manifest (or fallback manifest)
    └─ Resolve uiMode + complexityTier + modulePath
       ├─ modulePath missing? -> YES -> use auto runtime module
       ├─ module import fails? -> YES -> use auto runtime module
       ├─ uiMode == auto? -> YES -> use auto runtime module
       └─ otherwise -> use imported custom module

After selection:
 ├─ If complexityTier >= 4 and uiMode == auto:
 │    auto-runtime create() renders tier config error panel (blocked)
 └─ Else mount lifecycle + execution UI
```

### Manifest fields influencing loader

- `modulePath`
- `uiMode` (`custom` vs defaulted `auto`)
- `complexityTier`
- `dependencies`
- `styles` / `cssPath`
- `templatePath`

### Unexpected/important behavior

- `complexityTier >= 4` does not prevent auto-runtime selection globally; it triggers a blocked error panel inside auto-runtime when `uiMode=auto`.
- This means misconfigured high-tier tools can appear “called auto-runtime but not usable,” which is by design enforcement in current code.

---

## 6. Authority & Snapshot Flow

```text
UniversalExecutionEngine.ExecuteAsync
 ├─ initialize context tags
 ├─ authority = resolver.ResolveAuthority(context, request)
 │   ├─ ShadowOnly
 │   ├─ UnifiedAuthoritative
 │   └─ LegacyAuthoritative
 ├─ snapshot = snapshotBuilder.BuildSnapshot(request, context, authority)
 │   └─ snapshot stored in context (freeze point)
 ├─ admissionDecision = admissionController.Evaluate(snapshot, context)
 │   ├─ denied -> return failure result with admission metadata
 │   └─ allowed -> continue
 ├─ execute authority branch / adapter branch
 ├─ conformanceValidator.Validate(adapterResult, request)
 │   └─ normalized result + conformance tags
 └─ return normalized universal result
```

---

## 7. Worker Orchestration Flow

```text
PythonExecutionAdapter.ExecuteAsync
 ├─ Create WorkerExecutionEnvelope
 ├─ workerType = (runtimeLanguage, capability)
 ├─ orchestrator.PrepareExecutionAsync(envelope, workerType)
 │   ├─ Acquire lease
 │   ├─ Mark lease busy
 │   ├─ runtimeManager.PrepareExecutionAsync(...)
 │   └─ Release lease in finally
 ├─ write worker telemetry tags into context
 └─ return fallback ToolExecutionResponse payload (runtime-not-enabled preview)
```

Worker lease lifecycle states currently surfaced:

- Acquired
- Busy (local mutation)
- Released (finally block)

---

## 8. CSS & Styling Flow

### 8.1 Global and page-level styles

- `_Layout.cshtml` loads:
  - `site.css`
  - `home-system.css`
  - `product-transform.css`
- `site.css` imports `theme.css` and contains tool shell layout styling.
- `ToolShell.cshtml` optionally adds runtime-specific css from `Model.RuntimeCssPath`.

### 8.2 Runtime and unified control styling

- Runtime may inject additional manifest styles via `ensureStylesheet(...)`.
- Unified control and auto-runtime form styles are in `ui-system.css` (`.tn-unified-tool-control`, `.tool-auto-runtime__*`).

### 8.3 Layout containers

Main structural containers on tool page:

- `.tool-shell-page`
- `.tool-shell-page__workspace`
- `.tool-shell-page__runtime-zone-shell`
- `#tool-root.tool-shell-page__runtime`
- `.tool-shell-page__docs` (SEO/context rail)

### 8.4 Shadow DOM usage

- No Shadow DOM usage found in the runtime path; DOM is standard light DOM manipulation.

### 8.5 Responsive and theme behavior

- Responsive CSS rules are in `site.css` and related system CSS.
- Theme is root-attribute driven (`data-theme="dark|light"`), toggled by `theme-manager.js`, with CSS variable layers in `theme.css`.

---

## 9. Dependency Graph

### 9.1 Client modules involved

- Entry/runtime orchestration:
  - `tool-runtime.js`
  - `runtime/*` helpers (template loader, dom contract, lifecycle adapter, observability, incident reporter, state registry, execution context)
- Auto runtime:
  - `runtime/tool-auto-runtime.js`
  - `runtime/tool-unified-control-runtime.js`
- Optional per-tool custom modules:
  - `/js/tools/{slug}.js` or manifest module override.

### 9.2 Server services involved

- API ingress:
  - `ToolNexus.Api.Controllers.ToolsController`
- orchestration:
  - `ToolService`
  - `IToolExecutionPipeline` and steps
  - `UniversalExecutionEngine`
- authority/snapshot/conformance:
  - `DefaultExecutionAuthorityResolver`
  - `DefaultExecutionSnapshotBuilder`
  - `DefaultExecutionConformanceValidator`
- adapters:
  - `DotNetExecutionAdapter`
  - `PythonExecutionAdapter`
  - `WorkerExecutionOrchestrator`

### 9.3 DI registrations (critical)

`AddToolExecutionPipeline()` registers:

- pipeline + steps
- universal engine
- authority/snapshot/conformance/admission components
- language adapters (dotnet + python)
- worker runtime manager/pool coordinator (currently no-op defaults)

### 9.4 Runtime managers and telemetry systems

Client:

- `runtimeObserver`
- `runtimeObservability`
- `runtimeIncidentReporter`

Server:

- `ExecutionTelemetryStep` + `IToolExecutionEventService`
- `MetricsStep` via `ToolExecutionMetrics`

---

## 10. Risk Areas

1. **High-tier auto mode mismatch**: `complexityTier >= 4` + `uiMode=auto` yields blocked error panel; operationally appears as “runtime loaded but unusable.”
2. **Module import fallback masking**: import failures silently reroute to auto-runtime, potentially hiding missing custom bundle regressions.
3. **Tie-order dependency**: pipeline has duplicate order value `200`; behavior relies on registration order stability.
4. **No-op worker runtime defaults**: python execution path simulates orchestration, returns fallback output (not true execution).
5. **Potential unresolved logger symbol**: `runtimeLogger` usage in `tool-runtime.js` tail catch appears not defined in same file context.
6. **Best-effort incident/log posting**: swallowed errors can reduce visibility when incident transport itself fails.

---

## 11. Open Questions / Unknown Areas

1. **Expected policy for `complexityTier >= 4`**:
   - Should runtime hard-fail at loader level (before auto module creation), or is current blocked panel intended behavior?
2. **Custom module lifecycle conformance target**:
   - What migration deadline exists for all tools to implement strict modern lifecycle contract?
3. **Python runtime roadmap**:
   - When will no-op worker coordinator/runtime manager be replaced in production path?
4. **runtimeLogger reference**:
   - Is this symbol expected from another module/global, or is it an accidental unresolved reference?
5. **Runtime log endpoint authority**:
   - Canonical endpoint contract expects specific routable path; confirm which host (Web vs API) is source-of-truth in your deployment topology.

### Clarification requested

To remove residual ambiguity, please confirm:

- intended policy for high-complexity auto-mode tools,
- whether unresolved `runtimeLogger` is known/accepted,
- target environment(s) where python adapter should become authoritative.

