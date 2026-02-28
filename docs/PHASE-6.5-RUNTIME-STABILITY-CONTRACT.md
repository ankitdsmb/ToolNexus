# PHASE 6.5 — Runtime Stability Contract

## Scope lock confirmation

This phase introduces deterministic runtime stability guarantees while preserving architecture and UX locks:

- No new runtime feature paths were added.
- No layout changes were introduced (Header, Context Strip, Left Input, Right Output, Follow-up Action Bar remain unchanged).
- Canonical execution lifecycle remains unchanged: **Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry**.
- Stability logic normalizes reasoning for consistency only; it does not bypass governance, authority resolution, or conformance.

---

## 1) Files modified

- `src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-auto-runtime.js`
- `tests/runtime/tool-unified-control-runtime.test.js`
- `docs/PHASE-6.5-RUNTIME-STABILITY-CONTRACT.md`

---

## 2) Runtime Stability Contract (invariants)

The runtime now enforces these explicit guarantees:

1. **Same reasoning signals → same outcome class**
   - A normalized reason signature is mapped to a stable outcome class.
   - If identical signals later propose a conflicting class, runtime normalizes to the previously established class.

2. **Observation cannot change severity**
   - Observation remains descriptive only.
   - Outcome class is never escalated/de-escalated by observation pattern detection.

3. **Confidence must align with outcome**
   - Confidence level is canonicalized from outcome class in consistency enforcement.
   - Any inconsistent confidence input is normalized to the expected mapping.

4. **Guidance must reference reasons**
   - Guidance must contain explicit reason linkage (`Because ...`).
   - If absent, the consistency pass prepends reason-bound guidance.

---

## 3) Stability validation logic

Validation entry point:

```js
validateRuntimeStability(runtimeReasoning, observation)
```

Validation behavior:

- Performs base consistency normalization via `enforceRuntimeReasoningConsistency(...)`.
- Builds reason signature from normalized reasoning reasons.
- Uses observation-local `reason signature -> outcome class` mapping to enforce deterministic classification.
- On mismatch:
  - marks `instabilityDetected: true`
  - emits warning code (`deterministic_outcome_violation:<signature>`)
  - safely normalizes runtime reasoning to stable outcome class and re-enforces confidence/guidance consistency.

Returned payload:

```js
{
  runtimeReasoning,
  instabilityDetected,
  warnings
}
```

Rendering integration:

- `createUnifiedToolControl().renderResult(...)` now validates runtime reasoning before surface rendering.
- All rendered classification/confidence/guidance now consume validated reasoning.

Developer safety logging:

- In `tool-auto-runtime.js`, stability warnings are logged with `console.warn` in development mode only (`shouldWarnExecutionBoundary(manifest)`), never in production paths.

---

## 4) Example stabilized flows

### A) Deterministic classification lock

- Run 1 reasons: `warnings detected in runtime evidence`
- Outcome class: `warning_partial` (recorded)
- Run 2 with identical reason signal but proposed `usable_success`
- Validation result:
  - instability detected
  - normalized outcome class = `warning_partial`
  - confidence normalized to `cautious`

### B) Confidence normalization stability

- Input reasoning: outcome `warning_partial`, confidence `high`
- Validation result: confidence normalized to `cautious` (canonical mapping)

### C) Observation non-interference

- Observation detects repeated warnings/repeated outcome trends.
- Validation preserves existing outcome class and confidence.
- Observation contributes tone prefix only; no severity mutation occurs.

---

## 5) Developer safety tests

Coverage added for contract expectations:

- Deterministic classification under repeated reason signals.
- Stable confidence mapping under normalization.
- Observation non-interference with outcome class and confidence.

