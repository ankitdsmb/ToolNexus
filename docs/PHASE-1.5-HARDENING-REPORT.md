# Phase 1.5 Hardening Report

## 1) Files modified

- `src/ToolNexus.Web/Views/Tools/ToolShell.cshtml`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract.js`
- `src/ToolNexus.Web/App_Data/tool-manifests/*.json` (legacy view mappings normalized to `ToolShell`)
- `src/ToolNexus.Web/Controllers/ToolsController.cs`
- `src/ToolNexus.Application/Services/Pipeline/CachingExecutionStep.cs`

## 2) ToolShell DOM normalization confirmation

- ToolShell now renders canonical anchors as first-class DOM on initial render:
  - `data-tool-shell`
  - `data-tool-context`
  - `data-tool-input`
  - `data-tool-status`
  - `data-tool-output`
  - `data-tool-followup`
- Legacy aliases are retained only in `tool-dom-contract.js` as compatibility selectors.
- Translation-style runtime fallback behavior was hardened so unified control no longer synthesizes a replacement shell when canonical zones are missing; canonical contract is now required (`createUnifiedToolControl` returns `null` without full contract zones).

## 3) Legacy isolation summary

- Governed route execution (`/tools/{slug}`) remains pinned to `ToolShell` through `ToolsController`.
- Legacy/bespoke tool manifests were normalized to `viewName = ToolShell`, preventing governed route participation by bespoke views.
- Compatibility/deprecation isolation route added:
  - `GET /tools/legacy/{slug}` now returns `410 Gone` with explicit `deprecated_non_governed_surface` status.
- Legacy Razor files were preserved (not deleted), but routing/governed selection is isolated to ToolShell.

## 4) Pipeline order proof

- `PolicyEnforcementStep.Order = 200`
- `CachingExecutionStep.Order = 210`

This removes equal-order ambiguity and enforces deterministic ordering.

## 5) CSS governance compliance summary

- ToolShell root no longer carries `.tool-page`, reducing legacy page-layout CSS bleed from generic `.tool-page` selectors into governed ToolShell.
- Canonical shell regions are now explicit in ToolShell markup, allowing governed styling to target stable shell anchors instead of legacy layout classes.
- Legacy page CSS files remain for compatibility surfaces, while governed execution surface is normalized around ToolShell contract anchors.
