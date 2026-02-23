# Run Order 7 — Change History Hardening

## Change History usage guide

The admin Change History screen now uses server-side querying over `audit_events` with enforced paging and operator filters.

1. Open **Admin → Change History**.
2. Use the filter bar to narrow by action, entity, actor, severity, UTC date range, or correlation id.
3. Use quick chips for frequent investigations (critical events, warnings, tool updates, policy updates).
4. Use **Load more** for incremental/lazy history retrieval.
5. Expand payload only when needed; list rows never hydrate full payload bodies.

## Filtering strategy

Filtering is applied in the database query with indexes from Run Order 1 (`occurred_at_utc`, actor composite, action composite, trace id).

Supported filters:

- action type (`action`)
- entity type (`target_type`)
- actor/user (`actor_id`)
- date range (`occurred_at_utc` from/to)
- severity (`result_status` mapped to info/warning/critical)
- correlation id (`trace_id` or `request_id`)
- free text search (action/entity/actor/correlation fields)

Design choices:

- paging is mandatory with bounded page size (10-100)
- list query intentionally excludes full `payload_redacted`
- payload details are loaded only through explicit row expansion API

## Investigation workflow

Recommended operator sequence:

1. Start with severity chip (**critical** then **warning**) for triage.
2. Narrow by date range and action/entity to isolate the incident window.
3. Pivot via correlation id links to view related request/operation groupings.
4. Expand only relevant payload rows and inspect redaction/truncation metadata:
   - `_redaction_meta`
   - `_truncation_meta`
5. Record hash + correlation id and continue incident workflow in execution monitoring/dead-letter console.

## Non-goals / safety constraints

- No changes to audit write path, payload processor, or outbox flow.
- Read-only change history query and rendering improvements only.
