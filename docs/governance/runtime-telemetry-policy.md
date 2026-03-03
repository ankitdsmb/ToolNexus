# Runtime Telemetry Governance Policy

## Purpose

This policy defines how ToolNexus enforces runtime telemetry governance without auto-deletion. The policy uses a warning-first posture for ambiguous risk and fails only on clear high-risk regressions.

## Metrics

The policy reads `reports/integrity/static-graph.json` and derives two telemetry governance metrics:

- `staticUnreachableAndUnused`: modules classified as `high-confidence-dead`.
- `staticUnreachableButUsed`: modules classified as `protected-dynamic` or `medium-risk`.

## Baseline

Baseline values are read from:

1. `artifacts/runtime-telemetry-baseline.json` (primary)
2. `artifacts/js-governance-baseline.json` (legacy fallback)

Baseline keys:

- `staticUnreachableAndUnusedThreshold`: hard CI threshold.
- `staticUnreachableButUsedBaseline`: warning baseline.

## Enforcement

Run:

```bash
npm run integrity:runtime-telemetry
```

Enforcement behavior:

1. **CI FAIL** if `staticUnreachableAndUnused` exceeds `staticUnreachableAndUnusedThreshold`.
2. **WARN ONLY** if `staticUnreachableButUsed` increases above `staticUnreachableButUsedBaseline`.
3. **No auto-deletion** is performed by this policy.

## CI Integration

`npm run integrity:ci` invokes runtime telemetry governance as a required check (`scripts/integrity/ci-enforce.mjs`).

## Operational Guidance

- Update baselines only after explicit review of static graph output and runtime behavior.
- Treat warning increases as triage items; do not remove dynamic modules without runtime proof.
- Preserve runtime anchors and execution flow while investigating telemetry drift.
