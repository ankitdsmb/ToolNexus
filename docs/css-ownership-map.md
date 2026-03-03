# CSS Ownership Map (upgread layers)

## Scope
Governance-only ownership contract for the `upgread_*` CSS bundles. This map does **not** change selectors, declarations, or stylesheet load order.

## Bundle ownership domains

| Bundle | Ownership domain | Primary responsibility |
|---|---|---|
| `upgread_pages.css` | Page-level presentation | Marketing/content page styling and non-runtime page surfaces. |
| `upgread_shared-primitives.css` | Shell primitives + shared runtime baseline | Canonical primitives for app shell scaffolding and shared tool-shell baseline styles. |
| `upgread_tool-execution-dna.css` | Tool runtime UI | Execution-mode behavior, runtime interaction surfaces, and tool execution visual DNA. |
| `upgread_ui-system.css` | Structural layout system | Workspace structural layout composition and layout-system level UI scaffolding. |

## Explicit ownership declarations

- **Structural layout owner:** `upgread_ui-system.css`
- **Tool runtime UI owner:** `upgread_tool-execution-dna.css`
- **Shell primitives owner:** `upgread_shared-primitives.css`

## Governance rules

1. Ownership indicates canonical authority for selector intent in each domain.
2. Cross-bundle selector presence is allowed only when clearly marked as an explicit override layer.
3. `upgread_pages.css` must remain page-surface scoped and must not become canonical owner for shell/runtime primitives.
4. This map is documentation/governance only and introduces no runtime behavior changes.
