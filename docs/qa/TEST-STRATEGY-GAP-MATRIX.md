# ToolNexus Test Strategy Gap Matrix

## Mandatory context load

Reviewed:
- `docs/ARCHITECTURE-MASTER-CONTEXT.md`
- `docs/ToolNexus-UI-UX-Platform-Blueprint.md`
- `docs/PLATFORM-COMPLETENESS-AUDIT.md`

`docs/TOOLNEXUS-MASTER-DNA.md` was requested but is not present in repository.

## Existing test category inventory

| Category | Present | Evidence |
|---|---|---|
| .NET unit tests | Yes | `tests/ToolNexus.Application.Tests/*` |
| .NET integration tests | Yes | `tests/ToolNexus.Api.IntegrationTests/*`, `tests/ToolNexus.Infrastructure.Tests/*` |
| Runtime JS tests | Yes | `tests/runtime/*`, `tests/js/runtime/*` |
| Playwright tests | Yes | `tests/playwright/*` |
| Admin tests | Yes | `tests/ToolNexus.Web.Tests/Admin*`, admin API integration tests |
| Governance tests | Yes | `PolicyEnforcementStepTests`, governance controller contracts |
| Execution lifecycle tests | Yes | `UniversalExecutionEngineTests`, telemetry/conformance/admission tests |

## Test strategy gap matrix

| Strategy area | Current state | Gap classification | Action |
|---|---|---|---|
| Architecture safety tests | Broad but uneven relational guarantees | PARTIAL | Add relational delete-behavior safety tests for execution ledger graph |
| Authority boundary tests | Resolver + mapper tests present | PARTIAL | Expand API-level client input hardening checks in future sprint |
| Governance bypass prevention | Policy/admission tests present | PARTIAL | Add integration assertion for immutable governance references at persistence boundary |
| Snapshot persistence validation | Present in engine + ledger tests | PARTIAL | Strengthen with relational FK behavior checks |
| Adapter lifecycle tests | Present in JS/runtime and .NET adapter tests | FULL | Maintain |
| Runtime identity tests | Present in engine/runtime observability tests | FULL | Maintain |
| Admin control-plane tests | Present across web/API | PARTIAL | Add bulk workflow + rollback coverage in future sprint |
| Bulk operations tests | Some admin coverage | PARTIAL | Expand endpoint-level matrix |
| Failure recovery tests | Present in runtime safety/orchestrator tests | PARTIAL | Add cross-layer recovery scenarios |
| Rollback tests | Limited provider parity transaction checks | PARTIAL | Expand rollback scenarios for execution telemetry pipelines |
| AI generation lifecycle tests | Service/repository/controller tests present | PARTIAL | Add onboarding + approval failure path E2E |
| Capability marketplace tests | Present in service/web/api | FULL | Maintain |
| PostgreSQL migration/index/relations | Existing migration tests plus new relational/index tests | FULL | Maintain with real Postgres runs |

## Complete test strategy map

- **Level A — Unit:** application services, authority resolver, conformance validator, mapper, policy step.
- **Level B — Integration:** API endpoints, EF repositories, migrations, telemetry processing.
- **Level C — Contract:** controller contract tests and runtime contract suites.
- **Level D — Runtime:** js runtime lifecycle, adapter, dom/runtime safety tests.
- **Level E — Playwright E2E:** smoke execution, runtime mount, dom contracts, visual regression spec.
- **Level F — Platform Safety:** migration idempotency, provider parity, relational safety (new).
- **Level G — Governance/Security:** policy enforcement, authz tests, governance contracts.
- **Level H — Admin Control Plane:** admin monitoring/contracts/authz tests.
- **Level I — AI & Generation:** AI capability factory service/repository/controller tests.
- **Level J — Visual Regression:** playwright visual regression suite.

## Exhaustive test case inventory additions implemented in this change

Execution ledger + PostgreSQL hardening:
1. Delete execution run cascades to snapshot/conformance/authority decision artifacts.
2. Delete governance decision with snapshot references is blocked (restrict FK).
3. PostgreSQL execution run table indexes contain correlationId/tenantId/executedAtUtc targets.

## ARCHITECT REVIEW REQUIRED LIST

1. Repository currently has pre-existing test compile breaks across infrastructure test project (constructor/signature drift), preventing full suite execution until resolved.
2. API-level authority tampering tests should be expanded to ensure any client-provided authority-like options are ignored end-to-end.
3. Add admin bulk governance workflow rollback scenario at integration + Playwright levels.
