# PHASE 6 — Runtime Observation Loop

## Scope lock confirmation

This phase implements a client-side runtime observation loop while preserving all architecture locks:

- ToolShell layout remains unchanged (Header, Context Strip, Left Input, Right Output, Follow-up Action Bar).
- Canonical execution lifecycle remains unchanged: **Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry**.
- No auto-execution path was introduced.
- Observation affects wording only; it does not alter outcome class or confidence level.

---

## 1) Files modified

- `src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-auto-runtime.js`
- `tests/runtime/tool-unified-control-runtime.test.js`
- `tests/runtime/tool-auto-runtime.test.js`
- `docs/PHASE-6-RUNTIME-OBSERVATION.md`

---

## 2) Observation model

A lightweight client-side model was added:

```js
RuntimeObservation {
  repeatedOutcomeCount,
  repeatedReasonPatterns,
  lastGuidanceType
}
```

Implementation details:

- Created via `createRuntimeObservationState()`.
- Held in-memory per mounted runtime (`tool-auto-runtime.js`).
- No backend write, no persistence, no migration required.

Internal tracking fields (`_lastOutcomeClass`, `_lastReasonSignature`) are used only for local pattern detection state transitions.

---

## 3) Pattern detection logic

Pattern detection is performed by `observeRuntimeReasoning(observation, runtimeReasoning)`:

1. **Same outcome class repeating**
   - `repeatedOutcomeCount` increments when `runtimeReasoning.outcomeClass` matches the previous run.
   - Emits pattern flag: `repeatedOutcomeClass`.

2. **Same reasoning signals repeating**
   - `runtimeReasoning.reasons` are normalized into a compact reason signature.
   - Consecutive matching signatures are counted in `repeatedReasonPatterns`.
   - Emits pattern flag: `repeatedReasonSignals`.

3. **Repeated warning sequences**
   - If outcome remains `warning_partial` across runs, observation emits `repeatedWarningSequence`.

Observation is invoked after runtime reasoning is built; it does not replace reasoning and does not change execution path.

---

## 4) Adaptive wording examples

Observation modifies tone through `buildObservationTonePrefix(...)`, then prefixes guidance text:

- Repeated warning sequence:
  - `Similar warnings detected in recent runs.`
- Repeated reason signals:
  - `Reasoning signals are recurring across recent runs.`
- Repeated outcome class:
  - `Recent runs show a similar outcome trend.`

Example composed guidance:

```text
Guidance: Similar warnings detected in recent runs. Because warnings detected in runtime evidence and diagnostics indicate partial risk exposure, fix the recurring warning source before rerun. Next step: address recurring warning pattern. Rerun: yes, after adjustment. Validation: verify impacted fields first.
```

Guidance content still derives from `RuntimeReasoning`. Observation only layers tone messaging ahead of the same reasoning-driven steps.

---

## 5) Safety rule verification

Observation implementation guarantees:

- **Never modifies outcome class**
  - Outcome is resolved by `buildRuntimeReasoning` and consumed as-is.
- **Never changes confidence level**
  - Confidence remains derived from outcome via existing consistency rules.
- **Never auto-runs execution**
  - Observation executes only inside explicit run-button flow.

No authority or governance logic moved client-side; no execution lifecycle stage was bypassed.
