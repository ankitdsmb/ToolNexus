# Runtime Architecture

## Data flow diagram

```text
tools.manifest.json
  -> JsonFileToolManifestRepository
  -> ToolManifestSynchronizationHostedService (startup)
  -> ToolDefinitions (database)
  -> Admin APIs and admin UI

Runtime JS
  -> POST /api/admin/runtime/incidents
  -> RuntimeIncidentService
  -> RuntimeIncidents (database)
  -> Admin execution monitoring + analytics
```

## Startup sequence

1. Host starts and initializes service container.
2. `DatabaseInitializationHostedService` runs migrations/seeding (configurable).
3. `ToolManifestSynchronizationHostedService` loads manifest and upserts tool registry records.
4. Admin pages read synchronized tool registry from database via repository/service layer.

## Failure scenarios

- Manifest missing: startup warning is logged under `ToolSync`, sync is skipped safely.
- Database unavailable: sync logs warning and application continues serving runtime (graceful failure).
- Manifest loads zero tools: `ToolSync` emits high-severity startup log.
