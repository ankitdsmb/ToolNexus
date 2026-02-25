# Multi-Language Execution Engine — Architecture Council

## SECTION 1 — Architecture Discussion Summary

### Council participants and conclusions

1. **Backend Platform Architect**
   - **Risk focus:** breaking existing .NET execution contracts, introducing branching logic everywhere.
   - **Option view:** favors a universal execution engine abstraction with language adapters to keep existing API stable.
   - **Maintainability:** enforce a single orchestration path; language-specific details must remain behind adapter boundaries.

2. **Runtime Systems Architect**
   - **Risk focus:** runtime instability from mixed execution models and inconsistent lifecycle handling.
   - **Option view:** reject in-process execution for non-.NET languages; prefer worker-based execution with strict lifecycle.
   - **Maintainability:** standardize tool invocation states (Queued, Running, Completed, Failed, TimedOut, Killed).

3. **Security Architect**
   - **Risk focus:** remote code execution, data exfiltration, privilege escalation.
   - **Option view:** require deny-by-default permissions, signed/approved tool packages, no arbitrary script bodies from clients.
   - **Maintainability:** policy-as-code for permissions, auditable allowlists, and immutable execution logs.

4. **Sandbox Execution Architect**
   - **Risk focus:** host compromise via filesystem or kernel escape paths.
   - **Option view:** containerized sandbox with seccomp/AppArmor, read-only root FS, ephemeral writable workspace.
   - **Maintainability:** reusable hardened runtime image and versioned sandbox profiles.

5. **Python Integration Architect**
   - **Risk focus:** dependency drift, interpreter inconsistency, unsafe dynamic imports.
   - **Option view:** Python workers consume pre-registered tools and locked dependencies only.
   - **Maintainability:** tool manifest + pinned environment + compatibility matrix per runtime version.

6. **Scalability Architect**
   - **Risk focus:** queue starvation, noisy-neighbor effects, tenant contention.
   - **Option view:** dedicated execution queue + autoscaled worker pools by language/classification.
   - **Maintainability:** quota-aware routing and per-tenant concurrency governance.

7. **Performance Architect**
   - **Risk focus:** cold starts and serialization overhead.
   - **Option view:** hybrid warm worker pool + lightweight container reuse with strict max-lifetime.
   - **Maintainability:** benchmark-driven tuning; separate SLOs by tool class (CPU-bound vs I/O-bound).

8. **Observability Architect**
   - **Risk focus:** fragmented metrics and non-correlatable incidents.
   - **Option view:** propagate correlation IDs across orchestrator, adapter, worker, and sandbox.
   - **Maintainability:** one normalized telemetry schema regardless of language.

9. **Dev Experience Architect**
   - **Risk focus:** difficult onboarding and fragile tool authoring.
   - **Option view:** declarative tool registration and local validation CLI that emulates platform constraints.
   - **Maintainability:** strict contract linting and template-based onboarding for new tools.

10. **Platform Governance Architect**
    - **Risk focus:** uncontrolled capability growth and policy exceptions.
    - **Option view:** governance gate for every new tool capability and language runtime version.
    - **Maintainability:** staged rollout, approval workflow, and deprecation lifecycle.

---

## SECTION 2 — Risks of Naive Multi-Language Execution

- Executing client-supplied Python directly creates immediate **RCE exposure**.
- In-process interpreter embedding increases blast radius: Python faults can destabilize the .NET host.
- Unrestricted imports/network/filesystem access can leak secrets and move laterally.
- Lack of hard resource controls allows CPU/memory abuse and denial-of-service.
- Language-specific response formats break downstream runtime contracts and observability.
- Unversioned tools/dependencies create non-reproducible incidents and rollback difficulty.
- Missing governance produces capability creep and security policy drift.

---

## SECTION 3 — Recommended Execution Architecture

### Universal execution architecture (language-agnostic)

**Control Plane (existing ToolNexus runtime evolution)**
- Tool API (existing entry point)
- Universal Execution Engine (new orchestration layer)
- Policy/Permission Evaluator
- Queue + Scheduler
- Observability and Incident Router

**Data Plane (isolated execution)**
- Language Adapter (.NET component per language)
- Worker Manager (pool + lifecycle)
- Sandboxed Worker Runtime (Python initially)

### Universal execution contract

- `ToolExecutionRequest` (normalized input)
- `ToolExecutionContext` (tenant, user, correlation, policy snapshot)
- `ToolExecutionResult` (normalized output + artifacts + diagnostics)
- `ToolExecutionIncident` (standardized failure/security signals)

### Universal request model

- `toolId`, `toolVersion`
- `language` (e.g., `dotnet`, `python`)
- `operation` (named operation, not raw code)
- `inputPayload` (JSON)
- `inputArtifacts` (references only)
- `executionPolicyId`
- `resourceClass` (small/medium/large)
- `timeoutBudgetMs`
- `correlationId`, `tenantId`, `requestId`

### Universal response schema

- `status` (`Succeeded`, `Failed`, `TimedOut`, `PolicyDenied`, `SandboxViolation`)
- `outputPayload` (JSON)
- `outputArtifacts` (managed references)
- `metrics` (cpuMs, memoryPeakMb, wallMs, queueWaitMs)
- `incidents` (structured list)
- `logsRef` (link to centralized logs)
- `traceId`

### Language-specific adapters

- Adapter responsibilities:
  - translate normalized request to language runtime envelope,
  - invoke worker through a controlled protocol,
  - map runtime-specific errors back to normalized incidents,
  - enforce policy before dispatch.
- Adapters cannot bypass policy engine, quota checks, or telemetry hooks.

---

## SECTION 4 — Python Execution Model

### Script/tool registration

Python tools are **registered artifacts**, not ad-hoc scripts:
- Tool package contains:
  - manifest (id, version, entry operation names),
  - declared capabilities (filesystem scope, network allowance, artifact types),
  - dependency lock file,
  - signature/provenance metadata.
- Registration pipeline performs static validation, policy review, and approval.
- Only approved package versions are executable.

### Script execution

- Client requests `toolId + operation`; no script text accepted at runtime.
- Universal engine resolves approved package/version.
- Python adapter dispatches to isolated worker with immutable input envelope.
- Worker executes the operation in sandbox and returns normalized result.

### Allowed capabilities

- Built-in Python stdlib subset and pre-approved libraries only.
- Controlled helper modules provided by platform.
- No dynamic package installation during execution.
- No shell/process spawning unless explicitly approved for a specific tool class.

### Resource limits

Per invocation (policy-driven):
- hard timeout,
- CPU quota,
- memory cap,
- max output size,
- max artifact count/size,
- max temporary disk usage.

---

## SECTION 5 — Security Model

### Sandbox isolation

- Execute Python in containerized sandbox workers.
- Non-root user, dropped Linux capabilities, read-only base image.
- Ephemeral workspace mounted for transient files.
- Hardened syscall profile (seccomp) and mandatory access control profile.

### CPU/memory limits

- Cgroup quotas for CPU shares/quota and memory hard limit.
- OOM leads to controlled termination and `SandboxViolation`/`ResourceExceeded` incident.

### Timeout model

- layered timeouts:
  1. queue TTL,
  2. execution timeout,
  3. hard kill grace deadline.
- Exceeding limits triggers kill + incident + telemetry emission.

### File access restrictions

- No host filesystem mounts beyond explicit artifact/temp directories.
- Read/write only to scoped workspace and managed artifact interfaces.
- Secrets only via short-lived scoped injection when policy allows.

### Network restrictions

- Default deny egress.
- Per-tool allowlist for specific endpoints when business-required.
- DNS and outbound traffic logged for forensics.

---

## SECTION 6 — Execution Flow

**Client**
→ sends normalized tool request (`toolId`, `operation`, payload)

**Tool Runtime**
→ authenticates, authorizes, enriches context

**Tool API**
→ forwards request to Universal Execution Engine

**Universal Execution Engine**
→ validates contract
→ resolves tool/version
→ evaluates policy + quotas
→ routes to language adapter

**Language Adapter (Python)**
→ builds worker envelope
→ submits to Python worker manager

**Python Worker (Sandboxed)**
→ executes operation
→ collects metrics/logs/incidents
→ returns normalized output envelope

**Normalized Response**
→ Universal engine emits telemetry + incident hooks
→ returns platform-standard response to client

---

## SECTION 7 — Observability Integration

Integrate with existing runtime monitoring by extending—not replacing—current telemetry model:

- **Tracing:** end-to-end trace with parent/child spans across API, engine, adapter, worker.
- **Metrics:** queue latency, dispatch time, runtime duration, CPU/memory peaks, timeout counts, policy denials.
- **Logs:** structured logs with correlationId, toolId, toolVersion, tenantId, sandboxId.
- **Incidents:** normalized incident taxonomy (`PolicyDenied`, `SandboxViolation`, `DependencyLoadFailure`, `Timeout`, `ResourceExceeded`).
- **SLO dashboards:** per-language and per-tool-class views.
- **Audit:** immutable execution ledger for governance and compliance.

---

## SECTION 8 — Tool Registration Model

Goal: add new Python tools without core platform code changes.

- Declarative `tool.manifest` defines operations, I/O schema, capabilities, limits class, and version.
- Registration service validates:
  - schema conformity,
  - dependency locks,
  - prohibited module usage,
  - capability policy compatibility.
- Approved tool is published to internal registry.
- Runtime resolves by (`toolId`, `version`) from registry metadata.
- New tools onboard through governance workflow, not core runtime edits.

---

## SECTION 9 — Migration Strategy

### Coexistence model (C# + Python)

- Keep existing C# tool path behind same universal contract via `DotNetAdapter`.
- Introduce `PythonAdapter` in parallel.
- Use feature flags for rollout by tenant/tool/category.
- Start with low-risk stateless Python tools (text/json transforms), then expand.

### Phased migration

1. **Phase 0:** Introduce universal contract and adapter abstraction while C# remains primary.
2. **Phase 1:** Deploy Python isolated worker for pilot tools in non-critical domains.
3. **Phase 2:** Enforce governance pipeline and capability policies for all Python tools.
4. **Phase 3:** Scale worker pools, autoscaling policies, and multi-region execution.
5. **Phase 4:** Generalize adapter model for future languages.

### Backward compatibility

- Existing APIs unchanged for clients.
- Response shape remains normalized.
- Incident and metrics model remain centrally unified.

---

## SECTION 10 — FINAL RECOMMENDED ARCHITECTURE

## BEST ARCHITECTURE FOR TOOLNEXUS MULTI-LANGUAGE EXECUTION

**Recommended approach: OPTION E (Hybrid) with OPTION D as the Python execution baseline.**

### Option evaluation summary

- **OPTION A — Embedded Python runtime (Python.NET / IronPython)**
  - **Pros:** lower IPC overhead, simpler local debugging.
  - **Cons:** high host blast radius, weaker isolation, complex runtime embedding risks.
  - **Verdict:** not recommended for production-safe untrusted/multi-tenant workloads.

- **OPTION B — External Python worker process**
  - **Pros:** better isolation than in-process, moderate complexity.
  - **Cons:** weaker boundary than hardened container sandbox; host-level process risks remain.
  - **Verdict:** acceptable transitional pattern, not ideal long-term boundary.

- **OPTION C — Isolated execution worker service**
  - **Pros:** clean separation, independent scaling/deployments.
  - **Cons:** needs strong sandboxing internally; otherwise just moves risk.
  - **Verdict:** good control-plane/data-plane split; pair with container sandboxing.

- **OPTION D — Containerized execution (recommended candidate)**
  - **Pros:** strongest practical isolation, policy-driven resource controls, reproducible runtimes.
  - **Cons:** cold-start overhead and operational complexity.
  - **Verdict:** best security/stability baseline for Python execution.

- **OPTION E — Hybrid strategy**
  - **Pros:** combines service-level orchestration (C) with container isolation (D), plus warm pool tuning for performance.
  - **Cons:** higher architecture complexity requiring strong governance.
  - **Verdict:** best long-term platform evolution path.

### Direct answers to critical analysis questions

1. **In-process or out-of-process?**
   - Out-of-process for Python, always.

2. **Run mechanism?**
   - Isolated worker service using containerized sandboxed workers.

3. **Prevent RCE risks?**
   - No runtime script injection; execute only approved signed tool packages + deny-by-default capabilities.

4. **Enforce permissions and limits?**
   - Central policy engine + per-tool capability manifests + cgroup/container policies.

5. **Prevent memory/CPU abuse?**
   - Hard CPU/memory quotas, execution timeouts, bounded artifact/output sizes, kill-on-violation.

6. **Normalize outputs across languages?**
   - Universal response schema with adapter-level mapping into a single status/incident/metrics contract.

7. **Integrate with existing pipeline?**
   - Insert Universal Execution Engine and language adapters behind existing Tool API; keep client-facing contract stable.

### Long-term maintainability position

- Keep control plane language-agnostic and policy-centric.
- Keep execution data plane isolated, replaceable, and versioned.
- Govern every new capability through registration, review, and staged rollout.
- Treat Python as first implementation of a general multi-language architecture, not a special case.
