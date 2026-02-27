# PHASE 6 — Suggestion Engine Implementation Plan

Baseline references:
- `docs/PHASE-0-FOUNDATION-LOCK.md`
- `docs/PHASE-5-AI-GENERATION.md`
- `docs/ARCHITECTURE-MASTER-CONTEXT.md`
- `docs/ToolNexus-UI-UX-Platform-Blueprint.md`

Plan intent: add governed, auditable post-generation guidance for AI capability packages through runtime inspection, contract suggestions, JSON patch updates, and admin approval flow without creating side execution paths.

---

## 1) Phase Objective (Strict)

Phase 6 introduces the Suggestion Engine as an admin-governed extension for Draft AI capability packages with four pillars:
1. Runtime inspection.
2. Contract suggestions.
3. JSON patch updates.
4. Admin approval flow.

Scope constraints:
- No bypass of canonical lifecycle.
- No client-side authority decisions.
- No ToolShell structure mutation.
- All decisions persisted and telemetry-visible.

Out of scope:
- Direct publish-to-active on suggestion acceptance.
- Un-audited mutable contract edits.
- Client-defined policy authority payloads.

---

## 2) Canonical Lifecycle Compliance

Every Suggestion Engine operation remains anchored to:

Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry.

Guardrails:
1. Inspection and suggestion APIs consume intent only; server resolves authority and governance context.
2. Contract mutation is constrained to JSON patch operations that are re-validated as conformance gates.
3. Approval flow is separate from capability activation; it only advances draft governance state.
4. Runtime fallback behavior and suggestion auto-application must emit telemetry.

---

## 3) Runtime Inspection

### 3.1 Purpose
Provide deterministic structural checks over draft package runtime composition so admin can verify platform fit before approval.

### 3.2 Inspection checks
- Runtime language identity (`auto|dotnet|python|...`) presence.
- ToolShell view contract adherence (`ui.viewName == ToolShell`).
- Presence of expected virtual files (`tool.js`, `template.html`, `styles.css`, optional `logic.js`).
- Basic runtime safety indicators tied to execution model (no forbidden runtime-side patterns).

### 3.3 Result contract
Inspection output includes:
- `slug`
- `runtimeLanguage`
- `usesToolShell`
- `hasTemplateFile`
- `hasStylesFile`
- `hasLogicModule`
- findings list

---

## 4) Contract Suggestions

### 4.1 Purpose
Generate deterministic server-side suggestions to close architecture and governance gaps in draft contracts.

### 4.2 Suggestion categories
- **Layout contract:** force ToolShell view binding.
- **Authority contract:** enforce `ShadowOnly` for early governance safety.
- **Artifact completeness:** suggest template/style virtual files if missing.
- **Conformance quality:** add low-risk defaults to reduce review churn.

### 4.3 Suggestion contract
Each suggestion includes:
- `code`
- `severity`
- `message`
- `jsonPointerPath`
- `suggestedValue`

---

## 5) JSON Patch Updates

### 5.1 Purpose
Allow controlled contract mutation through auditable RFC6902-style patch operations.

### 5.2 Operation policy
Supported operations:
- `add`
- `replace`
- `remove`

Rules:
- patch paths must be JSON pointer paths.
- resulting payload must pass full package validation.
- approved drafts cannot be patched.
- every patch update increments version for optimistic concurrency.

### 5.3 Persistence and evidence
Patch request captures:
- correlationId
- tenantId
- requester identity
- pre/post version
- resulting payload hash (future telemetry extension)

---

## 6) Admin Approval Flow

### 6.1 Purpose
Make draft progression auditable with explicit operator control.

### 6.2 State machine
`Draft -> PendingApproval -> Approved|Rejected`

Rules:
- submission allowed from Draft/Rejected.
- decision allowed only from PendingApproval.
- approved record becomes immutable for patch operations.
- approval metadata persisted (`approvedBy`, `approvedAtUtc`, `comment`).

### 6.3 Admin UI exposure
Admin UI must expose:
- inspection output
- suggestion list
- patch apply action
- submit-for-approval action
- approve/reject actions
- current approval status + audit metadata

---

## 7) API Contract

Endpoints:
- `GET /admin/ai-capability-factory/import/{slug}/runtime-inspection`
- `GET /admin/ai-capability-factory/import/{slug}/suggestions`
- `POST /admin/ai-capability-factory/import/{slug}/patch`
- `POST /admin/ai-capability-factory/import/{slug}/submit-approval`
- `POST /admin/ai-capability-factory/import/{slug}/decision`

API rules:
- mutating endpoints require admin write policy.
- correlation/tenant are required for mutating operations.
- authority fields from client are ignored/rejected.

---

## 8) PostgreSQL Persistence Requirements

`AiToolPackages` extension fields:
- `approval_status`
- `last_approval_comment`
- `approved_by`
- `approved_at_utc`

Indexes:
- `correlation_id`
- `tenant_id`
- execution timestamp indexes remain in place (`created_utc`, composite correlation/tenant + created).

---

## 9) Telemetry Contract

Each Suggestion Engine action emits:
- authority
- language
- capability
- execution snapshot id (if bound to generation run)
- conformance metadata
- runtime identity
- suggestion count
- patch operation count
- approval transition

No silent path is allowed.

---

## 10) Testing Requirements

Mandatory coverage:
- unit tests for suggestion generation and approval transitions.
- unit tests for patch validation and optimistic concurrency behavior.
- integration tests for API contract routes and policy guarding.
- browser/admin tests for visibility of runtime inspection and approval actions.

---

## 11) Done Criteria

Phase 6 is complete only when all exist:
- backend implementation
- API integration
- PostgreSQL persistence + migration
- admin UI visibility
- telemetry hooks
- configuration alignment
- tests
- documentation

Any missing layer is considered incomplete.
