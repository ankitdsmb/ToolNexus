# Phase 4.5 — Adaptive Runtime Loop

## Scope lock confirmation

This phase extends runtime intelligence without changing ToolShell layout or execution lifecycle contract.

Locked lifecycle remains:

**Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry**

No new layout regions were introduced. Existing status and follow-up regions are reused.

---

## 1) Files modified

- `src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-auto-runtime.js`
- `tests/runtime/tool-unified-control-runtime.test.js`
- `tests/runtime/tool-auto-runtime.test.js`
- `docs/PHASE-4.5-ADAPTIVE-RUNTIME.md`

---

## 2) Outcome classification logic

Execution outcomes are now classified client-side into:

- `usable_success`
- `warning_partial`
- `uncertain_result`
- `failed`

### Classification signals

Classification uses existing runtime evidence payload dimensions:

- diagnostics presence and rough weight
- metadata completeness
- warning signals and warning count
- interpretation/supporting context availability

### Rule summary

- `warning_partial`
  - one or more warning signals present.
- `uncertain_result`
  - diagnostics exist but interpretation and metadata are weak, or evidence completeness is low.
- `usable_success`
  - structured evidence is sufficiently complete with no warning signals.
- `failed`
  - execution throws/returns failure in current lifecycle failure path.

No server contract or schema changes were required.

---

## 3) Adaptive guidance model

Adaptive runtime guidance is generated through `buildAdaptiveGuidance(...)` and rendered in existing status-note/follow-up surfaces.

### Per-class guidance behavior

- `usable_success`
  - Next step: continue with follow-up actions.
  - Rerun: optional for comparative validation.
  - Validation: lightweight spot-check guidance.

- `warning_partial`
  - Next step: inspect diagnostics and warning notes.
  - Rerun: recommended after input/runtime adjustment.
  - Validation: targeted checks for impacted fields.

- `uncertain_result`
  - Next step: cross-check against trusted baseline/reference.
  - Rerun: recommended with richer context/metadata.
  - Validation: manual verification of critical values.

- `failed`
  - Next step: review failure diagnostics and assumptions.
  - Rerun: recommended after correction.
  - Validation: pre-retry request sanity check.

---

## 4) Confidence feedback loop

Confidence phrasing now adapts dynamically to:

- evidence completeness score (supporting + metadata + diagnostics)
- warning count
- diagnostic weight

Examples:

- warning-heavy output → cautious confidence phrasing
- low-evidence/diagnostics-only output → limited confidence phrasing
- complete structured evidence → strong confidence phrasing

---

## 5) Lightweight execution memory

A client-side, per-tool runtime memory was added in auto runtime module:

- `lastOutcomeClass`
- `repeatedWarnings` counter

Memory is only used to alter wording (especially repeated-warning guidance) and does not impact execution flow, authority, governance, or backend persistence.

No backend schema or API contract change was introduced.

---

## 6) Runtime intelligence rationale

Phase 4.5 increases operator decision quality while preserving platform invariants:

1. **Outcome normalization:** operators receive a consistent class label for heterogeneous payload quality.
2. **Adaptive operational guidance:** recommendations are tied to outcome confidence and warning patterns.
3. **Progressive confidence language:** confidence is evidence-derived, not static.
4. **Low-risk memory loop:** repeated warning detection improves guidance quality without creating hidden execution states.

This preserves execution architecture integrity and keeps all dynamics inside existing ToolShell regions.
