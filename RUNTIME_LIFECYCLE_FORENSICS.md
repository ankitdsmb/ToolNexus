# Runtime Lifecycle Forensics

## 1) Actual lifecycle graph (code-observed)

`tool-runtime.js` mount path:

1. `bootstrapToolRuntime()` resolves `#tool-root` and slug.
2. `safeMountTool()` validates DOM contract pre-mount.
3. `lifecycleAdapter()` delegates to `mountToolLifecycle()`.
4. `mountNormalizedLifecycle()` runs normalized lifecycle in order: `create()` -> `init()` -> `destroy()` binding.
5. Post-mount DOM contract validation runs and classification is emitted.

Primary evidence paths:
- `src/ToolNexus.Web/wwwroot/js/tool-runtime.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-normalizer.js`

## 2) Root ownership flow

Root ownership is kernel-first:

- Tool modules now resolve lifecycle root via `normalizeToolRoot(context)`.
- Re-entrant lifecycle calls can pass `{ handle }`; tools recover root from `handle.root`.
- Kernel enforces root identity (`data-tool-root-id`) and rejects non-Element roots.

## 3) Kernel normalization logic

`normalizeToolRootInput(input)` in `tool-platform-kernel.js` now remains the source of truth for root resolution, covering:

- direct `Element`
- `root/toolRoot/element/host`
- nested `context` and `executionContext`
- `handle.root` / `handle.toolRoot`

Runtime-facing wrappers were aligned to use this normalization path instead of ad-hoc `context?.root || context?.toolRoot` checks.

## 4) Culprit tool list (before fix)

Observed bad runtime-contract tools in strict template loop:

- `json-toolkit-pro` template missing contract anchors.
- `text-intelligence-analyzer` template missing contract anchors.

Observed lifecycle purity break:

- multiple tool wrappers used local root resolution and could miss `handle.root` during retry/re-entry.

## 5) Fix summary per tool/runtime area

- Migrated all top-level tool lifecycle wrappers in `wwwroot/js/tools/*.js` that expose `create/init/destroy` to kernel root normalization + handle-aware root reuse.
- Added contract-compliant templates for:
  - `tool-templates/json-toolkit-pro.html`
  - `tool-templates/text-intelligence-analyzer.html`
- Updated runtime test fixtures to explicit strict/non-strict expectations and contract-valid fixture markup.

## 6) Before vs after execution call graph

Before (problematic paths):

- `tool -> local resolveRoot -> null/throw` on context variants.
- strict runtime tests with legacy templates failed pre-mount contract.

After:

- `tool -> normalizeToolRoot(context|handle|executionContext) -> kernel registerTool()`.
- strict loop templates satisfy required anchors, mount continues to lifecycle normalization.

## 7) Regression risks

- Suites that intentionally assert legacy bridge fallback in strict mode can drift if runtime strict defaults change.
- Tool wrappers not in `tools/*.js` top-level entrypoints may still contain local DOM assumptions (non-lifecycle helper modules).

## 8) Enforcement rules

1. `create/init/destroy` entry modules must call `normalizeToolRoot`.
2. Lifecycle re-entry contexts must accept `{ handle }` and reuse `handle.root`.
3. Strict template loop requires all tool templates include:
   - `data-runtime-container`
   - `data-tool-root`
   - `data-tool-header`
   - `data-tool-body`
   - `data-tool-input`
   - `data-tool-output`
   - `data-tool-actions`
4. Runtime tests that validate fallback behavior must explicitly disable strict mode in test setup.

## Runtime audit (final)

From `tests/js/runtime/tool-runtime-integration.test.js` and `tests/js/runtime/all-tools-runtime-contract.test.js`:

- modern lifecycle mounts: **26/26 pass**
- legacy HTMLElement execution payload safety: **28/28 pass**
- bad tools: **0**

