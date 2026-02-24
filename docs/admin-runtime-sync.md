# Admin Runtime Sync

## Source of truth

The platform uses `tools.manifest.json` as the authoring source and the DB tool registry as the operational source.

## Synchronization contract

- Startup sync is idempotent.
- Missing manifest tools are inserted.
- Existing tools are safely updated.
- Existing DB tools are never auto-deleted.

## Operational flow

```text
Manifest authoring -> startup sync -> ToolDefinitions table -> admin workspace/analytics
```

## Failure scenarios

- Partial DB outage: runtime can still run using fallback manifest loading; admin views may degrade.
- Sync failure: warning is logged and previous DB data remains available.
