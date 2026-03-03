# CSS Ownership Map (upgread primitives)

## Runtime cascade order (authoritative load sequence)
1. `~/css/site.css`
2. `~/css/product-transform.css`
3. `~/css/upgread_ui-system.css`
4. `~/css/upgread_shared-primitives.css`
5. `~/css/upgread_tool-execution-dna.css`
6. `~/css/upgread_pages.css`
7. `~/css/upgread-workspace.css`

Source: stylesheet links in shared layout.

---

## Shell primitives

### `.container`
- **Canonical owner**: `src/ToolNexus.Web/wwwroot/css/upgread_ui-system.css` (`.upgread_workspace main.container, .upgread_workspace .container`).
- **Override layers**:
  - `src/ToolNexus.Web/wwwroot/css/upgread_shared-primitives.css` (focus-mode scoped reset via `.tool-focus-mode main.container, .tool-focus-mode .container`).
  - `src/ToolNexus.Web/wwwroot/css/upgread_ui-system.css` media-query variants for the same scoped selectors.
- **Cascade order**:
  - Base global styles can exist in `site.css`.
  - Workspace canonical layer in `upgread_ui-system.css`.
  - Focus-mode override in `upgread_shared-primitives.css`.
  - Workspace theme overrides in `upgread-workspace.css`.

### `.app-shell`
- **Canonical owner**: `src/ToolNexus.Web/wwwroot/css/upgread_ui-system.css` (`.upgread_workspace .app-shell`).
- **Override layers**:
  - `src/ToolNexus.Web/wwwroot/css/upgread_shared-primitives.css` (focus-mode scoped `.tool-focus-mode .app-shell`).
  - `src/ToolNexus.Web/wwwroot/css/upgread-workspace.css` (workspace surface override for `.upgread_workspace .app-shell`).
- **Cascade order**:
  - Base global style in `site.css`.
  - Workspace canonical layer in `upgread_ui-system.css`.
  - Focus-mode override in `upgread_shared-primitives.css`.
  - Workspace theme overrides in `upgread-workspace.css`.

### `.shell-layer--workspace`
- **Canonical owner**: `src/ToolNexus.Web/wwwroot/css/upgread_ui-system.css` (`.upgread_workspace .shell-layer--workspace`).
- **Override layers**:
  - `src/ToolNexus.Web/wwwroot/css/upgread_shared-primitives.css` (focus-mode scoped `.tool-focus-mode .shell-layer--workspace`).
  - No additional direct override in later upgread bundles beyond focus-mode scope.
- **Cascade order**:
  - Base global style in `site.css`.
  - Workspace canonical layer in `upgread_ui-system.css`.
  - Focus-mode override in `upgread_shared-primitives.css`.

---

## Tool doc/runtime primitives

### `.tool-shell-page__workspace`
- **Canonical owner**: `src/ToolNexus.Web/wwwroot/css/upgread_shared-primitives.css` (full-width normalization group including `.tool-shell-page__workspace`).
- **Override layers**:
  - `src/ToolNexus.Web/wwwroot/css/upgread_tool-execution-dna.css` (execution layout constraints and focus-mode behavior).
- **Cascade order**:
  - Base/global styling in `site.css`.
  - Full-width canonical normalization in `upgread_shared-primitives.css`.
  - Execution-mode override in `upgread_tool-execution-dna.css`.

### `.tool-shell-page__docs`
- **Canonical owner**: `src/ToolNexus.Web/wwwroot/css/upgread_shared-primitives.css` (full-width normalization group including `.tool-shell-page__docs`).
- **Override layers**:
  - `src/ToolNexus.Web/wwwroot/css/product-transform.css` (docs panel tuning).
  - `src/ToolNexus.Web/wwwroot/css/upgread_tool-execution-dna.css` (execution docs rail sizing, chrome, light-theme, fullscreen/focus-mode behavior, responsive adjustments).
  - `src/ToolNexus.Web/wwwroot/css/upgread-workspace.css` (workspace surface/border/padding overrides plus responsive/light-theme variants).
- **Cascade order**:
  - Base/global styling in `site.css`.
  - Early docs override in `product-transform.css`.
  - Full-width canonical normalization in `upgread_shared-primitives.css`.
  - Execution-mode overrides in `upgread_tool-execution-dna.css`.
  - Final workspace-theme overrides in `upgread-workspace.css`.

### `.tool-seo`
- **Canonical owner**: `src/ToolNexus.Web/wwwroot/css/upgread_shared-primitives.css` (full-width normalization group including `.tool-seo`).
- **Override layers**:
  - `src/ToolNexus.Web/wwwroot/css/upgread_tool-execution-dna.css` (docs/SEO rail chrome and focus-mode visibility behavior).
- **Cascade order**:
  - Base/global styling in `site.css`.
  - Full-width canonical normalization in `upgread_shared-primitives.css`.
  - Execution-mode overrides in `upgread_tool-execution-dna.css`.

### `.tool-md-section`
- **Canonical owner**: `src/ToolNexus.Web/wwwroot/css/upgread_shared-primitives.css` (full-width docs content normalization group).
- **Override layers**:
  - `src/ToolNexus.Web/wwwroot/css/upgread_tool-execution-dna.css` (execution docs card look + light theme).
- **Cascade order**:
  - Canonical width normalization in `upgread_shared-primitives.css`.
  - Execution-mode visual override in `upgread_tool-execution-dna.css`.

### `.tool-focus-mode`
- **Canonical owner**: `src/ToolNexus.Web/wwwroot/css/upgread_shared-primitives.css` (focus-mode background and light-theme variants).
- **Override layers**:
  - `src/ToolNexus.Web/wwwroot/css/upgread_tool-execution-dna.css` (focus-mode layout/display behavior for workspace, docs, runtime, and immutable runtime anchor regions).
- **Cascade order**:
  - Canonical focus shell in `upgread_shared-primitives.css`.
  - Execution-specific focus behavior in `upgread_tool-execution-dna.css`.

---

## Notes
- This map is **non-destructive governance only**: no selectors removed, no declaration merges, and no runtime-anchor edits.
- Comment annotations were added in canonical and override files using `/* CANONICAL OWNER */` and `/* OVERRIDE LAYER */` markers.
