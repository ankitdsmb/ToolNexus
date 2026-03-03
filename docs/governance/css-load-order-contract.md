# CSS Load Order Contract

## Current Load Order

The `upgread_*` stylesheet sequence in `Views/Shared/_Layout.cshtml` is contractually fixed:

1. `upgread_ui-system.css`
2. `upgread_shared-primitives.css`
3. `upgread_tool-execution-dna.css`
4. `upgread_pages.css`
5. `upgread-workspace.css`

## Why This Order Matters

This order encodes an intentional cascade model:

- **`upgread_ui-system.css`** establishes shared foundational tokens, defaults, and top-level UI behavior.
- **`upgread_shared-primitives.css`** layers reusable primitives on top of system-level definitions.
- **`upgread_tool-execution-dna.css`** applies runtime execution-shell semantics that depend on upstream primitives.
- **`upgread_pages.css`** composes page-level patterns with awareness of previously defined DNA constraints.
- **`upgread-workspace.css`** applies workspace-specific final overrides expected to win later in cascade order.

Because CSS resolution is order-sensitive, the sequence is part of runtime behavior, not a formatting preference.

## Risks of Reordering

Reordering these files can introduce non-obvious regressions, including:

- **Specificity inversion:** later files unintentionally overriding assumptions made by downstream layers.
- **Token shadowing:** custom properties and fallback chains resolving to different values.
- **State styling drift:** interaction, focus, status, and shell-state selectors presenting inconsistent visuals.
- **Layout instability:** page and workspace layout contracts collapsing due to precedence changes.
- **Cross-tool variance:** tool pages rendering differently based on which selectors now win.

## Governance Requirement

Do **not** reorder the `upgread_*` CSS references without governance review and explicit regression validation.
