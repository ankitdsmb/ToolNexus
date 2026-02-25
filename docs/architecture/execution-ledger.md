# Execution Ledger Architecture

The execution ledger is persisted in PostgreSQL and stores immutable execution history for admin diagnostics.

## Persisted aggregates

- `execution_runs` (root): execution metadata, authority, trace/correlation/tenant linkage.
- `execution_snapshots`: serialized runtime snapshot metadata and policy snapshot JSON.
- `execution_conformance_results`: validator outcome, normalized status, and serialized issues.
- `execution_authority_decisions`: admission decision and authority decision source.

All tables use UUID primary keys and are linked 1:1 by `execution_run_id`.

## Query patterns

The read model is optimized for admin dashboards:

- filterable by `correlation_id`, `tenant_id`, and `tool_id`
- sorted by execution timestamp (`executed_at_utc` DESC)
- detail endpoint joins snapshot + conformance + authority decision in one query

## API contracts

- `GET /api/admin/executions`
- `GET /api/admin/executions/{id}`
- `GET /api/admin/executions/{id}/snapshot`

## Telemetry linkage

Telemetry processing now writes `trace_id` into execution run records so OpenTelemetry traces can be correlated with a persistent execution ledger entry.
