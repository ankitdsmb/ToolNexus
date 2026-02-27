# PHASE 3 — ToolShell Normalization Plan

Baseline references:
- `docs/PHASE-0-FOUNDATION-LOCK.md`
- `docs/PHASE-2-REFRESH-DESIGN-PLAN.md`
- `docs/ARCHITECTURE-MASTER-CONTEXT.md`
- `docs/ToolNexus-UI-UX-Platform-Blueprint.md`

Plan intent: normalize runtime and legacy tool layouts into one immutable ToolShell anchor contract **without feature changes** and **without execution lifecycle changes**.

---

## 1) Phase Objective (Strict)

Phase 3 closes structural drift by enforcing one canonical ToolShell anchor model across all runtime-visible tool surfaces.

Scope constraints:
1. Structural alignment only.
2. No changes to execution features, capabilities, governance logic, or runtime semantics.
3. No new execution paths.
4. No UI paradigm changes beyond anchor normalization.

Out of scope:
- new tool functionality
- runtime behavior redesign
- policy/authority redesign
- telemetry schema redesign
- shell visual redesign.

---

## 2) Canonical ToolShell Anchor Contract (Required)

Every runtime ToolShell surface must include the following immutable anchors:

1. `data-tool-shell`
2. `data-tool-context`
3. `data-tool-input`
4. `data-tool-status`
5. `data-tool-output`
6. `data-tool-followup`

Rules:
- Anchors are mandatory and explicit in rendered DOM.
- Anchor order must preserve the immutable shell structure.
- Anchors must not be synthesized post-render as a primary conformance strategy.
- Legacy aliases may map into canonical anchors only as migration compatibility, not as contract replacement.

---

## 3) Normalization Targets

### 3.1 Primary runtime route
Normalize `ToolShell` route DOM to canonical anchors as first-class regions.

Expected structure:
1. Header (existing global/app chrome)
2. Context strip (`data-tool-context`)
3. Workspace:
   - input panel (`data-tool-input`)
   - status region (`data-tool-status`)
   - output panel (`data-tool-output`)
4. Follow-up action bar (`data-tool-followup`)

### 3.2 Legacy layout artifacts
Legacy runtime-capable templates/pages that still use non-canonical markers (e.g., `data-tool-root`, `data-tool-body`, `data-tool-actions`) must be normalized into the canonical anchor set.

Normalization policy:
- Preserve existing tool behavior.
- Rebind structural markers to canonical names/regions.
- Remove parallel shell semantics from legacy pages.
- Keep compatibility shims temporary and observable.

### 3.3 Runtime contract enforcement files
Runtime DOM contract validators/adapters must treat canonical anchors as source of truth and classify missing anchors as conformance failures.

Migration-safe behavior:
- During transition, allow legacy-to-canonical remap with explicit telemetry/diagnostics.
- After normalization completion, fail fast on missing canonical anchors in runtime paths.

---

## 4) Legacy-to-Canonical Mapping Matrix

| Legacy marker/pattern | Canonical anchor | Normalization rule |
|---|---|---|
| `data-tool-root` | `data-tool-shell` | Shell wrapper identity migrates to canonical shell anchor. |
| Distributed metadata blocks | `data-tool-context` | Consolidate execution identity/governance capsules into context strip region. |
| `data-tool-input` (existing) | `data-tool-input` | Keep and align to canonical panel semantics. |
| Action/status mixed regions | `data-tool-status` | Split lifecycle/status evidence into dedicated status region. |
| `data-tool-output` (existing) | `data-tool-output` | Keep and align to canonical output region semantics. |
| `data-tool-actions` | `data-tool-followup` | Reclassify continuation actions as follow-up bar anchor. |

Notes:
- Mapping is structural, not behavioral.
- Execution APIs, payload contracts, and backend orchestration remain unchanged.

---

## 5) Execution Contract Protection

Phase 3 must preserve canonical lifecycle:

Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry

Guardrails:
- No client authority inference.
- No bypass of server governance.
- No skipped conformance evidence.
- No suppression of denied/failed/fallback visibility.

Normalization is complete only if structural changes do not alter lifecycle wiring.

---

## 6) Implementation Sequence

### Stage A — Anchor Presence Hardening
1. Add/confirm required anchors in primary ToolShell DOM.
2. Add/confirm dedicated context, status, and follow-up regions.
3. Preserve current input/output behavior.

### Stage B — Legacy Surface Normalization
1. Inventory legacy pages/templates that still expose runtime layout semantics.
2. Apply canonical anchor mapping.
3. Remove duplicate/parallel shell structural roles.

### Stage C — Contract/Adapter Alignment
1. Update DOM contract source-of-truth to canonical anchors.
2. Restrict adapter behavior to compatibility mapping only.
3. Emit diagnostics for any runtime alias recovery path.

### Stage D — Conformance Validation
1. Validate anchor presence/order on all runtime tool routes.
2. Validate status/follow-up separation remains stable during execution transitions.
3. Validate no lifecycle or governance behavior drift.

---

## 7) Acceptance Criteria

Phase 3 passes only when all are true:

1. All six required anchors exist on runtime ToolShell surfaces.
2. Legacy runtime layouts are structurally normalized into canonical ToolShell anchors.
3. No per-tool alternate shell composition remains in active runtime path.
4. Execution lifecycle semantics remain unchanged.
5. Governance, conformance, and telemetry visibility remain explicit in output/status surfaces.
6. Changes are structural-only; no new capability features introduced.

---

## 8) Validation Matrix

| Area | Validation method | Pass condition |
|---|---|---|
| Anchor presence | DOM contract checks | All required canonical anchors present |
| Anchor order | Browser/runtime check | Shell order stable and immutable |
| Legacy normalization | Template/view audit | Legacy structural markers mapped to canonical anchors |
| Lifecycle protection | Execution trace comparison | No lifecycle sequence changes |
| Governance visibility | Denied/success/failure runs | Authority and policy outcomes remain visible |
| Structural-only scope | Diff audit | No feature/API behavior changes |

---

## 9) Risks and Mitigations

1. **Risk:** legacy adapters hide missing canonical anchors.  
   **Mitigation:** require diagnostics + fail-fast after migration window.

2. **Risk:** action/status mixing persists under old CSS/markup assumptions.  
   **Mitigation:** explicit separation contract for `data-tool-status` and `data-tool-followup`.

3. **Risk:** structural edits accidentally alter runtime behavior.  
   **Mitigation:** strict regression checks on execution lifecycle and tool outputs.

---

## 10) Deliverables

1. Phase 3 normalization plan (this document).
2. Canonical ToolShell anchor checklist update.
3. Legacy-to-canonical mapping implementation checklist.
4. Validation report proving structural-only alignment.

---

## 11) Architecture Alignment Confirmation

This plan is aligned with Phase 0 and Phase 2 constraints:
- Immutable ToolShell structure preserved.
- Canonical lifecycle preserved.
- Governance boundary preserved.
- Telemetry/conformance observability preserved.

Phase 3 is a **normalization and conformance closure phase** focused on structural alignment only.
