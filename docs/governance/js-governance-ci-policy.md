# JS Governance CI Policy

## Purpose

This policy adds **drift detection governance** for JavaScript static-graph dead-module analysis.

- Governance scope only (no deletion automation).
- Runtime behavior is untouched.
- CI fails only when **high-confidence dead modules** increase versus baseline.

## Baseline Snapshot

The canonical baseline file is:

- `artifacts/js-governance-baseline.json`

Tracked values:

- `highConfidenceDeadCount`
- `mediumRiskDeadCount`
- `moduleCount`

## CI Enforcement Rule

CI runs:

1. `node scripts/integrity/static-graph-validator.mjs`
2. `node scripts/integrity/js-governance-drift.mjs`

Policy behavior:

- **Fail build** if `current.highConfidenceDeadCount > baseline.highConfidenceDeadCount`.
- **Warn only** if `mediumRiskDeadCount` grows.
- Pass when high-confidence dead count is stable or reduced.

## Artifacts

CI publishes governance artifacts for traceability:

- `artifacts/js-governance-baseline.json`
- `artifacts/dynamic-import-governance-report.json`
- `reports/integrity/static-graph.json`

## Notes

- This policy is intentionally non-destructive.
- No auto-removal, auto-pruning, or cleanup action is triggered by this gate.
