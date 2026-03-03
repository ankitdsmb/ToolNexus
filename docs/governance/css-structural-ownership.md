# CSS Structural Ownership

## Canonical owner file

The canonical owner for structural shell primitives is:

- `src/ToolNexus.Web/wwwroot/css/upgread_shared-primitives.css`

Canonical structural selectors:

- `.app-shell`
- `.container`
- `.shell-layer--workspace`

## Override file

UI-level structural adjustments are layered in:

- `src/ToolNexus.Web/wwwroot/css/upgread_ui-system.css`

This file is treated as an override layer for structural shell behavior that must remain compatible with shared primitives.

## Load order relationship

`upgread_shared-primitives.css` should load before `upgread_ui-system.css` so that:

1. shared-primitives establishes baseline structural ownership; and
2. ui-system applies intentional downstream overrides.

This preserves predictable cascade behavior and avoids ownership ambiguity.

## Why deletion is unsafe currently

Deletion of structural selectors is unsafe at this stage because:

- these selectors are cross-cutting primitives used by multiple layouts and runtime views;
- override behavior currently depends on existing selector presence and cascade relationships;
- removing selectors without full runtime dependency and usage validation can create regressions that are difficult to detect statically.

Until dependency mapping and runtime safety validation are complete, ownership should be clarified via documentation/comments only.
