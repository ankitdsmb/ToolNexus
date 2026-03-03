# CSS Ownership Map (Declaration Layer)

## Purpose
This document declares ownership boundaries for CSS bundles so duplicate selectors can be consolidated safely in future phases **without changing selectors today**.

## Ownership Domains

| Domain | Current authority | Scope | Notes |
|---|---|---|---|
| `ui-system` | Design system | Tokens + layout primitives | Canonical source for reusable spacing, typography, color, and structural primitives. |
| `execution-dna` | Runtime UX | Runtime execution layer | Execution-specific shell behaviors and runtime visual DNA. |
| `pages` | Marketing UX | Marketing surfaces | Public-facing page styling and content presentation. |
| `workspace` | Migration bridge | Override layer (temporary authority) | Temporary override surface during consolidation; should be reduced after layered migration is complete. |

## Future `@layer` Structure Proposal (Documentation Only)

> Do **not** implement yet. This is a target structure for staged migration.

```css
@layer tokens;
@layer base;
@layer runtime;
@layer overrides;
```

### Intended mapping
- `tokens` → foundational design tokens (from `ui-system`).
- `base` → layout primitives and shared baseline styles (primarily `ui-system`, plus safe shared rules).
- `runtime` → execution/runtime-specific styles (`execution-dna`).
- `overrides` → temporary/high-authority migration overrides (`workspace`, limited `pages` exceptions if required).

## Consolidation Guardrails
- Preserve all existing selectors during declaration phase.
- Keep runtime anchors and execution flow contracts unchanged.
- Reclassify duplicate utility ownership before any selector-level merge.
- Remove temporary `workspace` authority only after parity validation.
