# Migration Safety (PostgreSQL Drift-Tolerant Contract)

This document defines mandatory migration safety rules for ToolNexus.

## Core Rules

1. **Never AlterColumn identity directly.**
   - Do not emit `ALTER COLUMN ... ADD GENERATED`, `DROP DEFAULT`, `SET DEFAULT`, or direct identity metadata rewrites in migrations.
   - Use `PostgresMigrationSafety.EnsureIdentityColumnSafe` / `SafeNoOpIfIdentityExists`.

2. **Never cast legacy values to boolean with direct `ALTER COLUMN TYPE boolean`.**
   - Use `PostgresMigrationSafety.SafeConvertColumnToBoolean` to perform a temp-column conversion pattern:
     - add temp boolean column
     - CASE data conversion
     - drop original column
     - rename temp column

3. **All migration DDL must be idempotent.**
   - Use guard clauses and existence checks for constraints, indexes, and columns.
   - Use `PostgresMigrationSafety.SafeDropConstraintIfExists` and `PostgresMigrationSafety.SafeAddColumnIfMissing`.

4. **Migrations must tolerate drifted environments.**
   - clean database
   - partially migrated database
   - previously hot-fixed database

## Helper Layer

Use `src/ToolNexus.Infrastructure/Data/Migrations/PostgresMigrationSafety.cs` and `MigrationSafetyExtensions.cs` for all PostgreSQL safety wrappers.

## Startup Determinism

`DatabaseInitializationHostedService` classifies structural migration failures as non-retryable and logs context-rich diagnostics (migration, SQLSTATE, table/column, detail). This protects startup from retry dead-loops on schema mismatches.
