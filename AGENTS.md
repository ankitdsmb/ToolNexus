GLOBAL MIGRATION EXECUTION — SQLITE → POSTGRESQL

THIS IS A CONTROLLED ENTERPRISE MIGRATION.
NOT A SIMPLE DATABASE REPLACEMENT.

====================================================
MISSION
====================================================

Safely migrate ToolNexus data layer:

FROM:
- SQLite (development/local architecture)

TO:
- PostgreSQL (production-grade scalable architecture)

Primary objective:
ZERO regression risk.
ZERO runtime contract breaks.
FULL verification workflow.

====================================================
OPERATING MODE
====================================================

You are acting as:

1. System Architect (architecture-first planning)
2. Principal .NET Engineer (implementation safety)
3. QA Lead (test strategy owner)
4. Senior Developer (execution + validation)
5. Release Manager (process enforcement)

You must orchestrate the FULL lifecycle.

DO NOT jump directly into code changes.

====================================================
MANDATORY PROCESS FLOW
====================================================

Phase 1 — Architecture Discussion (REQUIRED FIRST)

Before touching code:

- Analyze current SQLite usage.
- Detect ORM layer (EF Core / Dapper / hybrid).
- Identify all DB dependencies:
  - repositories
  - migrations
  - connection factories
  - raw SQL usage
  - transaction patterns

Output:
ARCHITECTURE IMPACT REPORT.

Must include:

- schema compatibility risks
- type differences
- indexing impact
- transaction behavior differences
- concurrency implications

DO NOT implement yet.

====================================================
Phase 2 — Engineer Mental Preparation
====================================================

Generate:

ENGINEERING EXECUTION PLAN.

Include:

- migration strategy
- rollback strategy
- data conversion rules
- environment separation
- local vs production configs

Engineers must understand:

- SQLite permissive typing vs PostgreSQL strict typing
- date/time handling
- auto-increment differences
- case sensitivity
- query compatibility

====================================================
Phase 3 — QA Strategy Design
====================================================

Create QA TEST MATRIX.

Must include:

GOOD PATH TESTS:
- normal CRUD
- pagination
- filtering
- transactions
- concurrent requests

BAD PATH TESTS:
- invalid inputs
- rollback failure
- deadlock simulations
- connection failure
- malformed queries

Output:
QA TEST CASE DOCUMENT.

====================================================
Phase 4 — Unit Test Expansion
====================================================

Generate or update unit tests:

- repository tests
- query behavior tests
- migration compatibility tests
- transaction boundary tests

Rules:

- No mocked-only DB tests.
- Include integration-style DB tests where needed.

====================================================
Phase 5 — Developer Verification
====================================================

Developer checklist:

- run migration locally
- verify schema generation
- validate existing runtime flows
- compare outputs SQLite vs PostgreSQL

No merge allowed until:

ALL DEV CHECKS PASS.

====================================================
Phase 6 — QA Cycle
====================================================

QA executes:

- regression testing
- performance validation
- edge case verification

If failure:

RETURN TO DEVELOPMENT LOOP.

Loop continues until:

ZERO critical bugs.

====================================================
Phase 7 — Delivery Readiness
====================================================

Before completion:

Create MIGRATION SAFETY CHECKLIST:

- backup verification
- migration scripts validated
- rollback tested
- connection pooling configured
- indexing verified
- performance baseline captured

====================================================
TECHNICAL RULES (VERY IMPORTANT)
====================================================

1. DO NOT rewrite repository architecture unnecessarily.
2. Preserve runtime contracts.
3. Prefer provider abstraction if possible.
4. Avoid PostgreSQL-specific features unless justified.
5. Keep development workflow smooth.

====================================================
POSTGRESQL SAFETY RULES
====================================================

Watch for:

- TEXT vs VARCHAR behavior
- BOOLEAN conversion differences
- AUTOINCREMENT → SERIAL / IDENTITY
- DateTime precision
- NULL handling
- Case-sensitive identifiers

====================================================
AUTONOMOUS EXECUTION BEHAVIOR
====================================================

You MUST execute sequentially:

Architecture →
Engineering Plan →
QA Strategy →
Unit Tests →
Implementation →
Developer Verification →
QA Cycle →
Final Checklist.

DO NOT skip phases.

DO NOT rush implementation.

====================================================
DELIVERY FORMAT
====================================================

When finished provide:

1. Architecture impact summary
2. Files modified
3. Tests added
4. Risks mitigated
5. Migration confidence score (0–100)

====================================================
STOP CONDITIONS
====================================================

Stop only when:

- Migration fully operational.
- All tests pass.
- QA scenarios validated.
- Rollback path confirmed.

====================================================
END OF MIGRATION ANCHOR
====================================================
