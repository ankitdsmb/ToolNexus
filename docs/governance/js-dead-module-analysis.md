# JavaScript Dead Module Analysis

Generated: 2026-03-03T17:15:23.132Z

## Counts by Confidence Bucket

- High (>= 0.70): 7
- Medium (0.40 - 0.69): 0
- Low (< 0.40): 228
- Total candidates: 235

## Classification Explanation

- **Reachable modules** are discovered from Razor script entry points and traversed through static and literal dynamic imports.
- **High confidence candidates** are modules not reachable from known entry points and not covered by protected dynamic-root patterns.
- **Low confidence candidates** are modules matched to dynamic runtime root types (for example slug-based tool loading), so they are treated as governance-protected and should not be assumed dead.
- **Import references** in the JSON artifact show reverse static/literal references; an empty list indicates no static/literal importer was found.

## Governance Warning

> This report is advisory only. **No module deletion is automatic** from this analysis. Any cleanup must go through explicit review and runtime safety validation before changes are made.
