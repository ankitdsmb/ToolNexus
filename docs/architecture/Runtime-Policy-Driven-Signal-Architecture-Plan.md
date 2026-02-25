# SECTION 1 — Executive Summary

ToolNexus should evolve from **console-centric runtime signaling** to a **policy-driven runtime signal architecture** where a runtime event bus is the canonical source of truth and console, incident, metrics, and QA become adapters. The migration should preserve resilience-first behavior, keep production fallback semantics intact, and prevent runtime hard failures. The proposed approach is an incremental, compatibility-first rollout that introduces policy modes (`production`, `development`, `test`) and gradually moves existing consumers from console interception to structured runtime event assertions.

This is a multi-sprint platform evolution (not a one-shot refactor):

- **Sprint 1–2**: Discovery, instrumentation baseline, event taxonomy, scaffolding behind flags.
- **Sprint 3–4**: Adapter migration and logger refactor with compatibility layer.
- **Sprint 5+**: QA harness migration, strict test mode, rollout hardening, deprecation path.

The biggest delivery risk is hidden coupling to current downgraded console semantics (`error` -> `warn`) in tests and operational runbooks. The plan explicitly includes dual-write telemetry, contract tests, and canary gating to avoid regressions.

---

# SECTION 2 — System Impact Map

## 2.1 Component-level impact

### Frontend runtime kernel
- Add `RuntimeEventBus` abstraction with typed events, non-throwing publish semantics, backpressure controls, and adapter fan-out.
- Add event taxonomy for:
  - lifecycle transitions
  - runtime errors
  - fallback activation
  - observer events
  - incident dispatch attempts and outcomes
- Ensure bus never blocks UI path; failures in adapters are isolated and converted into internal diagnostics.

### Runtime logger
- Replace current severity-authority role with adapter role.
- Existing `console.error -> console.warn` downgrade behavior becomes policy-controlled mapping, not hardcoded global behavior.
- Preserve existing production log volume characteristics by default policy values.

### Incident reporting pipeline
- Consume canonical runtime error/fallback events from bus.
- Record both `dispatch_attempted` and `dispatch_suppressed/failed` states to preserve best-effort suppression behavior while improving observability symmetry.

### Metrics/observability
- Introduce metrics adapter (event counts by class, policy mode, fallback category, adapter result).
- Add correlation IDs to tie runtime event → incident report → API intake log.

### QA adapter and test harness
- Introduce dedicated QA adapter sink that can be consumed in Playwright/Vitest without relying on console interception.
- Add strict mode expectations in `test` policy (e.g., error-class events must be emitted even when UI falls back safely).

### API ingestion (backend)
- Validate existing client log/incident ingestion contracts for new metadata fields (event type, policy mode, correlation ID, adapter status).
- Add backward-compatible DTO expansion and schema migration if persistence is updated.

### Bootstrap/config
- Add `RuntimeErrorHandlingPolicy` config source precedence:
  1. environment variable
  2. server-rendered config payload
  3. default profile (`production` fallback)
- Validate policy at startup; invalid policy should degrade to safe default and emit diagnostic event.

## 2.2 Runtime lifecycle impact

- During startup, policy is resolved before runtime subsystem initialization.
- Event bus and adapters are created once and passed to runtime modules via dependency injection/composition root.
- Lifecycle events (`runtime_init`, `runtime_ready`, `runtime_degraded`, `runtime_recovered`) become first-class signals.

## 2.3 Logging pipeline impact

- Console output remains enabled but is no longer used as reliability contract.
- Severity mapping becomes mode-aware:
  - production: minimize noisy errors, preserve current stability profile
  - development: richer diagnostics
  - test: strict fidelity (error-class runtime events remain distinguishable)

## 2.4 QA harness impact

- Existing console listeners become compatibility checks only.
- Primary assertions move to QA adapter stream.
- New fixtures expose recorded runtime events with deterministic filtering.

## 2.5 Backward compatibility impact

- Compatibility layer keeps existing logger APIs and incident API payload shape during migration.
- Dual-write period (console + event bus) prevents abrupt test and ops breakage.
- Feature flags/policy toggles allow per-environment rollback without redeploying code.

---

# SECTION 3 — Development Phases (detailed WBS)

## Phase 0 — Discovery and baseline (1 sprint)

### 0.1 Runtime signal inventory
- Map all runtime `try/catch` and fallback paths.
- Inventory all console writes and current severity transformations.
- Identify all test suites intercepting console output.

### 0.2 Contract baseline
- Define current behavior snapshot tests (golden runs) across representative flows.
- Capture incident report success/failure suppression behavior.

### 0.3 Architecture decision and taxonomy
- Approve event taxonomy, payload schema, and non-throwing bus contract.
- Publish ADR with migration constraints.

## Phase 1 — Scaffolding and policy foundation (1 sprint)

### 1.1 RuntimeEventBus scaffolding
- Implement lightweight bus with sync publish + bounded queue option.
- Add adapter registration, ordering guarantees, and fault isolation.

### 1.2 Policy model introduction
- Implement `RuntimeErrorHandlingPolicy` model and resolver.
- Add mode-specific defaults and schema validation.

### 1.3 Observability scaffolding
- Add event IDs/correlation IDs.
- Add minimal internal counters for bus and adapter health.

## Phase 2 — Event bus introduction into runtime core (1 sprint)

### 2.1 Core path wiring
- Emit events in runtime initialization, tool execution, and fallback handlers.
- Keep existing direct console/log calls in place during dual-path stage.

### 2.2 Error path normalization
- Standardize error envelope (`category`, `severity`, `recoverability`, `fallback_applied`).
- Ensure no event emission can throw to caller.

### 2.3 Contract tests
- Add unit tests proving event emission on error/fallback paths.

## Phase 3 — Adapter migration and logger refactor (1–2 sprints)

### 3.1 Console adapter
- Move console behavior behind adapter with policy-aware severity mapping.
- Preserve existing message text format where external tooling depends on it.

### 3.2 Incident adapter
- Replace direct incident calls with bus-driven adapter.
- Emit adapter outcome events (`success`, `suppressed`, `failed`).

### 3.3 Metrics adapter
- Emit metrics for event classes and adapter outcomes.
- Add dashboards/queries for drift detection between channels.

### 3.4 Logger API compatibility layer
- Keep legacy logger surface; internally route through bus.
- Add deprecation annotations and migration guidance.

## Phase 4 — QA mode implementation (1 sprint)

### 4.1 QA adapter and capture interface
- Implement in-memory/event-stream collector accessible to Playwright and Vitest.
- Add deterministic event filtering helpers.

### 4.2 Test policy semantics
- Implement strict `test` mode requirements:
  - all runtime error-class events must be emitted
  - downgraded console severity cannot hide runtime error classification

### 4.3 QA contract migration
- Convert high-value suites first (smoke, critical flow regressions).
- Keep temporary assertions for console parity during transition.

## Phase 5 — Compatibility hardening and incremental rollout (1 sprint)

### 5.1 Feature-flag deployment
- Enable new bus architecture in canary environments first.
- Run dual-write comparisons between legacy and new signals.

### 5.2 Drift analysis and remediation
- Track mismatches (missing events, duplicated incidents, severity drifts).
- Fix taxonomy/policy edge cases.

### 5.3 Production rollout gates
- Define error budget guardrails for event loss and incident mismatch.
- Roll out by percentage / environment tier.

## Phase 6 — Decommission legacy paths (0.5–1 sprint)

### 6.1 Remove direct console authority assumptions
- Delete dead code where runtime logic depends on console severity.

### 6.2 QA cleanup
- Remove console-interception-as-authority tests after confidence threshold.

### 6.3 Documentation and runbook updates
- Update runtime architecture docs, troubleshooting guide, and QA playbook.

---

# SECTION 4 — Effort Estimate Table

| Workstream | T-shirt Size | Ideal Eng-Days | Realistic Eng-Days | Risk Multiplier | Notes |
|---|---:|---:|---:|---:|---|
| Discovery + baseline contracts | M | 6 | 9 | 1.3x | Mature system hidden coupling likely |
| Event bus + policy scaffolding | M | 7 | 10 | 1.4x | Requires careful no-throw guarantees |
| Runtime core integration | L | 10 | 15 | 1.5x | Touches many resilience/fallback paths |
| Adapter migration (console/incident/metrics) | L | 12 | 18 | 1.5x | Multiple channels, parity requirements |
| Logger compatibility layer | M | 5 | 8 | 1.4x | External dependencies on existing logger |
| QA adapter + test mode migration | L | 11 | 17 | 1.55x | Test flakiness risk during transition |
| Rollout, canary, and decommission | M | 6 | 10 | 1.6x | Production behavior verification heavy |
| **Total** | **XL** | **57** | **87** | **~1.5x blended** | ~5–7 sprints with 2–3 senior engineers |

Assumptions:
- Team has at least one dedicated runtime owner and one QA automation lead.
- Existing telemetry stack can absorb additional labels/metrics without platform changes.

---

# SECTION 5 — Risk Matrix

| Risk | Category | Probability | Impact | Early Signal | Mitigation |
|---|---|---|---|---|---|
| Hidden behavior drift from severity mapping changes | Regression | High | High | Increased flaky tests or missing alerts | Dual-write, parity dashboards, canary gating |
| Event bus introduces performance overhead | Architectural | Medium | High | Increased client-side latency in hot paths | Bounded queues, sampling, perf budgets |
| Adapter failure cascades into runtime instability | Architectural | Low | Critical | Runtime error spikes after enabling new path | Strict adapter isolation + circuit breakers |
| QA false negatives during migration | QA quality | High | High | Tests passing while incidents rise | Mandatory event assertions in critical suites |
| QA false positives from stricter test mode | QA quality | Medium | Medium | New failures in non-critical tests | Stage migration by suite priority |
| Incomplete API schema compatibility | Integration | Medium | High | Ingestion validation errors | Backward-compatible DTO expansion + versioned fields |
| Operational confusion over dual signals | Observability/process | Medium | Medium | Incident triage conflicts | Runbook updates and explicit source-of-truth labeling |
| Policy misconfiguration in production | Config/bootstrap | Medium | High | Unexpected verbosity or muted diagnostics | Safe fallback defaults + startup validation event |

Hidden impacts often missed:
- Third-party scripts and browser extensions scraping console output.
- On-call playbooks keyed to console warning counts rather than structured metrics.
- Data warehouse transformations expecting old incident payload schema.

---

# SECTION 6 — Migration Strategy

## 6.1 Zero-breaking migration path
1. Introduce event bus in shadow mode (emit-only, no behavioral authority).
2. Maintain existing console + incident paths while dual-writing from bus.
3. Gradually switch adapters to consume bus while preserving output shapes.
4. Deprecate direct console authority only after parity SLOs are met.

## 6.2 Feature flag / policy compatibility layer
- Add runtime switch:
  - `runtime.signals.mode=legacy|hybrid|policy-driven`
- Keep `legacy` as immediate rollback path.
- `hybrid` enables bus + legacy writes for parity checks.
- `policy-driven` enables adapter authority with compatibility shims.

## 6.3 Incremental rollout strategy
- Development: default `policy-driven` to harden quickly.
- Test: enforce strict event assertions with fail-fast QA adapter checks.
- Canary production: 5% -> 25% -> 50% -> 100% by tenant/environment.
- At each gate verify:
  - event emission parity
  - incident volume parity (within threshold)
  - no runtime hard-failure delta

## 6.4 Rollback strategy
- Immediate config rollback to `legacy` mode (no code redeploy).
- Preserve instrumentation to diagnose rollback root cause.
- Post-rollback diff tooling compares missed events and adapter failures.

---

# SECTION 7 — QA Evolution Plan

## 7.1 Current -> target model
- **Current**: console interception is overloaded as both debug surface and failure signal.
- **Target**: QA validates structured runtime events via QA adapter; console checks become secondary diagnostics.

## 7.2 Test migration sequence
1. Create shared test fixture (`runtimeEventRecorder`) for Playwright/Vitest.
2. Migrate critical path tests first:
   - startup integrity
   - tool execution fallback behaviors
   - incident suppression paths
3. Add contract tests ensuring each caught runtime error emits exactly one canonical error-class event.
4. Retain temporary console parity assertions for 2–3 release cycles.
5. Remove console-authority assertions once parity KPIs stabilize.

## 7.3 New QA quality gates
- CI gate: zero missing canonical error events in strict test mode.
- CI gate: no unclassified fallback activations.
- CI gate: event bus adapter failure rate below threshold.

## 7.4 Flakiness control
- Use deterministic event IDs and scoped recorders per test context.
- Introduce timeout-aware polling helpers for async adapter flushes.

---

# SECTION 8 — Organizational Impact

## Frontend runtime engineers
- Moderate-to-high impact: core runtime abstractions and error pathways are touched.
- Need alignment on event taxonomy, policy semantics, and performance budgets.

## Backend API engineers
- Moderate impact: ingestion contracts, DTO/schema evolution, and analytics parity.
- Need to support versioned payload ingestion and compatibility transformations.

## QA automation engineers
- High impact: test strategy changes, fixture architecture updates, and migration sequencing.
- Require pairing with runtime owners during first 2 migration sprints.

## DevOps/configuration owners
- Moderate impact: policy defaults, feature-flag wiring, dashboard and alert updates.
- Must define environment-specific policy governance and rollback procedures.

## Program/process impact
- Requires cross-team release checklist updates.
- Needs explicit sign-off criteria from runtime, QA, and SRE before full production rollout.

---

# SECTION 9 — Expected Outcomes

## Developer experience improvements
- Clear separation: console for debugging, event bus for correctness signals.
- Faster root-cause analysis via correlated runtime/incident/metrics events.

## QA reliability gains
- Reduced false negatives caused by severity downgrades.
- More stable assertions on typed events versus log text matching.

## Observability alignment
- Symmetric signaling across console, incident, and metrics channels.
- Ability to measure suppression behavior instead of silently losing visibility.

## Maintainability improvements
- Adapters become pluggable and independently evolvable.
- Policy modes reduce ad hoc environment-specific behavior forks.

---

# SECTION 10 — Long-Term Architectural Benefits

1. **Single source of truth for runtime state transitions and failures**.
2. **Stronger contract architecture** across runtime, QA, and backend ingestion.
3. **Future extensibility** for additional adapters (A/B diagnostics, remote tracing, tenant-specific auditing).
4. **Controlled resilience semantics**: fallback-first behavior remains explicit and observable.
5. **Lower operational risk over time** by replacing implicit console conventions with explicit policy contracts.

## Cost of doing nothing

If ToolNexus keeps the current console-authority model:
- Severity drift will continue to hide real runtime degradation from QA.
- Incident/observability asymmetry will worsen as channels evolve independently.
- Regression detection quality will degrade as tests remain tied to fragile console semantics.
- On-call triage time will increase due to conflicting signals.
- Future platform changes (new adapters, telemetry modernization, stricter compliance reporting) will become significantly more expensive because core signaling contracts remain implicit instead of explicit.
