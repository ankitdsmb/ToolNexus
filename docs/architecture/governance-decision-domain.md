# Governance Decision Domain

## Overview

The Governance Decision domain introduces an immutable server-generated decision record for every execution attempt.

A governance decision is persisted in PostgreSQL and linked to execution snapshots through `GovernanceDecisionId`.

## Domain Model

`GovernanceDecision` fields:

- `decisionId` (UUID, primary key)
- `toolId`
- `capabilityId`
- `authority`
- `approvedBy`
- `decisionReason`
- `policyVersion`
- `timestamp`
- `status` (`Approved`, `Denied`, `Override`)

## Invariants

1. Decisions are generated on the server only.
2. Clients do not have decision creation endpoints.
3. Every execution snapshot must reference a non-empty `GovernanceDecisionId`.
4. Execution telemetry throws if governance reference is missing.
5. Persistence layer rejects execution events without governance reference.

## Persistence

- Table: `governance_decisions`
- Relationship: `execution_snapshots.governance_decision_id -> governance_decisions.decision_id`
- Delete behavior: `Restrict` to preserve immutable historical linkage.

## API

Read-only admin endpoints:

- `GET /api/admin/governance/decisions`
- `GET /api/admin/governance/decisions/{id}`

Supports filters for tool, policy version, and date range.

## Admin UI

Admin page: `/admin/governance/decisions`

Includes:

- Tool filter
- Policy version filter
- Date range filter
- History table of immutable decisions

## No Bypass Guarantee

No execution path is allowed to proceed without governance decision reference materialized in runtime context and telemetry payload.
