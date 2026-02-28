# Execution UI Immunity System

## Validation Rules (Execution UI Law)

1. **RULE 1 — Shell ownership:** tool CSS cannot control shell layout.
2. **RULE 2 — Widget isolation:** tool widgets must live inside `.tool-runtime-widget` only.
3. **RULE 3 — Density safety:** spacing and fixed layout values must stay inside configured token ranges.
4. **RULE 4 — Action hierarchy:** one primary action per `.tool-local-actions` toolbar.
5. **RULE 5 — Editor balance:** dual editors must keep balanced height delta.
6. **RULE 6 — No nested runtime containers:** nested `.tool-runtime-widget` is forbidden.
7. **RULE 7 — Anchor protection:** tool CSS cannot override `tool-shell-page` or `data-tool-*` anchors.
8. **RULE 8 — Docs secondary:** docs regions cannot become visually primary.
9. **RULE 9 — Runtime status visible:** `[data-tool-status]` must exist and remain visible.
10. **RULE 10 — Shell layout immunity:** tool CSS cannot redefine shell grid/layout ownership.

## Example Violation Report

```text
Tool: json-formatter
Violations: 3
Severity: high
- [RULE_1] Tool CSS controls shell layout via selector: .tool-shell-page[data-tool-shell]
- [RULE_3] Gap 28px outside allowed range (4-20px)
- [RULE_4] Expected exactly one primary action, found 2
Recommendation:
- Move shell layout declarations into shell-owned CSS only.
- Reduce gap token usage to configured range.
- Keep exactly one primary execute action in .tool-local-actions.
```

## Execution UI Score Example

- Base score: **100**
- Deductions:
  - critical violation: **-8 each**
  - high violation: **-5 each**
  - medium violation: **-2 each**
- Example score:
  - 1 critical + 2 high + 1 medium => `100 - (8 + 5 + 5 + 2) = 80`
  - **Execution UI Score: 80/100**
