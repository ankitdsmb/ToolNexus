# PHASE 2 — Refresh Design Plan

Baseline references:
- `docs/PHASE-0-FOUNDATION-LOCK.md`
- `docs/PHASE-1-CURRENT-SYSTEM-AUDIT.md`
- `docs/ARCHITECTURE-MASTER-CONTEXT.md`
- `docs/ToolNexus-UI-UX-Platform-Blueprint.md`

Plan intent: refresh visual quality and execution clarity **without changing ToolShell architecture, lifecycle semantics, or governance pathways**.

---

## 1) Phase Objective (Constrained)

Phase 2 is a UI refresh and conformance-oriented polish phase with strict boundaries:

1. Keep immutable ToolShell structure:
   - Header
   - Context Strip
   - Left Input Panel
   - Right Output Panel
   - Follow-up Action Bar
2. Keep canonical execution lifecycle unchanged:
   - Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry
3. Do not introduce new execution branches, client-side authority paths, or lifecycle shortcuts.
4. Improve usability by visual refinement, density tuning, spacing normalization, and clearer execution visibility.

Out of scope:
- architectural redesign
- runtime pipeline redesign
- governance model changes
- new layout paradigms.

---

## 2) Design Principles for Refresh

1. **Structure is fixed, presentation is refined.**
2. **Execution visibility over decorative styling.**
3. **High-density, developer-first readability.**
4. **Consistent spacing tokens and rhythm across all tool surfaces.**
5. **No per-tool visual divergence at shell level.**
6. **Status/follow-up semantics must remain obvious and persistent.**

---

## 3) Workstreams

## 3.1 Visual Improvements

Goal: modernize look-and-feel while preserving platform identity and shell invariants.

### Scope
- Normalize typography scale across ToolShell regions.
- Harden contrast and semantic color usage for execution states.
- Unify border, elevation, and surface treatment for input/output containers.
- Standardize control styling (buttons, selects, text areas, status pills).
- Remove legacy per-tool styling artifacts from runtime-visible paths.

### Required outputs
- Centralized design token updates (color, type, radius, shadows, state colors).
- Shared component-level style rules for ToolShell sections.
- Style governance checklist to prevent inline/per-tool drift.

### Guardrails
- No region reorder/removal.
- No tool-specific shell skins.
- No dynamic styling logic that causes mount-time geometry shifts.

---

## 3.2 Density Improvements

Goal: increase information throughput without reducing scanability.

### Scope
- Reduce oversized paddings/margins in input and output cards.
- Compact form controls and metadata rows while maintaining accessibility.
- Introduce tighter, consistent vertical rhythm for logs, status lines, and context capsules.
- Improve output panel data density (events, telemetry hints, runtime metadata).

### Required outputs
- Density modes definition (default + compact-safe baseline).
- Tokenized spacing/line-height matrix for dense execution views.
- Before/after density validation against key tool flows.

### Guardrails
- No hidden critical execution information.
- No collapsing of required context strip data.
- Maintain keyboard and screen-reader usability.

---

## 3.3 Spacing Corrections

Goal: remove ad hoc spacing drift and enforce a predictable layout rhythm.

### Scope
- Replace inconsistent local margins/gaps with shared spacing tokens.
- Align panel internals to a single spacing grid.
- Correct follow-up bar spacing so it remains visually distinct yet integrated.
- Ensure status and context elements align to stable anchor boundaries.

### Required outputs
- Canonical spacing scale (e.g., `xs/sm/md/lg/xl`) with exact pixel rem mapping.
- Region-by-region spacing spec (header/context/input/output/follow-up).
- Drift audit checklist for future PR review.

### Guardrails
- No DOM mutation-based spacing repair.
- No runtime-injected wrappers that change geometry post-render.

---

## 3.4 Execution Visibility Improvements

Goal: make lifecycle state and governance evidence immediately visible inside existing shell regions.

### Scope
- Strengthen context strip as a concise execution identity surface (capability, authority, runtime, correlation).
- Improve output panel status hierarchy for lifecycle phases.
- Keep conformance and telemetry outcomes visually explicit in output artifacts.
- Improve follow-up action clarity (rerun, iterate, inspect evidence).

### Required outputs
- Lifecycle state presentation model mapped 1:1 to canonical phases.
- Status vocabulary standardization (`queued`, `resolving authority`, `snapshot frozen`, `executing`, `validating conformance`, `telemetry recorded`, `completed/failed/denied`).
- Evidence-facing UI spec for governance/conformance telemetry visibility.

### Guardrails
- No fake/optimistic status that bypasses backend truth.
- No client-side authority inference.
- No hiding denied/failed/policy-blocked outcomes.

---

## 4) Conformance Hardening Dependencies (From Phase 1 Failures)

These dependencies must be addressed in parallel or before final Phase 2 sign-off:

1. Unify ToolShell contract source of truth (constitution anchors vs runtime validator).
2. Guarantee conformance + telemetry visibility across all terminal execution outcomes.
3. Remove/contain legacy layout and per-tool CSS branching from active runtime path.
4. Reduce mount-time instability from broad mutation/alias strategies.

Note: these are not lifecycle redesign items; they are conformance closures required for refresh credibility.

---

## 5) Implementation Sequencing

### Stage A — Foundation Styling Alignment
- Define/refine tokens (color, typography, spacing, surface).
- Remove inline/per-tool CSS debt in runtime-visible surfaces.
- Establish shared ToolShell region style contracts.

### Stage B — Density + Spacing Rollout
- Apply compact spacing rhythm to input/output internals.
- Normalize control heights and metadata row packing.
- Validate no structural movement during execution transitions.

### Stage C — Execution Visibility Pass
- Finalize context strip information hierarchy.
- Standardize phase/status display in output panel.
- Clarify follow-up actions with consistent affordances.

### Stage D — Conformance Validation
- Verify ToolShell anchors remain immutable and complete.
- Verify lifecycle labels map exactly to backend pipeline stages.
- Verify denied/fallback/error outcomes remain observable.

---

## 6) Acceptance Criteria

Phase 2 is complete only when all criteria are met:

1. ToolShell structure remains unchanged and consistently rendered.
2. No lifecycle step additions/removals/reordering.
3. Visual system is unified; no active inline style blocks in tool runtime views.
4. Density improves measurable information-per-viewport without accessibility regression.
5. Spacing follows centralized token scale across all shell regions.
6. Execution visibility clearly surfaces authority, snapshot, conformance, telemetry outcomes.
7. Governance-denied and fallback outcomes are visibly represented, not silently absorbed.
8. Cross-tool consistency is maintained (no bespoke shell-level tool layouts).

---

## 7) Validation Matrix

| Area | Validation method | Pass condition |
|---|---|---|
| Structure lock | DOM contract checks + browser verification | Required shell anchors present, ordered, stable |
| Lifecycle lock | Execution trace vs UI status mapping | UI status sequence matches canonical lifecycle |
| Visual consistency | Cross-tool visual review | Shared tokenized styles, no per-tool shell divergence |
| Density quality | Snapshot comparisons + task walkthroughs | More visible execution info, equal or better readability |
| Spacing governance | CSS/token audit | No ad hoc spacing in shell regions |
| Visibility | Denied/success/failure execution runs | Authority, conformance, telemetry visibility always present |

---

## 8) Risks and Mitigations

1. **Risk:** cosmetic changes reintroduce layout instability.  
   **Mitigation:** ban runtime structural auto-repair for spacing/visual concerns.

2. **Risk:** density increase harms readability/accessibility.  
   **Mitigation:** enforce minimum text contrast, focus visibility, and control hit area checks.

3. **Risk:** execution visibility becomes inconsistent across tools.  
   **Mitigation:** centralize status/context components and prohibit per-tool status implementations.

4. **Risk:** legacy artifacts re-enter runtime route.  
   **Mitigation:** isolate or retire legacy templates from active execution shell path.

---

## 9) Deliverables

1. Phase 2 refresh spec (this document).
2. Token/style governance update notes.
3. ToolShell conformance checklist update.
4. UX before/after evidence pack (screenshots for key flows).
5. QA validation report focused on lifecycle visibility + stability.

---

## 10) Architecture Alignment Confirmation

This phase plan explicitly preserves:
- ToolShell immutable structure.
- Canonical execution lifecycle contract.
- Server-side governance authority.
- Execution observability and telemetry visibility.

Phase 2 is therefore a **refresh + conformance hardening** plan, not an architecture rewrite.
