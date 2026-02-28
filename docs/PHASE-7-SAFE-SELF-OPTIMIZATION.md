# PHASE 7 — Safe Self-Optimization Layer

Baseline references:
- `docs/PHASE-0-FOUNDATION-LOCK.md`
- `docs/PHASE-6-RUNTIME-OBSERVATION.md`
- `docs/PHASE-6.5-RUNTIME-STABILITY-CONTRACT.md`
- `docs/ARCHITECTURE-MASTER-CONTEXT.md`

## Scope lock confirmation

PHASE-7 adds **advisory optimization insight generation** while preserving all architecture locks:

- No ToolShell layout changes (Header, Context Strip, Left Input Panel, Right Output Panel, Follow-up Action Bar unchanged).
- No lifecycle changes; canonical flow remains **Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry**.
- Runtime does not self-modify execution behavior.
- Optimization output is suggestion-only and rendered through existing follow-up content surfaces.

---

## 1) Files modified

- `src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js`
- `src/ToolNexus.Web/wwwroot/js/runtime/tool-auto-runtime.js`
- `tests/runtime/tool-unified-control-runtime.test.js`
- `tests/runtime/tool-auto-runtime.test.js`
- `docs/PHASE-7-SAFE-SELF-OPTIMIZATION.md`

---

## 2) Optimization insight model

Added advisory model:

```js
RuntimeOptimizationInsight {
  repeatedPatternDetected,
  optimizationHint,
  confidence
}
```

Creation entry points:

- `createRuntimeOptimizationInsight()` creates default neutral insight.
- `generateRuntimeOptimizationInsight(...)` produces conditional suggestions from:
  - observation patterns
  - repeated guidance loops
  - repeated unstable signals

Observation state now also tracks:

- `repeatedGuidanceLoopCount`
- `repeatedUnstableSignals`

---

## 3) Insight generation logic

Insight logic is deterministic and advisory:

1. **Repeated warning pattern**
   - Trigger: `repeatedWarningSequence`
   - Hint: refine input constraints to reduce recurring warnings.
   - Confidence: `high`

2. **Recurring uncertainty**
   - Trigger: `outcomeClass = uncertain_result` + repeated outcome/reason patterns
   - Hint: provide richer metadata/context.
   - Confidence: `medium/high` based on repeated reason signals.

3. **Repeated failed/unstable signals**
   - Trigger: failed outcome and/or repeated stability instability detections
   - Hint: add validation checks before execution.
   - Confidence: `medium`

4. **Repeated guidance loop**
   - Trigger: same guidance type repeating
   - Hint: adjust request details to break loop.
   - Confidence: `low`

No pattern → neutral insight (`repeatedPatternDetected = false`, empty hint).

---

## 4) Rendering integration

Integration uses existing output follow-up text region only:

- Existing `next-action` line is reused.
- When insight exists, text is prefixed with:
  - `Optimization insight: ...`

No new UI regions were created.

---

## 5) Safety guarantees

Optimization insights are constrained by explicit behavior:

- Cannot change outcome class.
- Cannot alter confidence mapping.
- Cannot auto-run tools.
- Cannot mutate runtime reasoning model.
- Cannot bypass authority/governance/conformance.

Insights only alter advisory wording shown to the operator.

---

## 6) Stability integration order

Optimization generation executes **after runtime stability validation**:

1. Build runtime reasoning.
2. Validate via stability contract.
3. Observe reasoning patterns.
4. Observe stability signals.
5. Generate optimization insight (advisory only).
6. Render guidance + optional optimization insight prefix.

This preserves PHASE-6.5 deterministic guarantees and keeps optimization strictly non-authoritative.

---

## 7) Example optimization hints

- `Optimization insight: refine input constraints to reduce recurring warnings before rerun.`
- `Optimization insight: include richer metadata/context so runtime interpretation has stronger evidence.`
- `Optimization insight: add validation checks before execution to prevent repeated failure or instability loops.`
- `Optimization insight: adjust request details to break repeated guidance loops and improve run diversity.`
