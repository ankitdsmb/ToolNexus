# PHASE 5 — Runtime Self-Awareness Layer

## Scope lock confirmation

This phase adds runtime explainability only.

Locked invariants preserved:

- ToolShell structure unchanged (Header, Context Strip, Left Input, Right Output, Follow-up Action Bar).
- Canonical execution lifecycle unchanged:
  **Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry**.
- Outcome classes unchanged:
  `usable_success`, `warning_partial`, `uncertain_result`, `failed`.

No new layout regions, no alternate execution paths, and no client-side authority logic were introduced.

---

## 1) Files modified

- `src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-auto-runtime.js`
- `tests/runtime/tool-unified-control-runtime.test.js`
- `tests/runtime/tool-auto-runtime.test.js`
- `docs/PHASE-5-SELF-AWARE-RUNTIME.md`

---

## 2) Explanation generation logic

Runtime now computes concise, observable-signal explanations for outcome classification.

### Outcome explanation model

- **usable_success**
  - evidence completeness is high for this execution
  - no warnings were observed

- **warning_partial**
  - warnings detected in runtime evidence
  - diagnostics indicate partial risk exposure

- **uncertain_result**
  - metadata or interpretation context is limited
  - diagnostics are more dominant than explanatory evidence

- **failed**
  - execution error path was triggered

### Signal sources used

Only observable runtime evidence is used:

- `warnings`/warning count
- diagnostics presence and weight
- metadata completeness
- supporting interpretation presence
- computed evidence completeness score

No hidden or non-observable decision criteria were added.

---

## 3) Rendering integration

Explainability is rendered in the existing output supporting section via:

- **"Why this result is classified this way"**

Implementation details:

- Added a dedicated supporting line (`data-ai-layer="classification-why"`) inside the existing Interpretation layer block.
- Populated per execution via outcome explanation reasons.
- Failure path also sets this line explicitly to keep classification rationale visible even on errors.

No new panel, no structural UI changes.

---

## 4) Transparency rationale

This phase improves operator trust by making classification rationale explicit and auditable at the point of output review.

Transparency goals satisfied:

1. **Observable evidence reference only**
   - Explanations explicitly reference warnings, diagnostics, metadata completeness, and interpretation availability.

2. **No hidden logic language**
   - Wording avoids opaque phrasing and internal-only heuristics.

3. **Operator-focused brevity**
   - Explanations are short and action-oriented.

4. **Guidance linked to reasons**
   - Adaptive guidance now uses explanation reasons directly (e.g., “Because …, rerun with richer context…”), aligning recommendations with visible classification rationale.

---

## 5) Validation and test coverage

Updated runtime tests confirm:

- Classification rationale line renders for warning and uncertain outcomes.
- Guidance can be generated directly from explanation reasons.
- Repeated warning runs produce reason-linked guidance.
- Failure path renders failed classification explanation and reason-driven retry guidance.
