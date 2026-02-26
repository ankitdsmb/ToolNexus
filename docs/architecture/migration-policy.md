# ToolNexus Migration Safety Policy

## Purpose
This policy prevents startup failures caused by migration drift and schema mismatch.

## Mandatory Rules
1. **No raw SQL joins with hard-coded alias id assumptions**
   - Do not reference alias-bound columns like `er.id` / `es.id` unless the migration first verifies column presence.
   - Prefer guarded dynamic SQL that discovers the active key column in PostgreSQL (`id` vs legacy/renamed key columns).

2. **No unsafe identity-column ALTER operations**
   - Do not issue direct identity DDL without PostgreSQL safety guards.
   - Use existing migration safety helpers for identity conversion.

3. **No implicit type casts in migration SQL**
   - All type conversions must be explicit and guarded.
   - Use platform migration safety helpers for boolean/inet/identity conversions.

4. **Use safety helpers for destructive or drift-sensitive operations**
   - Constraint/index/table drops must be existence-checked.
   - FK updates must verify source and target schema state before execution.

5. **Migrations must be idempotent in startup retry environments**
   - Migrations must succeed for clean, partially migrated, and hot-fixed PostgreSQL databases.
   - Structural mismatch failures must be treated as non-transient and must not be retried indefinitely.

## Baseline Stabilization Rule
- `Baseline_Stabilized` is a schema-alignment marker migration.
- It must remain non-destructive and must not run destructive SQL.
- Future migrations must be additive and safety-guarded.
