# Phase 3.5 — Infra Stabilization (Local PostgreSQL Runtime)

## Scope lock

This phase stabilizes local execution environment only. No execution lifecycle redesign, ToolShell change, runtime pipeline change, or governance logic change was introduced.

## 1) DB startup issue root cause

Primary root cause was configuration inconsistency across host apps:

- `ToolNexus.Api/appsettings.json` defaulted `Database:Provider` to `Sqlite` while runtime infrastructure resolves provider/connection from `Database:*` settings.
- `ToolNexus.Web` used PostgreSQL defaults but lacked explicit migration/fallback options in base settings.

This could cause local startup behavior drift between API/Web depending on environment overlays.

## 2) Configuration fixes applied

- Standardized local defaults to PostgreSQL in both API and Web appsettings.
- Added explicit database startup options:
  - `Database:RunMigrationOnStartup`
  - `Database:RunSeedOnStartup`
  - `Database:EnableDevelopmentFallbackConnection`
  - `Database:DevelopmentFallbackConnectionString`
- Updated infrastructure defaults to PostgreSQL baseline connection string when unspecified.
- Extended startup initialization options model with provider/connection/fallback fields.

## 3) Migration verification

- Startup migration flow still executes through existing startup phase orchestration.
- Migration diagnostics now log connectivity target (provider/host/port/database/user) and migration status.
- On PostgreSQL unavailability, startup now throws a clear, actionable error message (including SQLSTATE when available).
- Development-only optional fallback connection path can run migrations against a secondary PostgreSQL endpoint.

## 4) Local run confirmation

Validated in this phase:

- Solution builds successfully after changes.
- PostgreSQL container can be started with repository `docker-compose.yml`.
- Migrations can be applied against local PostgreSQL using startup migration path.

## Notes

The canonical execution lifecycle remains unchanged:

Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry.
