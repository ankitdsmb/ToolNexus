# Phase 9 — Neon PostgreSQL Development + QA Validation Report

## Phase 1 — Architecture Impact Report
- ORM layer: EF Core (`ToolNexusContentDbContext`) with provider abstraction through `DatabaseProviderConfiguration` and repository access in `EfToolContentRepository`.
- DB dependencies identified:
  - repositories: `EfToolContentRepository`
  - migrations: `src/ToolNexus.Infrastructure/Data/Migrations/*`
  - provider switch: `DatabaseProviderConfiguration`
  - design-time context factory: `ToolNexusContentDbContextFactory`
  - startup migration + seed flow: `ToolContentSeedHostedService`
- Compatibility risks reviewed:
  - URI PostgreSQL connection strings are not EF/Npgsql-native key/value format.
  - SQLite permissive typing vs PostgreSQL strict typing.
  - identity/autoincrement behavior differences.
  - collation/case-sensitivity effects around slug uniqueness and filtering.
  - transaction semantics and concurrent write conflict behavior across providers.

## Phase 2 — Engineering Execution Plan
- Migration strategy:
  1. Configure Dev + QA runtime to PostgreSQL using Neon DSN.
  2. Preserve provider abstraction and SQLite fallback (`appsettings.json` remains SQLite).
  3. Add connection-string normalization from URI format to Npgsql format.
  4. Validate provider wiring with unit tests.
  5. Execute app startup for migration/seed validation.
- Rollback strategy:
  - Keep SQLite default provider in base settings.
  - Environment-specific override only in Development/QA files.
  - No repository contract changes.
- Data conversion rules:
  - Parse URI user/password/database/query values into Npgsql connection-string fields.
  - Preserve SSL/channel binding requirements.

## Phase 3 — QA Test Matrix (execution mapping)
- Good path:
  - Provider configuration resolves Npgsql for PostgreSQL aliases.
  - URI DSN conversion resolves to Npgsql-compatible connection string.
  - Full app startup triggers migration/seed hosted service.
- Bad path:
  - Neon host network unreachable from runner (captured as environment blocker).
  - PostgreSQL parity/concurrency tests fail when socket cannot connect.

## Phase 4 — Unit Test Expansion
- Added `DesignTimeFactory_PostgreSqlUriArgs_NormalizesToNpgsqlConnectionString` to validate URI normalization for PostgreSQL DSNs.

## Phase 5 — Developer Verification
- Development and QA appsettings now explicitly target PostgreSQL (Neon DSN).
- Startup and migration flow attempted for both Development and QA.
- Result: runtime reaches Npgsql migration path but environment cannot establish TCP connectivity to Neon endpoint (`Network is unreachable`).

## Phase 6 — QA Cycle
- Executed infrastructure provider-parity and migration/concurrency suites with PostgreSQL provider selection.
- Result: PostgreSQL-targeted tests failed due network connectivity to Neon host.

## Phase 7 — Migration Safety Checklist
- [x] Provider abstraction preserved.
- [x] SQLite fallback preserved.
- [x] PostgreSQL URI normalization added and unit-tested.
- [ ] Neon migration execution completed (blocked: network unreachable).
- [ ] `__EFMigrationsHistory` verified on Neon (blocked: network unreachable).
- [ ] Seeded table row counts verified on Neon (blocked: network unreachable).
- [ ] FK/orphan/constraint checks against Neon (blocked: network unreachable).
- [ ] Rollback execution on Neon validated (blocked by same connectivity issue).

## Operational Blocker
- This CI/container environment cannot open outbound socket connections to the Neon host (`ep-jolly-field-aezmdq7i-pooler.c-2.us-east-2.aws.neon.tech:5432`), preventing direct completion of database initialization and data verification tasks.
