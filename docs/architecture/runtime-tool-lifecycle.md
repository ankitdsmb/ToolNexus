# Runtime Tool Lifecycle (Authoritative Forensic Reference)

## Scope

This document describes the actual ToolNexus browser runtime lifecycle as implemented in:

- `src/ToolNexus.Web/wwwroot/js/tool-runtime.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-adapter.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-normalizer.js`
- `src/ToolNexus.Web/wwwroot/js/tools/json-formatter.js`
- `src/ToolNexus.Web/wwwroot/tool-templates/json-formatter.html`

---

## 1) Runtime lifecycle phases

### Phase A — Runtime bootstrap entry

1. `tool-runtime.js` creates a runtime singleton (`createToolRuntime()`).
2. If `#tool-root` exists, runtime boot is scheduled via `scheduleNonCriticalTask(...)`.
3. `bootstrapToolRuntime()` executes and acquires `root`.
4. Duplicate bootstrap protection is applied with `root[__toolNexusRuntimeBootPromise]`.
5. Previous runtime cleanup is executed (`runPreviousCleanup(root)`).
6. `slug` is read from `root.dataset.toolSlug`.

### Phase B — Mount orchestration

1. `safeMountTool({ root, slug })` starts.
2. Mount state is registered in `stateRegistry`.
3. Manifest is loaded (`loadManifest`) with fallback manifest if load fails.
4. `executionContext` is created.
5. Safe DOM mount plan is calculated (`safeDomMount`).
6. Template is loaded (`templateLoader`) and assigned using `root.innerHTML = template`.
7. Template bindings are applied (`templateBinder`).

### Phase C — Pre-mount DOM contract validation

1. `ensureDomContract(root, slug, capabilities)` runs.
2. Validation scope is resolved with priority:
   - closest/matching/query descendant `[data-runtime-container]`
   - then `[data-tool-root]`
   - then `root`.
3. `validateToolDom(scope, { phase: 'pre-mount' })` checks required nodes:
   - `data-tool-root`
   - `data-tool-header`
   - `data-tool-body`
   - `data-tool-input`
   - `data-tool-output`
   - `data-tool-actions`
   - `data-runtime-container`.
4. Adapter behavior:
   - If valid: no adapter.
   - If invalid and detected layout != `LEGACY_LAYOUT`: no adapter.
   - If invalid and `LEGACY_LAYOUT`: `adaptToolDom(...)` then revalidate.

### Phase D — Lifecycle resolver + module selection

1. Runtime loads dependencies.
2. Runtime imports module from `manifest.modulePath`.
3. Runtime inspects lifecycle contract (`inspectLifecycleContract`).
4. Runtime chooses auto module vs imported module based on `uiMode`, module import success, and module path.

### Phase E — Lifecycle mount invocation

1. `safeMount()` calls `lifecycleAdapter(...)`.
2. `mountToolLifecycle(...)` calls `mountNormalizedLifecycle(...)`.
3. `mountNormalizedLifecycle(...)` uses `normalizeToolExecution(...)`.
4. Normalized lifecycle executes:
   - `normalized.create()`
   - `normalized.init()`
   - optional `runTool(...)` if modern lifecycle and available.
5. Mount result is normalized and returned with `{ mounted, cleanup, mode, normalized }`.

### Phase F — Post-mount DOM contract validation

1. Runtime computes post-mount scope from current `[data-tool-root]`, then nearest `[data-runtime-container]`.
2. `validateToolDom(validationScope, { phase: 'post-mount' })` is executed.
3. If invalid:
   - recheck both runtime-container scope and tool-root scope (`hasCompleteContractAcrossResolvedScopes`).
   - if still invalid and layout != `LEGACY_LAYOUT`, adapter is skipped and runtime throws contract error.
   - if layout is `LEGACY_LAYOUT`, post-mount adapter may run and revalidate.

---

## 2) Contract validation timing

Validation occurs at these runtime checkpoints:

1. `pre-mount`
2. `pre-mount-after-adapter` (legacy-only path)
3. `pre-mount-after-fallback` (fallback layout path)
4. `lifecycle-retry-precheck`
5. `lifecycle-retry-recheck`
6. `post-mount`
7. `post-mount-runtime-container-recheck`
8. `post-mount-tool-root-recheck`
9. `post-mount-after-adapter`
10. `error-recovery-precheck`

The critical conformance gate for mount success is post-mount validation in `safeMount()`.

---

## 3) Lifecycle mount responsibilities

A lifecycle implementation mounted through the adapter is responsible for:

1. Preserving contract node discoverability under runtime validation scope.
2. Not removing/hiding canonical contract nodes needed by `validateToolDom`.
3. Returning a usable cleanup path (runtime will synthesize cleanup if missing).
4. Being idempotent or safely repeatable because runtime has retry/recovery paths that can call lifecycle mount more than once.

---

## 4) Allowed DOM mutations

Allowed mutations (per implementation behavior) include:

1. Appending descendants inside existing contract containers.
2. Initializing widgets/editors inside already-present template targets.
3. Attribute updates and text updates.
4. Adapter-injected canonical nodes only in `LEGACY_LAYOUT` compatibility flows.

---

## 5) Forbidden DOM mutations

Forbidden by current contract enforcement behavior:

1. Removing any required contract node from validation scope.
2. Replacing or detaching the runtime container subtree such that required nodes are no longer queryable from post-mount scope.
3. Mutating DOM into non-legacy invalid states, because post-mount adapter is intentionally skipped for non-legacy invalid layouts.
4. Hidden node strategy for `data-tool-output` where output remains hidden (adapter may replace it, indicating hidden output is treated as invalid canonical output in adapter logic).

---

## 6) Idempotency requirements

Lifecycle code must be safe under multiple invocations in the same runtime session due to:

1. Mount retry path (`lifecycleAdapter(...)` can be called again after an exception if retry validation passes).
2. Error recovery path (`lifecycleAdapter(...)` is called again in healing flow).
3. Module-level side effects can independently trigger extra initialization (e.g., direct `DOMContentLoaded` handlers in tool modules).

Practical requirement: `create/init` must tolerate repeated calls without duplicating incompatible DOM state.

---

## 7) Adapter interaction rules

1. Adapter is a compatibility bridge, not a universal fixer.
2. Adapter is only auto-applied when detected layout type is `LEGACY_LAYOUT`.
3. Adapter is explicitly skipped for non-legacy invalid post-mount states.
4. Adapter may create/relabel canonical nodes and may reparent action node aliases into canonical action panel.

---

## 8) Post-mount validation expectations

Mount is considered successful only if post-mount contract remains valid for resolved scope (or for one of the rechecked scopes: runtime-container/tool-root).

Failure semantics:

1. Post-mount invalid + non-legacy layout => runtime assertion error (`DOM contract incomplete`).
2. Mount failure enters healing/recovery pathways, which can invoke lifecycle again.

---

## 9) JSON formatter forensic specifics

### Template contract baseline

`json-formatter.html` includes all canonical nodes pre-mount, including `data-runtime-container`, `data-tool-root`, `data-tool-header`, `data-tool-actions`, `data-tool-body`, `data-tool-input`, and `data-tool-output`.

### Verified post-mount contract failure mechanism

1. `tool-runtime.js` resolves `uiMode` and computes `shouldUseAutoModule = uiMode === 'auto' || importFailed || !modulePath`.
2. When `shouldUseAutoModule` is true, runtime mounts `createAutoToolRuntimeModule(...)` instead of the imported custom tool module.
3. Auto runtime builds UI through `createUnifiedToolControl(...)`, which executes `root.innerHTML = ''` and then `root.append(shell)`.
4. This clears previously validated template contract nodes (`data-runtime-container`, `data-tool-root`, `data-tool-header`, `data-tool-body`, `data-tool-input`, `data-tool-output`, `data-tool-actions`) from mount scope.
5. Post-mount validation then fails. Because resulting layout is non-legacy, post-mount adapter is explicitly skipped, and runtime throws `DOM contract incomplete`.

### Module behavior affecting lifecycle

`/js/tools/json-formatter.js` exports `create/init/destroy` (modern lifecycle-compatible), but also installs an unconditional:

- `document.addEventListener('DOMContentLoaded', () => { init(); });`

and `init()` resolves root globally using:

- `document.querySelector('[data-tool="json-formatter"]')`.

That global event-driven initialization is independent of runtime `mountToolLifecycle(...)` invocation and can trigger additional tool initialization outside the runtime mount call site.

### Why lifecycle mount logs can repeat

The lifecycle resolver log (`Mounted normalized lifecycle for ...`) can appear multiple times from:

1. Runtime retry (`safeMount` catch + retry call).
2. Runtime healing call path.
3. Additional runtime bootstrap/invocation cycle.

Additionally, JSON formatter module-level DOMContentLoaded `init()` adds an extra initialization path that is not coordinated with runtime state registry.

