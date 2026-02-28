# Phase 3.6 — Startup Decoupling (DB-Independent Host Boot)

## Scope lock alignment

This phase applies `docs/PHASE-0-FOUNDATION-LOCK.md` and `docs/PHASE-3.5-INFRA-STABILIZATION.md` constraints:

- No execution lifecycle redesign.
- No ToolShell/UI architecture changes.
- No governance flow changes.
- Startup behavior is adjusted so host boot is not blocked by PostgreSQL unavailability.

## 1) Hosted service changes summary

### Services identified as DB-dependent at startup

Through the startup phase orchestrator, these phases are DB-dependent directly or via readiness waiting:

1. `DatabaseInitializationHostedService` (phase 0) — runs migrations and connectivity checks.
2. `ToolContentSeedStartupPhaseService` (phase 1) — seeds content in DB.
3. `ToolManifestSynchronizationHostedService` (phase 2) — syncs manifest to DB.
4. `AdminIdentitySeedHostedService` (phase 6) — writes identity seed data.
5. `AdminIdentityStartupValidator` (phase 7) — reads identity state.

### Change applied

`DatabaseInitializationHostedService` was changed from **fatal throw on startup failure** to **degraded-state signaling**:

- On PostgreSQL startup failure, it now:
  - marks `DatabaseInitializationState` as failed,
  - logs a clear degraded startup warning,
  - does **not** throw to stop the host.

The downstream DB-dependent startup phases already wait on `IDatabaseInitializationState` and gracefully skip when readiness is not reached.

## 2) Startup sequence before vs after

### Before

1. Host starts startup orchestrator.
2. `DatabaseInitializationHostedService` attempts PostgreSQL migration.
3. If PostgreSQL unavailable, service throws.
4. Host startup fails.
5. UI/API unavailable.

### After

1. Host starts startup orchestrator.
2. `DatabaseInitializationHostedService` attempts PostgreSQL migration.
3. If PostgreSQL unavailable:
   - state marked failed,
   - warning logged,
   - startup continues (degraded mode).
4. DB-dependent startup phases detect failed readiness and skip with warning.
5. Host remains online (UI/API load).

## 3) Runtime disabled behavior

Execution endpoints are now guarded by database readiness:

- When DB is offline (`IDatabaseInitializationState.IsReady == false`), execution requests return:
  - HTTP `503 Service Unavailable`
  - error payload: `execution_unavailable_database_offline`

This preserves the existing execution contract by refusing runtime execution while dependencies are unavailable, without introducing alternate execution paths.

## 4) Health endpoint implementation

Added runtime health endpoint in API and Web hosts:

- `GET /health/runtime`

Response fields:

- `db_connected` — `true` only when database initialization is ready.
- `execution_ready` — mirrors runtime execution readiness (currently tied to DB readiness).

Example degraded response:

```json
{
  "db_connected": false,
  "execution_ready": false
}
```

Example ready response:

```json
{
  "db_connected": true,
  "execution_ready": true
}
```
