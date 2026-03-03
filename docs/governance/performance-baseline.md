# Performance Baseline (Observability-Only)

## Scope
This baseline introduces optional runtime telemetry and offline bundle-surface audits without modifying lifecycle contracts, runtime anchors, SSR semantics, or tool execution flow.

## Baseline Metrics
- **JS modules (total):** 294
- **JS entry points:** 93
- **Dynamically imported modules:** 0
- **Statically reachable modules:** 294
- **Estimated JS payload:** 2,061,741 bytes
- **CSS selectors (total):** 4,728
- **CSS selectors (unique):** 3,318
- **Duplicate selectors:** 150
- **`!important` usage:** 942
- **Total CSS payload:** 659,546 bytes
- **Upgread bundle overlap count:** 22

## Largest JS Modules
1. `vendor/terser.bundle.min.js` (1,025,737 B)
2. `vendor/js-yaml.mjs` (107,533 B)
3. `tool-runtime.js` (71,309 B)
4. `tool-page.js` (40,090 B)
5. `runtime/tool-unified-control-runtime.js` (35,597 B)

## Largest CSS Bundles
1. `lib/monaco/vs/editor/editor.main.css` (308,989 B)
2. `css/upgread-workspace.css` (78,024 B)
3. `css/site.css` (59,537 B)
4. `css/ui-system.css` (50,417 B)
5. `css/upgread_ui-system.css` (24,719 B)

## Runtime Latency Summary
`runtime-performance-report.json` could not collect browser timing metrics in this environment because Playwright browser binaries are not installed. Runtime telemetry instrumentation remains gated (`window.__enableRuntimePerfTelemetry === true`) and emits to `window.__toolRuntimePerfLog` when enabled.

## Identified Heavy Modules
- `src/ToolNexus.Web/wwwroot/js/vendor/terser.bundle.min.js`
- `src/ToolNexus.Web/wwwroot/js/vendor/js-yaml.mjs`
- `src/ToolNexus.Web/wwwroot/js/tool-runtime.js`
- `src/ToolNexus.Web/wwwroot/js/tool-page.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js`

## Identified Heavy CSS Areas
- Monaco editor CSS bundle dominates CSS payload.
- Workspace/system shell styles (`upgread-workspace.css`, `site.css`, `ui-system.css`) are primary non-vendor CSS contributors.
- `upgread_*` bundle selector overlap indicates repeated surface definitions.

## Optimization Opportunity Ranking (No Changes Applied)
1. **Vendor JS containment**: evaluate lazy boundaries for large vendor payloads.
2. **Runtime surface partitioning**: split large runtime/control modules by feature boundary.
3. **CSS overlap governance**: consolidate duplicated selectors in `upgread_*` tracks.
4. **`!important` pressure reduction plan**: prioritize high-specificity clusters.
5. **Monaco CSS strategy**: assess scoped/editor-on-demand loading opportunities.

## Risk Assessment
- **Instrumentation risk:** Low (strictly gated, no lifecycle mutation intended).
- **Audit script risk:** Low (read-only graph/surface analysis, artifact output only).
- **Runtime baseline risk:** Low (best-effort measurement, safe fallback report on unavailable browser runtime).
