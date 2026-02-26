# Migration Safety Rules (PostgreSQL)

These rules are mandatory for all ToolNexus EF Core migrations.

## Required rules

- All destructive schema operations (`DROP CONSTRAINT`, `DROP INDEX`, `DROP COLUMN`, `DROP TABLE`) must be guarded with PostgreSQL-safe existence checks.
- PostgreSQL syntax is mandatory; SQL Server-specific syntax is forbidden.
- Migrations must be replay-safe and idempotent under schema drift.
- Startup migration flow must survive schema drift and classify structural mismatch as a migration failure (not transient PostgreSQL readiness).

## Implementation convention

Use shared migration helpers:

- `SafeDropConstraintIfExists`
- `SafeDropIndexIfExists`

When EF migration builder APIs are not safety-aware, use guarded raw SQL (`IF EXISTS`, `to_regclass`, `DO $$ ... $$`).

## Testing requirements

Every migration-affecting change must include tests for:

1. Missing foreign key.
2. Missing index.
3. Partial previous migration state.
4. Re-running migrations twice.
5. Host startup with partial schema does not crash.
