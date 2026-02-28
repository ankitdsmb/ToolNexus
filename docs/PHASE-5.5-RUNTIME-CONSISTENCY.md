# PHASE 5.5 — Runtime Consistency Layer

## Scope lock confirmation

This phase unifies runtime reasoning internals while preserving all locked platform invariants:

- ToolShell structure remains unchanged (Header, Context Strip, Left Input, Right Output, Follow-up Action Bar).
- Canonical execution lifecycle remains unchanged:
  **Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry**.
- Outcome classes remain unchanged:
  `usable_success`, `warning_partial`, `uncertain_result`, `failed`.

No new layout regions, no alternate runtime path, and no client-side authority logic were introduced.

---

## 1) Files modified

- `src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-auto-runtime.js`
- `tests/runtime/tool-unified-control-runtime.test.js`
- `tests/runtime/tool-auto-runtime.test.js`
- `docs/PHASE-5.5-RUNTIME-CONSISTENCY.md`

---

## 2) RuntimeReasoning model definition

A single shared reasoning model now drives runtime wording:

```js
RuntimeReasoning {
  outcomeClass,
  confidenceLevel,
  reasons[],
  guidance[]
}
```

### Source of truth

`buildRuntimeReasoning(...)` now computes this object in `tool-unified-control-runtime.js`, and all runtime messaging derives from it:

- status alignment input (`outcomeClass`)
- confidence wording (`confidenceLevel`)
- explanation line (`reasons[]`)
- adaptive guidance copy (`guidance[]`)

`tool-auto-runtime.js` consumes this same object for success/warning/uncertain/failed paths.

---

## 3) Consistency rules implemented

Consistency is enforced through `enforceRuntimeReasoningConsistency(...)` and supporting helpers:

1. **Outcome ↔ confidence alignment**
   - `warning_partial` → `cautious`
   - `uncertain_result` → `limited`
   - `failed` → `none`
   - `usable_success` → `strong`

2. **Guidance must reference reasons**
   - Guidance is reason-bound using `buildAdaptiveGuidanceFromReasons(...)`.
   - If guidance lacks explicit reason linkage, enforcement prepends:
     `Because <reasons...>, proceed with the following steps.`

3. **Explanations must match confidence signals**
   - Confidence text is generated from `confidenceLevel` only.
   - Explanation reasons and follow-up guidance are emitted from the same reasoning object.

4. **No contradictory messaging**
   - A single consistency pass normalizes missing/contradictory fields before rendering.
   - Rendering surfaces consume the normalized object, not separate parallel heuristics.

---

## 4) Rendering integration

No new UI regions were introduced.

Existing surfaces continue to be used:

- **status region**
- **supporting interpretation block**
- **follow-up guidance**

The difference is internal: each surface now reads from `RuntimeReasoning` instead of independent computations.

---

## 5) Regression safety

- Outcome classes were preserved unchanged.
- Existing execution lifecycle and ToolShell contracts were preserved.
- Runtime behavior is functionally equivalent in user-visible flow, with improved internal consistency and reduced message drift risk.

---

## 6) Example reasoning flows

### A) Warning partial with execution-boundary warning

- Inputs/signals: warnings present + ignored client-owned execution fields
- RuntimeReasoning:
  - outcomeClass: `warning_partial`
  - confidenceLevel: `cautious`
  - reasons: warning evidence + boundary-ignore reason
  - guidance: reason-linked rerun and validation steps

### B) Uncertain result with diagnostics-dominant output

- Inputs/signals: diagnostics present, low metadata/supporting context
- RuntimeReasoning:
  - outcomeClass: `uncertain_result`
  - confidenceLevel: `limited`
  - reasons: limited context + diagnostics dominance
  - guidance: reason-linked cross-check + richer-context rerun

### C) Failed execution path

- Inputs/signals: runtime execution error
- RuntimeReasoning:
  - outcomeClass: `failed`
  - confidenceLevel: `none`
  - reasons: execution error path triggered
  - guidance: reason-linked correction and retry steps

---

## 7) Validation updates

Updated tests verify:

- Unified reasoning consistency (`outcomeClass`, `confidenceLevel`, `reasons`, `guidance`) via one model.
- Warning-path messaging remains reason-linked and adaptive.
- Failed-path explanation and guidance derive from the same reasoning structure.
