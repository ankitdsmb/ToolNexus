# Run Order 5 — Dashboard Operationalization

## Dashboard data flow

The Admin Dashboard now composes a read-only operator overview using existing platform telemetry sources.

1. `GET /admin/execution/health`
   - Source: execution monitoring repository summary over `audit_outbox` + open `audit_dead_letter`.
   - Used by cards: queue backlog, pending retries, dead-letter count, stale job indicator.
2. `GET /admin/execution/workers`
   - Source: execution monitoring worker lease snapshots from `audit_outbox` in-progress leases.
   - Used by cards: worker health severity and offline/stale detection.
3. `GET /admin/execution/incidents?page={n}&pageSize={m}`
   - Source: server-paged incident summary DTOs from retries, failures, and dead-letter events.
   - Used by: recent incidents feed and latest incident count card.
4. `GET /health/background`
   - Source: background worker health state + audit guardrail metrics + concurrency observability snapshots.
   - Used by cards: audit write health, concurrency conflicts (24h), operator attention panel signals.

## Metric ownership

| Dashboard card/widget | Source owner | Metric meaning |
|---|---|---|
| Execution Queue Backlog | Execution monitoring (`audit_outbox`) | Current queue pressure across pending/retry/in-progress workloads. |
| Worker Health | Execution monitoring + background worker state | Whether workers are running and lease heartbeats are fresh. |
| Dead-letter Count | Audit guardrails + execution monitoring | Count of open dead letters requiring operator action. |
| Audit Write Health | Audit guardrails metrics | Overall reliability signal for audit write pipeline health. |
| Concurrency Conflicts (24h) | Concurrency observability | Total optimistic concurrency conflicts in rolling 24h. |
| Pending Retries | Execution monitoring | Number of retry-scheduled queue entries waiting to reattempt. |
| Stale Jobs | Execution monitoring | Presence of aged pending entries that indicate delivery stalls. |
| Latest Incidents | Execution monitoring incidents | Paged incident stream size used for operator triage context. |
| Recent Incidents Feed | Execution monitoring + concurrency trend snapshots | Ordered view of retries, failures, dead letters, and concurrency conflict activity. |
| Operator Attention Panel | Aggregated from all above | High-visibility triage block for blocked queue, worker issues, and dead-letter growth. |

## Operator meaning by card

- **Execution Queue Backlog**: rising values indicate delivery congestion and potential downstream data freshness risks.
- **Worker Health**: stale/offline values indicate the delivery loop may be partially stopped.
- **Dead-letter Count**: any non-zero value means operator-owned failures are unresolved.
- **Audit Write Health**: reflects whether writes are flowing cleanly or under retry/dead-letter stress.
- **Concurrency Conflicts (24h)**: high values indicate admin write contention and possible coordination drift.
- **Pending Retries**: high values indicate temporary downstream instability or throttling.
- **Stale Jobs**: indicates backlog age threshold exceeded and potential blocked queue.
- **Latest Incidents**: quick volume check for current incident intensity.

## Performance considerations

- Server-side paging is retained for incidents (`page`, `pageSize`) and no full incident history is loaded on dashboard.
- Dashboard feed uses summary DTOs only (event type, severity, destination, timestamp, compact summary, attempts).
- Health and worker endpoints are lightweight aggregate lookups and avoid full payload materialization.
- No execution path mutation; dashboard remains read-only and telemetry-driven.
