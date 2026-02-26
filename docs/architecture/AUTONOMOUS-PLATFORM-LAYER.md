# Autonomous Platform Layer (Governance-First)

This layer is assistive intelligence only and never bypasses ToolNexus execution governance.

## Data Ledgers (PostgreSQL append-only)

- `platform_signals`: stores persisted runtime and governance signals with correlation + authority context.
- `platform_insights`: stores generated recommendations and explainable risk/confidence scoring.
- `operator_approved_actions`: stores explicit operator approvals/rejections for insight decisions.

## Operator Command Center integration

The Admin Command Center now exposes an **AUTONOMOUS INSIGHTS** panel that:

- Marks recommendations as AI-generated.
- Shows risk and confidence values.
- Requires explicit operator `Approve` or `Reject` action.
- Calls controlled API endpoints to record decisions.

## Safety guarantees

- No silent execution.
- No direct governance mutation.
- No background policy overrides.
- Decisions are auditable and include operator + authority context.
- Existing execution lifecycle remains unchanged:
  `Request -> Authority -> Snapshot -> Execution -> Conformance -> Telemetry`.

## Telemetry

Decision endpoints emit audit-friendly telemetry logs:

- `autonomy.insight.approved`
- `autonomy.insight.rejected`

with `operator`, `authority context`, and `correlation id`.
