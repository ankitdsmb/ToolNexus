# upgread_workspace Risk Analysis (Documentation-Only)

## Scope & Constraints
- This document is governance analysis only (no CSS edits, no selector removals, no runtime-anchor mutations).
- Runtime anchors are treated as immutable contract nodes: `data-tool-shell`, `data-tool-context`, `data-tool-status`, `data-tool-followup`, `data-tool-content-host`, `data-tool-input`, `data-tool-output`.

## 1) Bundles Referencing `.upgread_workspace`

### Runtime load order (layout)
The shared layout loads the following stylesheet chain for workspace-capable pages:
1. `~/css/site.css`
2. `~/css/home-system.css`
3. `~/css/product-transform.css`
4. `~/css/upgread_ui-system.css`
5. `~/css/upgread_shared-primitives.css`
6. `~/css/upgread_tool-execution-dna.css`
7. `~/css/upgread_pages.css`
8. `~/css/upgread-workspace.css`

The workspace root class is attached at `<body class="page-enter upgread_workspace" ...>`.

### Bundles with direct `.upgread_workspace` selector references
- `src/ToolNexus.Web/wwwroot/css/upgread_ui-system.css`
- `src/ToolNexus.Web/wwwroot/css/upgread_shared-primitives.css`
- `src/ToolNexus.Web/wwwroot/css/upgread_tool-execution-dna.css`
- `src/ToolNexus.Web/wwwroot/css/upgread_pages.css`
- `src/ToolNexus.Web/wwwroot/css/upgread-workspace.css`

### Related indirection
- `src/ToolNexus.Web/wwwroot/css/site.css` imports `upgread-workspace.css` and contains the workspace activation comment (`body.upgread_workspace`).

## 2) Scope Characterization

### A. Structural Scope
`.upgread_workspace` is applied at `<body>`, so every descendant region is in scope:
- shell frame (`.app-shell`, `.shell-layer--*`, `.container`),
- tool runtime regions (`.tool-shell-page__workspace`, `.tool-shell-page__runtime`),
- docs/context rail (`.tool-shell-page__docs`, `.tool-seo`),
- page/marketing surfaces (`.home-page`, cards, section frames).

Because the class is on `body`, selector blast radius is cross-page and cross-feature by default.

### B. Runtime Binding Scope
Runtime contract nodes are present in ToolShell markup and are also formalized in the JS DOM contract.
- Markup defines immutable runtime anchors (`data-tool-shell`, `data-tool-context`, `data-tool-status`, `data-tool-followup`, `data-tool-content-host`, `data-tool-input`, `data-tool-output`).
- Runtime JS contract requires those exact anchors and selector mappings.
- Runtime CSS in `upgread_tool-execution-dna.css` styles multiple immutable anchors directly under `.upgread_workspace`, tying visual behavior to contract nodes.

Result: any broad workspace selector migration can accidentally change runtime readability/interaction on contract-bound nodes even when JS logic remains untouched.

### C. ToolShell Coupling
ToolShell couples all three planes simultaneously:
1. **Layout plane**: shell/page classes (`tool-shell-page`, `tool-shell-page--workspace`, `workspace-shell__*`).
2. **Runtime contract plane**: immutable data attributes used by validators/adapters.
3. **Theme/cascade plane**: body-level `.upgread_workspace` selectors from multiple bundles.

This creates high coupling between CSS layering and runtime ergonomics without direct JS changes.

## 3) Why 4-Way Overlap Requires Staged Refactor
The duplication matrix records a 4-way overlap for selector `upgread_workspace` owned by:
- `upgread_ui-system.css`
- `upgread_shared-primitives.css`
- `upgread_tool-execution-dna.css`
- `upgread_pages.css`

That overlap already spans primitive shell, shared docs/runtime primitives, execution runtime styling, and page composition. In live runtime order, `upgread-workspace.css` then adds a fifth late-stage override layer.

A single-shot consolidation is unsafe because:
- ownership boundaries are mixed (primitive vs execution vs page concerns),
- runtime-anchor styling lives inside overlapping scopes,
- late cascade overrides are intentional in current behavior,
- ToolShell and docs rail share the same root namespace.

Therefore refactor must be staged so each concern is isolated and validated before selector ownership moves.

## 4) Future Safe Migration Plan (Documentation-Only)

### Phase 1 — CSS Analysis (Risk: High)
- Freeze current `.upgread_workspace` usage map by bundle and selector family.
- Partition selectors into domains: **shell primitives**, **runtime contract surfaces**, **docs/page surfaces**, **theme overrides**.
- Define canonical owner per domain without moving declarations yet.

Safe cleanup candidates:
- Comment-level ownership annotations and docs alignment only.
- No selector deletion or declaration merge in this phase.

### Phase 2 — JS Graph Analysis (Risk: Medium)
- Keep runtime mounting/lifecycle/manifest flow immutable.
- Track dynamic imports and identify modules sensitive to ToolShell layout assumptions.
- Record potential unreachable modules with confidence only; no deletion.

Unsafe (dynamic) dependencies to preserve during CSS migration:
- Dynamic import paths in layout bootstrapping and tool runtime.
- Runtime adapters and contract validators relying on anchor presence.

### Phase 3 — Razor Dependency Audit (Risk: Medium)
- Resolve all `Html.PartialAsync` paths (including plugin-derived partials).
- Build dependency map for ToolShell plugin docs sections.
- Identify true orphans only after dynamic path resolution confidence is sufficient.

### Phase 4 — Runtime Safety Validation (Risk: Gate)
Required checks before any future selector ownership transfer:
- `npm run check:tool-ecosystem`
- `npm run check:ui-immunity`
- `node ./node_modules/vitest/vitest.mjs run tests/runtime`

No migration step proceeds unless all gates pass.

## Suggested Merge Order
1. Governance docs + ownership labels (no behavior changes).
2. Extract shell primitive ownership boundaries.
3. Extract runtime-anchor styling boundaries.
4. Extract docs/page styling boundaries.
5. Move late-theme overrides last.
6. Re-run runtime safety gates after each stage.

## Runtime Safety Confirmation (Current Run)
- `npm run check:tool-ecosystem` passed.
- `npm run check:ui-immunity` passed.
- `node ./node_modules/vitest/vitest.mjs run tests/runtime` passed (after installing missing optional dependency set with `npm i`).
