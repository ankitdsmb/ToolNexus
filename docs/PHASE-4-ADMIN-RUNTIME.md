# PHASE 4 — Admin Runtime Overlay Plan

Baseline references:
- `docs/PHASE-0-FOUNDATION-LOCK.md`
- `docs/PHASE-3-TOOLSHELL-NORMALIZATION.md`
- `docs/ARCHITECTURE-MASTER-CONTEXT.md`
- `docs/ToolNexus-UI-UX-Platform-Blueprint.md`

Plan intent: design and deliver runtime administration capabilities as **overlay surfaces** on top of the canonical ToolShell, without mutating layout structure or execution lifecycle semantics.

---

## 1) Phase Objective (Strict)

Phase 4 introduces operator-facing runtime controls and observability through admin overlays:
1. Sandbox runtime overlay.
2. Debug console overlay.
3. Live reload overlay.
4. Contract editor panel overlay.

Scope constraints:
- Overlay-only interaction model.
- No ToolShell structural mutation.
- No new execution path creation.
- No authority/governance bypass.
- No client-driven policy decisions.

Out of scope:
- New non-overlay admin pages for runtime controls.
- Per-tool layout variants.
- Execution contract redesign.

---

## 2) Immutable Architecture Constraints

Phase 4 must preserve canonical lifecycle:

Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry

Required guardrails:
1. Overlay interactions may trigger requests, but must flow through existing authority resolver.
2. Overlay actions must create/attach execution snapshot IDs before runtime execution.
3. Conformance validation remains mandatory, including sandbox and reload-triggered runs.
4. Every overlay action emits telemetry evidence (including denied actions and fallback behavior).
5. Runtime identity remains visible and consistent across main shell and overlays.

---

## 3) ToolShell Overlay Contract (No Layout Mutation)

### 3.1 Overlay policy
Admin tools must render as overlays anchored to the existing shell regions (`data-tool-shell` root) while preserving:
- Header
- Context strip
- Left input panel
- Right output panel
- Follow-up action bar

### 3.2 Prohibited behaviors
- No replacement of base shell DOM anchors.
- No panel reflow/reorder.
- No full-page admin detours for runtime actions.
- No hiding/removal of execution status/output regions during admin activity.

### 3.3 Allowed behaviors
- Modal/drawer/side-sheet overlays above shell content.
- Non-destructive dim/backdrop layers.
- Overlay-scoped tabs for sandbox, debug, reload, and contract editing.
- Inline status linkage from overlay actions to canonical status/output areas.

---

## 4) Runtime Admin Overlay Set

All overlays are opened from admin entry points but remain in-shell overlays.

### 4.1 Sandbox Runtime Overlay
Purpose: run capability execution in constrained runtime boundaries for validation and diagnosis.

Required capabilities:
- Runtime profile selection (approved server-defined presets only).
- Resource constraints visibility (cpu/memory/time/network policy profile).
- Snapshot-linked sandbox invocation.
- Policy outcome surface (admitted/denied + reason).
- Fallback disclosure if sandbox adapter unavailable.

Execution rules:
- Sandbox selection is request intent only; server resolves final authority/runtime.
- Denied sandbox attempts remain visible in status/output and telemetry.

### 4.2 Debug Console Overlay
Purpose: inspect execution evidence and runtime diagnostics without changing shell layout.

Required capabilities:
- Correlation ID search/jump.
- Timeline view mapped to canonical lifecycle stages.
- Runtime logs/events stream with severity filtering.
- Governance/conformance evidence view (read-only).
- Export/share diagnostic bundle (subject to policy).

Execution rules:
- Console visibility cannot alter execution outcomes.
- Redaction policy applied server-side before client render.

### 4.3 Live Reload Overlay
Purpose: control safe runtime refresh/rebind actions for tools/capabilities in active workspace context.

Required capabilities:
- Reload scope options (tool UI schema, capability manifest, adapter binding, non-breaking config).
- Preflight conformance check preview.
- Controlled apply action with rollback pointer.
- User-visible warm/cold reload indicator.
- Runtime identity delta display (before/after).

Execution rules:
- Reload requests must run governance and conformance gates.
- Reload failures produce explicit telemetry + incident markers.
- Reload cannot mutate shell structure; only data/state refresh.

### 4.4 Contract Editor Panel Overlay
Purpose: safely edit and validate execution contracts/policies in context.

Required capabilities:
- Contract draft editor with version metadata.
- Structured validation against canonical lifecycle requirements.
- Diff view against active approved contract.
- Promotion workflow integration (Draft → Review → Approved → Active → Deprecated).
- Impact preview on authority resolution and conformance checks.

Execution rules:
- Client edits are proposals only; server enforces authority/governance.
- No contract activation without approved lifecycle state.
- Contract publish/revert actions must emit immutable decision records.

---

## 5) Admin Runtime Data + Persistence Requirements (PostgreSQL)

Phase 4 introduces/extends persisted runtime-admin artifacts. PostgreSQL-only compliance required.

Required persisted entities (UUID IDs):
1. `admin_runtime_sessions`
   - Tracks overlay sessions and actor context.
2. `sandbox_execution_requests`
   - Captures requested sandbox profile, resolved authority/runtime, and outcome.
3. `runtime_reload_events`
   - Captures reload scope, preflight result, apply result, rollback reference.
4. `contract_change_sets`
   - Captures draft changes, validation status, approval lifecycle references.
5. `debug_console_queries`
   - Captures query metadata and access audit events.

Required indexes per entity as applicable:
- `correlation_id`
- `tenant_id`
- execution timestamp fields (`requested_at`, `executed_at`, `validated_at`, `created_at`)

Implementation completeness rule:
- Entity + migration + repository + admin API + telemetry mapping required for each persisted artifact.

---

## 6) API and Service Integration Requirements

### 6.1 Backend services
Required service layer extensions:
- `AdminRuntimeOrchestrator` (coordinates overlay requests through canonical execution pipeline).
- `SandboxRuntimeService`.
- `RuntimeDebugEvidenceService`.
- `LiveReloadGovernanceService`.
- `ContractLifecycleService` integration for editor workflow.

### 6.2 API surface
Required endpoints (illustrative naming):
- `POST /api/admin/runtime/sandbox/execute`
- `GET /api/admin/runtime/debug/events`
- `POST /api/admin/runtime/reload/apply`
- `POST /api/admin/runtime/contracts/validate`
- `POST /api/admin/runtime/contracts/promote`

API rules:
- All actions server-authorized.
- No client authority or policy override fields accepted.
- Correlation IDs mandatory for mutating operations.

### 6.3 Frontend integration
- Admin overlay launcher bound to canonical ToolShell surfaces.
- Overlay state isolated from input form stability.
- Output/status panels reflect overlay-triggered execution evidence.
- Contract editor validation feedback rendered in overlay, with result evidence mirrored to output panel.

---

## 7) Telemetry + Observability Contract

Every overlay-related execution event must emit:
- authority
- language
- capability
- execution snapshot ID
- conformance metadata
- runtime identity
- overlay type (`sandbox`, `debug-console`, `live-reload`, `contract-editor`)
- decision outcome (`admitted`, `denied`, `failed`, `fallback`)

Additional requirements:
- No silent fallback paths.
- Overlay open/close actions logged for audit context.
- Denied/failed actions visible in admin ledger and runtime status surfaces.

---

## 8) UX Behavior Rules (Execution-First)

1. Overlay open must not shift shell anchors or panel dimensions.
2. Input panel remains structurally stable while overlay actions run.
3. Execution dynamics appear in status/output regions; overlay can provide controls and drill-down only.
4. Follow-up actions remain available unless blocked by explicit policy state.
5. Overlay interactions must preserve keyboard accessibility and focus return.

---

## 9) Security + Governance Controls

1. Role-based admin authorization for each overlay action.
2. Server-side policy evaluation on sandbox/reload/contract mutation requests.
3. Immutable governance decision linkage for contract promotions and reload applies.
4. Audit trails for debug evidence access (who/when/what scope).
5. Sensitive payload redaction before frontend delivery.

---

## 10) Implementation Sequence

### Stage A — Overlay Foundation
1. Implement shared `AdminRuntimeOverlayHost` bound to canonical ToolShell root.
2. Add overlay routing/state model without structural shell mutation.
3. Add telemetry scaffolding for overlay lifecycle events.

### Stage B — Sandbox + Debug
1. Implement sandbox request workflow through canonical execution pipeline.
2. Implement debug evidence query/read path with audit logging.
3. Wire status/output visibility for admitted/denied/failed/fallback outcomes.

### Stage C — Live Reload + Contract Editor
1. Implement live reload orchestration with preflight and rollback metadata.
2. Implement contract editor validation + lifecycle promotion APIs.
3. Persist artifacts and governance records in PostgreSQL.

### Stage D — Conformance + Hardening
1. Enforce no-layout-mutation checks in browser tests.
2. Validate telemetry completeness for all overlay operations.
3. Validate governance and conformance gates on all mutating actions.

---

## 11) Acceptance Criteria

Phase 4 passes only when all conditions are true:

1. All four admin tools exist as overlays (sandbox, debug console, live reload, contract editor panel).
2. Canonical ToolShell structure remains unchanged during overlay use.
3. All overlay-triggered operations preserve canonical execution lifecycle sequence.
4. Governance/authority decisions remain server-side and auditable.
5. PostgreSQL persistence exists for runtime-admin artifacts with required indexes.
6. Admin UI exposes runtime concepts and outcomes (including denied/fallback paths).
7. Telemetry includes required execution and runtime identity fields for every overlay operation.
8. Unit, integration, runtime, and browser checks pass for overlay behavior and lifecycle integrity.

---

## 12) Validation Matrix

| Area | Validation method | Pass condition |
|---|---|---|
| Overlay conformance | Browser DOM checks | Overlay opens/closes without shell anchor mutation |
| Lifecycle integrity | Execution trace verification | Request→Authority→Snapshot→Execution→Conformance→Telemetry preserved |
| Governance controls | API integration tests | Client cannot override authority/policy; server decisions audited |
| Persistence | Migration/repository tests | PostgreSQL entities + indexes + repositories operational |
| Telemetry completeness | Event schema assertions | Required fields emitted for all overlay actions |
| Admin visibility | UI tests/manual evidence | Sandbox/debug/reload/contract outcomes visible in admin surfaces |

---

## 13) Risks and Mitigations

1. **Risk:** overlay code leaks into layout mutation.  
   **Mitigation:** enforce anchor immutability tests + CSS constraints.

2. **Risk:** reload path bypasses conformance under urgency flows.  
   **Mitigation:** centralized orchestrator requiring conformance gate for every apply.

3. **Risk:** debug console exposes sensitive data.  
   **Mitigation:** server-side redaction and role-based scope filtering.

4. **Risk:** contract editor appears authoritative client-side.  
   **Mitigation:** explicit proposal model and server-side lifecycle enforcement.

---

## 14) Deliverables

1. Phase 4 admin runtime design plan (this document).
2. Overlay architecture specification and component contract.
3. PostgreSQL persistence design for runtime-admin artifacts.
4. API + telemetry contract updates.
5. Test plan covering unit/integration/runtime/browser no-layout-mutation checks.

---

## 15) Architecture Alignment Confirmation

Phase 4 is architecture-aligned with Phase 0 and Phase 3:
- ToolShell structure remains immutable.
- Admin runtime tooling is overlay-based only.
- Canonical execution lifecycle is preserved.
- Governance and authority remain server-side and auditable.
- Telemetry and admin visibility requirements remain explicit.

This phase extends runtime operability without introducing architectural drift.
