# CSS Ownership Map (Governance-Only)

## Purpose
This document formalizes CSS ownership domains for the `upgread_*` bundle family.
It is a governance artifact only and does **not** change runtime behavior, declarations, selector sets, or stylesheet order.

## Layer Model

### Structural layer
**Owner bundles:**
- `upgread_ui-system.css`
- `upgread-workspace.css`

**Responsibility:**
- Global layout scaffolding
- Application shell structure
- Workspace composition frames and layout slots

### Primitive layer
**Owner bundle:**
- `upgread_shared-primitives.css`

**Responsibility:**
- Reusable low-level building blocks
- Shared shell primitives and foundational composable utilities

### Execution layer
**Owner bundle:**
- `upgread_tool-execution-dna.css`

**Responsibility:**
- Runtime/tool execution visuals
- Execution-specific state surfaces and interaction wrappers

### UI system layer
**Owner bundle:**
- `upgread_pages.css`

**Responsibility:**
- Page-level systemized UI surfaces
- Non-runtime page presentation and content-section styling

## Bundle Ownership Registry

| Bundle | Layer | Canonical ownership domain |
|---|---|---|
| `upgread_pages.css` | UI system layer | Page-scoped UI sections and content-facing visual system surfaces. |
| `upgread_shared-primitives.css` | Primitive layer | Shared primitives, shell-level base structures, and reusable foundations. |
| `upgread_tool-execution-dna.css` | Execution layer | Tool runtime execution panels, runtime state surfaces, and execution DNA. |
| `upgread_ui-system.css` | Structural layer | Global app-shell and high-level structural layout primitives. |
| `upgread-workspace.css` | Structural layer | Workspace-region structural composition and workspace-specific containers. |

## Governance Rules
1. Each selector should have one canonical owner bundle.
2. Reuse in a non-owner bundle requires explicit override annotation (`OVERRIDE LAYER` or `OWNERSHIP_OVERRIDE`) when ownership checks apply.
3. This document and its JSON companion (`artifacts/css-layer-map.json`) are the source of truth for ownership governance.
