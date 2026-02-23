# Run Order 2 — Execution Incident Console (MVP)

## Scope
Visibility-only admin console for execution health and incidents. No runtime behavior, governance logic, or worker execution flow was modified.

## Data flow notes discovered
- Worker identity is only persisted through `audit_outbox.lease_owner` rows while jobs are in progress.
- "Last heartbeat" cannot be read from a dedicated heartbeat table; this console derives it from `lease_expires_at_utc` on active leases.
- Backlog trend is inferred from pending/retry/in-progress items created in the last 10 minutes vs the previous 10 minutes.

## API contract
- `GET /admin/execution/health`
- `GET /admin/execution/workers`
- `GET /admin/execution/incidents?page=1&pageSize=20`

All endpoints are read-only and return summarized metadata without payload bodies.

## UI behavior
- Admin page route: `Admin → Execution Monitoring` (`/admin/execution-monitoring`).
- Warning badges shown when dead letters exist, backlog is increasing, or workers are stale.
- Incident list defaults to latest first with server-side paging.
