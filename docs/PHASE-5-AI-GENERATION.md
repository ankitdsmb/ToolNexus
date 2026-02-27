# PHASE 5 — AI Tool Generation Implementation Plan

Baseline references:
- `docs/PHASE-0-FOUNDATION-LOCK.md`
- `docs/PHASE-4-ADMIN-RUNTIME.md`
- `docs/ARCHITECTURE-MASTER-CONTEXT.md`
- `docs/ToolNexus-UI-UX-Platform-Blueprint.md`
- `docs/architecture/AI-CAPABILITY-FACTORY.md`
- `docs/architecture/execution-ledger.md`
- `docs/architecture/EXECUTION-GOVERNANCE-LAYER.md`

Plan intent: add AI-assisted capability generation as a governed runtime feature that stays inside the canonical execution lifecycle and is fully observable, persisted in PostgreSQL, and visible in admin surfaces.

---

## 1) Phase Objective (Strict)

Phase 5 introduces AI generation as a first-class platform workflow with four implementation pillars:
1. Tool generation flow.
2. Duplicate detection.
3. Contract generation.
4. Prompt system integration.

Scope constraints:
- No new execution path creation.
- Generation requests must run through canonical lifecycle.
- No client authority/policy override.
- No ToolShell layout mutation.
- Generation outcomes must be persisted and auditable.

Out of scope:
- Client-side authority logic.
- Bypassing conformance validation for generated artifacts.
- In-memory-only generation records.

---

## 2) Immutable Architecture Constraints

Canonical lifecycle remains mandatory for generation:

Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry

Guardrails:
1. Generation API accepts request intent only; authority/runtime are server-resolved.
2. Every generation attempt creates an execution snapshot ID before runtime invocation.
3. Contract and duplicate checks are conformance gates, not optional post-processing.
4. Runtime fallback (model/router/provider fallback) must be telemetry-visible.
5. Generated capability artifacts are linked to governance decisions and execution evidence.

---

## 3) End-to-End Tool Generation Flow

### 3.1 Flow summary

1. **Request intake**
   - Admin or authorized capability-author submits generation intent (`name`, `problem statement`, `target language/runtime hints`, optional seed schema).
   - API enforces authentication/authorization, sets correlation ID, and ignores any client authority fields.

2. **Authority + governance resolution**
   - Server resolves `ExecutionAuthority` and policy admissibility.
   - Governance decision reference is recorded.
   - Denied requests still persist attempt record and telemetry.

3. **Execution snapshot freeze**
   - Snapshot includes capability context, approved runtime identity, prompt template version, and contract strategy version.
   - Snapshot ID becomes the immutable trace root for all downstream records.

4. **AI runtime execution**
   - Prompt assembly uses server-controlled template registry + variable binding.
   - Model invocation executes through runtime adapter abstraction (no provider-specific leakage into controllers).
   - Output includes generated manifest draft, input/output schema proposal, and implementation scaffold metadata.

5. **Conformance validation**
   - Duplicate detector checks semantic + structural collisions.
   - Contract generator/validator enforces schema integrity and lifecycle compatibility.
   - Policy checks verify lifecycle constraints (`Draft -> Review` only on generation).

6. **Persistence + publication**
   - Generation run, candidate tool, duplicate findings, contract revisions, and prompt evidence persist to PostgreSQL.
   - Accepted candidates are promoted through governance workflow, not direct activation.

7. **Telemetry + admin visibility**
   - Emit execution telemetry with authority, runtime identity, capability, snapshot ID, conformance metadata, fallback status.
   - Admin runtime surfaces display run details, duplicate rationale, contract diff, and prompt lineage.

### 3.2 Required backend components

- `AiToolGenerationOrchestrator` (application service)
- `IToolDuplicateDetector` + strategy implementations
- `IToolContractGenerator` + `IToolContractValidator`
- `IPromptTemplateRegistry` + `IPromptAssemblyService`
- `IAiGenerationRepository` (PostgreSQL)
- `IAiGenerationTelemetryService`

All components plug into existing execution engine and never create side pipelines.

---

## 4) Duplicate Detection Design

### 4.1 Detection goals

Prevent introducing redundant capabilities that fragment governance, telemetry, and user trust.

### 4.2 Detection dimensions

1. **Identity collision**
   - Exact/normalized name slug conflicts.
   - Manifest identity key conflicts.

2. **Contract collision**
   - High overlap in input/output schema signatures.
   - Equivalent operation signature with different label.

3. **Behavioral/semantic collision**
   - Embedding similarity over capability description + examples.
   - Existing execution intent cluster match above threshold.

4. **Runtime-correlation collision**
   - Same runtime adapter + same core function + similar policy profile.

### 4.3 Decision model

Outcome tiers:
- `NONE` (no conflict)
- `POTENTIAL` (human review required)
- `BLOCKING` (generation promotion denied)

Rules:
- `BLOCKING` prevents promotion to `Review`.
- `POTENTIAL` requires explicit admin adjudication with audit comment.
- All outcomes persisted and linked to snapshot ID + governance decision.

### 4.4 Persistence contract (PostgreSQL)

Tables:
- `ai_generation_duplicate_checks`
- `ai_generation_duplicate_matches`

Required indexes:
- `tenant_id`
- `correlation_id`
- `execution_snapshot_id`
- `created_at_utc`

---

## 5) Contract Generation Design

### 5.1 Contract outputs

Each generation run must produce:
1. Capability manifest draft.
2. Input schema (JSON schema or equivalent typed contract).
3. Output schema.
4. Runtime constraints and validation rules.
5. Conformance policy metadata.

### 5.2 Contract quality gates

Mandatory gates before persistence as promotable artifact:
- Schema parse/validation pass.
- Required fields present and typed.
- Backward compatibility check for updates to existing capability key.
- Governance compatibility (`Draft` lifecycle only for first publish).
- Runtime adapter compatibility (declared runtime exists and is admitted).

### 5.3 Lifecycle integration

- Generated contracts start in `Draft`.
- Promotion path: `Draft -> Review -> Approved -> Active`.
- Promotion to `Active` requires governance approval record and conformance evidence.

### 5.4 Persistence contract (PostgreSQL)

Tables:
- `ai_generation_contract_drafts`
- `ai_generation_contract_validations`
- `ai_generation_contract_promotions`

Required indexes:
- `tenant_id`
- `correlation_id`
- `execution_snapshot_id`
- `validated_at_utc` / `promoted_at_utc`

---

## 6) Prompt System Integration

### 6.1 Prompt architecture

Prompting is server-governed and versioned.

Core parts:
- Prompt template registry (immutable versioned templates).
- Context binder (capability intent + governance constraints + runtime rules).
- Safety/normalization layer (redaction, token budgeting, policy clauses).
- Prompt evidence recorder.

### 6.2 Prompt assembly contract

Input sources:
- platform system prompt (`docs/ai/AI-SYSTEM-PROMPT.md` lineage)
- capability-generation template
- tenant-safe contextual inserts
- execution policy clauses

Output record fields:
- `template_id`, `template_version`
- `prompt_hash`
- `prompt_sections`
- `runtime_provider`
- `model_identity`

### 6.3 Security + governance constraints

- No raw admin secrets or policy internals in generated prompt payloads.
- Template selection server-side only.
- Prompt override by client disallowed; only approved parameter slots accepted.
- Prompt and completion evidence are redacted before UI exposure.

### 6.4 Persistence contract (PostgreSQL)

Tables:
- `ai_generation_prompt_runs`
- `ai_generation_prompt_artifacts`

Required indexes:
- `tenant_id`
- `correlation_id`
- `execution_snapshot_id`
- `created_at_utc`

---

## 7) API Integration Contract

### 7.1 Endpoints

- `POST /api/admin/ai-generation/runs`
  - Starts a governed generation run.
- `GET /api/admin/ai-generation/runs/{runId}`
  - Returns lifecycle + telemetry-visible status.
- `GET /api/admin/ai-generation/runs/{runId}/duplicates`
  - Returns duplicate analysis evidence.
- `GET /api/admin/ai-generation/runs/{runId}/contracts`
  - Returns contract drafts and validation reports.
- `POST /api/admin/ai-generation/runs/{runId}/promote`
  - Submits governance promotion intent.
- `GET /api/admin/ai-generation/prompts/{runId}`
  - Returns redacted prompt lineage and template metadata.

### 7.2 API rules

- Correlation ID required for all mutating endpoints.
- Tenant scoping mandatory.
- Authority/policy fields in payload are ignored/rejected.
- Every response includes execution snapshot ID where available.

---

## 8) Admin UI Visibility (Runtime Concept Completeness)

Admin surfaces must expose:
1. Generation run ledger (status, authority, runtime identity, snapshot ID).
2. Duplicate detection panel (matches, confidence, adjudication state).
3. Contract generation panel (drafts, validation errors, promotion state).
4. Prompt lineage panel (template/version/hash, redacted sections).

UX rules:
- Implement as overlay/workspace content that respects immutable ToolShell layout.
- Input configuration remains stable during execution.
- Execution dynamics and status remain visible in output panel.

---

## 9) Telemetry + Observability Contract

Every generation-related execution event emits:
- authority
- language
- capability
- execution snapshot ID
- conformance metadata
- runtime identity
- generation run ID
- duplicate outcome
- contract validation outcome
- prompt template/version
- fallback usage and reason (if any)

Additional requirements:
- denied and failed runs are first-class telemetry events.
- no silent retries/fallbacks.
- metrics must support per-tenant and per-capability trend analysis.

---

## 10) Configuration Controls

Configuration must be explicit, auditable, and environment-scoped:

- `AiGeneration:Enabled`
- `AiGeneration:AllowedRuntimes`
- `AiGeneration:DuplicateThresholds`
- `AiGeneration:PromptTemplatePolicy`
- `AiGeneration:ContractValidation:StrictMode`
- `AiGeneration:Telemetry:EmitPromptHashes`

Rules:
- No hardcoded UI feature flags.
- Changes via server configuration with admin audit trail.

---

## 11) PostgreSQL Persistence + Migration Requirements

### 11.1 Entities

Required entities:
- `AiGenerationRun`
- `AiGenerationDuplicateCheck`
- `AiGenerationDuplicateMatch`
- `AiGenerationContractDraft`
- `AiGenerationContractValidation`
- `AiGenerationContractPromotion`
- `AiGenerationPromptRun`
- `AiGenerationPromptArtifact`

### 11.2 Migration constraints

- PostgreSQL syntax only.
- UUID primary keys.
- FK linkages to execution snapshot and governance decision domains.
- Indexes required on `tenant_id`, `correlation_id`, and execution timestamps.
- Add query-path indexes for admin ledger filtering (`status`, `capability_key`).

### 11.3 Repository requirements

- Query by run ID, snapshot ID, correlation ID, tenant ID.
- Paginated ledger retrieval for admin surfaces.
- Atomic write boundaries for run + telemetry evidence linkage.

---

## 12) Testing Matrix (Zero Half-Integration)

### 12.1 Unit tests

- prompt assembly determinism and redaction behavior.
- duplicate detector scoring and threshold classification.
- contract generation and validation edge cases.
- governance gate transitions.

### 12.2 Integration tests

- API request -> authority resolution -> snapshot creation -> runtime -> conformance -> telemetry.
- PostgreSQL persistence verification for all generation artifacts.
- denied/fallback paths with telemetry evidence assertions.

### 12.3 Runtime tests

- execution engine conformance under generation workload.
- fallback/runtime adapter behavior with observability assertions.

### 12.4 Browser tests

- admin UI visibility for run ledger, duplicate panel, contract panel, prompt panel.
- no ToolShell structure mutation while generation workflow is active.

### 12.5 Acceptance gate

Phase 5 is incomplete if any of backend/API/persistence/admin UI/telemetry/config/tests/docs are missing.

---

## 13) Implementation Sequence

### Stage A — Generation Core
1. Add `AiToolGenerationOrchestrator` wired to canonical execution pipeline.
2. Add run lifecycle domain + persistence + repository.
3. Add telemetry scaffolding and run ledger API.

### Stage B — Duplicate Detection
1. Add detector interfaces and baseline strategies.
2. Persist duplicate checks/matches.
3. Add admin review API/UI and governance adjudication flow.

### Stage C — Contract Generation
1. Add contract draft generator and validator services.
2. Persist contract artifacts/validation reports.
3. Add promotion endpoint with governance link enforcement.

### Stage D — Prompt Integration
1. Add template registry and prompt assembly service.
2. Add prompt evidence persistence with redaction.
3. Expose prompt lineage in admin UI.

### Stage E — Hardening + Conformance
1. Enforce full lifecycle trace checks in integration tests.
2. Enforce no-layout-mutation browser checks.
3. Validate telemetry schema completeness and fallback visibility.

---

## 14) Acceptance Criteria

Phase 5 passes only when all are true:

1. Tool generation flow is fully implemented through canonical execution lifecycle.
2. Duplicate detection produces persisted, auditable outcomes with adjudication controls.
3. Contract generation + validation + lifecycle promotion are implemented and governed.
4. Prompt system integration is server-controlled, versioned, redacted, and observable.
5. PostgreSQL entities/migrations/repositories exist with required UUIDs and indexes.
6. Admin UI exposes all runtime concepts and outcomes, including denied/fallback states.
7. Telemetry emits required execution identity and conformance fields for all operations.
8. Unit, integration, runtime, and browser tests exist and pass for phase scope.

---

## 15) Architecture Alignment Confirmation

Phase 5 is architecture-aligned with Phase 0 and Phase 4:
- It preserves immutable ToolShell structure.
- It preserves canonical execution lifecycle without side paths.
- It keeps authority/governance server-side and auditable.
- It enforces PostgreSQL-only persistence with execution evidence indexing.
- It maintains admin visibility and telemetry completeness as non-optional platform requirements.
