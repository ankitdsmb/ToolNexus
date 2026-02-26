# ToolNexus Intelligence Graph Architecture

## Purpose

The ToolNexus Intelligence Graph is a unified, append-first intelligence layer that models platform behavior as:

- **Nodes**: tools, capabilities, executions, governance decisions, quality evaluations, AI drafts, and tenants.
- **Edges**: time-versioned relationships between those nodes.

This enables system-level reasoning for optimization, governance forecasting, and capability evolution while preserving the canonical execution contract.

## Non-negotiable constraints

- Graph is advisory and observational only.
- Execution lifecycle remains unchanged: request → authority resolution → snapshot → execution → conformance → telemetry.
- Governance stays the final decision authority.
- PostgreSQL remains source of truth (no external graph database in this phase).

## Phase 1 scope (implemented)

### Schema foundations

Phase 1 introduces three Postgres-backed relational tables:

1. `intelligence_nodes`
2. `intelligence_edges`
3. `intelligence_snapshots`

These are represented by EF entities and migrations in Infrastructure.

### Node model

`intelligence_nodes` captures entity identity and current state:

- `NodeId` (UUID)
- `NodeType` (TOOL, CAPABILITY, EXECUTION, GOVERNANCE, QUALITY, AI_DRAFT, TENANT)
- `ExternalRef` (domain identity pointer, such as tool slug or execution id)
- `LifecycleVersion`
- `TenantId`
- `CorrelationId`
- `PropertiesJson` and `ContextTagsJson` (`jsonb`)
- timestamps (`ObservedAtUtc`, `CreatedAtUtc`, optional `RetiredAtUtc`)

### Edge model

`intelligence_edges` captures graph relationships with lifecycle metadata:

- `EdgeId` (UUID)
- `SourceNodeId` / `TargetNodeId` (FK to nodes)
- `RelationshipType` (USES, GENERATES, DEPENDS_ON, APPROVED_BY, FAILED_WITH, OPTIMIZED_BY_AI, REPLACED_BY, DERIVED_FROM)
- `LifecycleVersion`
- `ConfidenceScore`
- `TenantId`
- `CorrelationId`
- `MetadataJson`, `ContextTagsJson` (`jsonb`)
- timestamps (`EffectiveAtUtc`, `RecordedAtUtc`, optional `SupersededAtUtc`)

### Snapshot model

`intelligence_snapshots` provides materialized graph cut records:

- `SnapshotId` (UUID)
- `SnapshotType`
- `LifecycleVersion`
- `TenantId`
- `CorrelationId`
- `SnapshotAtUtc`
- `NodeCountByTypeJson`, `EdgeCountByTypeJson` (`jsonb`)
- `IntegrityStatus`, `Notes`
- `CreatedAtUtc`

### Indexing and correlation guarantees

Each table includes indexes for:

- correlation id
- tenant id
- primary event timestamp

This preserves cross-domain traceability and operational queryability requirements.

## Future phase mapping

- **Phase 2**: Graph builder pipeline from telemetry/governance/quality/AI/admin events into append-first upserts.
- **Phase 3**: Admin intelligence command center (node explorer, capability map, runtime efficiency, governance heat map, AI evolution tracker).
- **Phase 4**: Recommendation engine (failure clustering, runtime optimization, duplicate merge suggestions).
- **Phase 5**: AI generation integration and feedback learning loops.

Each phase must close with correctness, lifecycle, safety, and snapshot consistency tests before progressing.
