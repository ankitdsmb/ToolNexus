# upgread_workspace Runtime Safety Validation

## Scope
Validation requested for selector split safety with **no JS/CSS changes**. This report covers:

- `.querySelector('.upgread_workspace')`
- `.classList.contains('upgread_workspace')`
- MutationObserver dependencies
- style-dependent runtime logic

---

## PHASE 1 — CSS Analysis

### Risk Level
**Medium (cleanup risk), Low (runtime regression risk).**

### Selector usage map (upgread_workspace anchor)
- Runtime activation class is present in layout only: `<body class="page-enter upgread_workspace" ...>`. 
- Selector appears extensively in CSS bundles through `:is(.upgread_workspace, .upgread_workspace--scoped)` scoping.

### Duplicated utility selectors across upgread bundles
Cross-bundle duplicate selectors detected (same selector appears in multiple bundles):

- `:is(.upgread_workspace, .upgread_workspace--scoped)`
  - `upgread_ui-system.css`, `upgread-workspace.css`
- `:is(.upgread_workspace, .upgread_workspace--scoped) .app-shell`
  - `upgread_ui-system.css`, `upgread-workspace.css`
- `:is(.upgread_workspace, .upgread_workspace--scoped) .container`
  - `upgread_ui-system.css`, `upgread-workspace.css`
- `:is(.upgread_workspace, .upgread_workspace--scoped) .home-page`
  - `upgread_pages.css`, `upgread-workspace.css`
- `:is(.upgread_workspace, .upgread_workspace--scoped) .section-frame`
  - `upgread_shared-primitives.css`, `upgread-workspace.css`
- `:is(.upgread_workspace, .upgread_workspace--scoped) .tool-local-actions`
  - `upgread_tool-execution-dna.css`, `upgread-workspace.css`
- `:is(.upgread_workspace, .upgread_workspace--scoped) .tool-runtime-widget`
  - `upgread_tool-execution-dna.css`, `upgread-workspace.css`
- `:is(.upgread_workspace, .upgread_workspace--scoped) .tool-shell-page__docs`
  - `upgread_tool-execution-dna.css`, `upgread-workspace.css`
- `[data-theme="light"] :is(.upgread_workspace, .upgread_workspace--scoped) .tool-shell-page__docs`
  - `upgread_tool-execution-dna.css`, `upgread-workspace.css`

### Consolidation recommendation (no removals yet)
1. Keep a single canonical scope prelude in `upgread_shared-primitives.css`.
2. Move shared layout primitives (`.app-shell`, `.container`, `.section-frame`) into shared-primitives.
3. Keep execution-specific rules in `upgread_tool-execution-dna.css` and page-specific rules in `upgread_pages.css`.
4. Reduce `upgread-workspace.css` to workspace-only differentiators.

---

## PHASE 2 — JS Graph Analysis

### Risk Level
**Low for direct runtime dependency on `.upgread_workspace`; Medium for module reachability certainty due dynamic loading surfaces.**

### Explicit selector checks
- `querySelector('.upgread_workspace')`: **No matches in JS runtime**.
- `classList.contains('upgread_workspace')`: **No matches in JS runtime**.

### Import graph snapshot
- Runtime JS files scanned: **49** (`wwwroot/js/runtime`).
- Static import edges: **32**.
- Dynamic import edges in runtime:
  - `import('node:fs/promises')` (Node-only telemetry artifact path)
  - `import(modulePath)` (runtime import integrity wrapper)

### Potentially unreachable runtime modules (confidence-scored, no deletion)
These were not reachable from direct Razor `<script src="~/js/...">` entrypoints in static analysis, but are referenced by other runtime/tool modules and tests.

- `runtime/monaco-loader.js` — **Low confidence unreachable (20%)**
- `runtime/runtime-safe-tool-wrapper.js` — **Low confidence unreachable (20%)**
- `runtime/tool-intelligence-engine.js` — **Low confidence unreachable (20%)**
- `runtime/tool-page-result-normalizer.js` — **Low confidence unreachable (20%)**

Interpretation: treat as **unsafe to delete** because they are imported by `tool-page.js`, tool app modules, and tests.

---

## PHASE 3 — Razor Dependency Audit

### Risk Level
**Low.**

### Html.PartialAsync loading paths
- Static partial usage: `_ToolCard` from tool index/category views.
- Dynamic plugin path usage: `ToolContextPlugins.ToPartialPath(plugin)` in `ToolShell.cshtml`.

### Plugin partial dependency map
Declared plugin set (`ToolContextPlugins.All`):
- Overview, Features, QuickStart, Guidance, Examples, UseCases, Faq, RelatedTools.

Resolved partial path pattern:
- `~/Views/Tools/Plugins/_{plugin}Plugin.cshtml`

Actual plugin files present:
- `_OverviewPlugin.cshtml`
- `_FeaturesPlugin.cshtml`
- `_QuickStartPlugin.cshtml`
- `_GuidancePlugin.cshtml`
- `_ExamplesPlugin.cshtml`
- `_UseCasesPlugin.cshtml`
- `_FaqPlugin.cshtml`
- `_RelatedToolsPlugin.cshtml`

### True orphan partials
- **None detected** for tool plugins (declared and actual sets align).

---

## PHASE 4 — Runtime Safety Validation

### Risk Level
**Low for selector removal safety; Medium for environment test completeness (one runtime test command blocked by missing optional dependency).**

### Required checks
- `npm run check:tool-ecosystem` ✅ pass
- `npm run check:ui-immunity` ✅ pass
- `node ./node_modules/vitest/vitest.mjs run tests/runtime` ⚠️ blocked by missing optional dependency `@rollup/rollup-linux-x64-gnu`

---

## Classification Matrix (requested)

### No runtime dependency
- JS runtime has **no direct selector dependency** on `.upgread_workspace` for querying or class checks.

### Cosmetic only
- `.upgread_workspace` currently acts primarily as a CSS scope switch in bundled style layers.
- Visual/layout density and polish change with scope class, but core runtime anchors are data-attribute based.

### Behavioral coupling
- MutationObserver usage is tied to runtime lifecycle/status attributes (`data-execution-state`) and runtime DOM updates, not `.upgread_workspace`.
- Style-dependent runtime logic exists (density validators, layout measurements, shell feel interactions) and may alter UX behavior quality, but is **not keyed to `.upgread_workspace` class lookup in JS**.

---

## Safe Cleanup Candidates
- Remove duplicate `:is(.upgread_workspace, .upgread_workspace--scoped)` selector blocks after extracting shared primitives.
- Normalize duplicate scope wrappers across `upgread_*` bundles.

## Unsafe (dynamic) Dependencies
- `import(modulePath)` in runtime import integrity flow.
- Plugin partial runtime resolution through `ToolContextPlugins.ToPartialPath(plugin)`.

## Suggested Merge Order
1. **CSS consolidation prep** (dedupe into shared-primitives, no behavioral edits).
2. **Selector alias period** (`.upgread_workspace` + replacement selector in parallel).
3. **Runtime verification pass** (ecosystem + UI immunity + runtime vitest in fully provisioned env).
4. **Remove legacy selector alias** once runtime tests are green.

## Runtime Safety Confirmation
**Confirmed safe for next-phase JS/runtime removal activities:**
- Removing `.upgread_workspace` **from JS assumptions** is safe because no JS assumption exists.

**Conditionally safe for CSS selector removal:**
- Only after a CSS alias/consolidation phase, because style scoping currently depends on `.upgread_workspace` in multiple bundles.

