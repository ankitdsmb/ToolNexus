# Startup Orchestration

## Phase Diagram

```text
Host Start
  -> Phase 0 (Order 0): DatabaseInitializationHostedService
       - Executes Database.MigrateAsync() with retry logic
       - Marks IDatabaseInitializationState ready on success
  -> Phase 1 (Order 1): ToolContentSeedStartupPhaseService
       - Seeds content when Database:RunSeedOnStartup is true
  -> Phase 2 (Order 2): ToolManifestSynchronizationHostedService
       - Synchronizes tool definitions from manifest into DB
  -> Phase 3 (Order 3): PlatformCacheWarmupHostedService
       - Warms admin analytics and tool catalog caches
Host Running
```

`StartupOrchestratorHostedService` discovers all `IStartupPhaseService` registrations, orders them by `Order`, and executes each phase sequentially.

## Hosted Service Order Contract

- `StartupOrchestratorHostedService` is the single startup sequencer for ordered platform initialization.
- Startup phase services **must** implement `IStartupPhaseService` and provide deterministic `Order` values.
- Phase services are intentionally non-parallel. A later phase does not begin until the previous phase completes.

## Migration Rules

- `Database.MigrateAsync()` is allowed only in `DatabaseInitializationHostedService`.
- Content seeding and tool synchronization must not call migrations.
- Migration failures are fail-fast; startup orchestration stops and the host startup fails.

## Database Safety Contract

- `DatabaseInitializationState` implements `IDatabaseInitializationState`.
- Database-dependent startup phases must call `WaitForReadyAsync` before querying tables.
- When DB initialization fails, `WaitForReadyAsync` throws, preventing unsafe DB access in downstream phases.

## Startup Diagnostics

Configuration:

```json
"StartupDiagnostics": {
  "Enabled": true,
  "LogFolder": "./logs/startup"
}
```

Diagnostics behavior:

- Structured logs:
  - `[StartupPhase] BEGIN Phase X (...)`
  - `[StartupPhase] END Phase X (...) DurationMs=...`
- Entries are emitted to standard logging and appended to daily file logs under the configured startup diagnostics folder.
