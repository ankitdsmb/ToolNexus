# PostgreSQL Migration Safety (Drift-Tolerant Startup)

## Scope
This document defines the migration safety contract for ToolNexus PostgreSQL migrations.

## Unsafe Operations (Forbidden)
- Direct `ALTER COLUMN ... TYPE ...` for incompatible casts (especially `text -> boolean`, `text -> inet`).
- Identity reconfiguration without schema inspection.
- Drops without `IF EXISTS` or schema-state guards.

## Universal Safety Helper
Use `PostgresMigrationSafety` + `MigrationSafetyExtensions` for all drift-prone schema work:

- `EnsureIdentityColumnSafe(table, column)`
- `SafeConvertToBoolean(table, column)`
- `SafeConvertToInet(table, column)`
- `SafeConvertColumn(table, column, strategy)`
- `SafeDropConstraintIfExists(table, constraint)`
- `SafeAddColumnIfMissing(table, column, sqlDefinition)`

## Conversion Pattern (Mandatory)
For incompatible conversions, use multi-step conversion:
1. Add temporary target-type column.
2. Populate with explicit conversion expression.
3. Drop original column.
4. Rename temporary column to original name.
5. Re-apply nullability as needed.

## Boolean Conversion Rule
`SafeConvertToBoolean` applies:

```sql
CASE
WHEN lower(value::text) IN ('true','1','yes','y','success') THEN true
WHEN lower(value::text) IN ('false','0','no','n','fail') THEN false
ELSE false
END
```

## INET Conversion Rule
`SafeConvertToInet` applies:

```sql
CASE
WHEN value::text ~ '^(\d{1,3}\.){3}\d{1,3}$' THEN value::inet
ELSE NULL
END
```

Invalid values are converted to `NULL`; migration must not crash.

## Identity Rule
`EnsureIdentityColumnSafe` checks `information_schema.columns.is_identity` and only applies identity if currently `NO`.
If already `YES`, operation is a no-op.

## Stabilized Risk Inventory
Audited migrations with drift-prone operations:
- `20260225214033_AddExecutionLedger` (identity + boolean + inet conversion).
- `20260312000000_FixIdentityBooleanColumnsForPostgres` (identity booleans).
- `20260224203654_FixIdentityAutoIncrementIds` (identity backfill).

## Startup Diagnostics
`DatabaseInitializationHostedService` emits:
- migration name
- SQLSTATE
- table and column
- inferred conversion strategy

Structural schema errors are non-retryable and abort startup retries.
