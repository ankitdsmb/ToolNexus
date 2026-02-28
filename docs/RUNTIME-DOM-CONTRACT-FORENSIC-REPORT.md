# Runtime DOM Contract Forensic Report

## 1) Executive summary

The DOM contract failures are a **global runtime defect**, not tool-specific. The runtime was validating and adapting against a mutable subtree after tool template injection, rather than the canonical ToolShell root (`#tool-root`). This created false legacy classification, unnecessary adapter attempts, and contract failures across multiple tools. Evidence: canonical ToolShell anchors are server-rendered in `ToolShell.cshtml`, while runtime post-template validation was previously scoped to `toolRoot.closest('[data-runtime-container]') || toolRoot`, which can resolve to a nested `<div>` from tool templates. The fix pins validation scope to canonical `#tool-root`, preserves ToolShell anchors, and loads templates inside ToolShell output zone.

## 2) Root cause classification

**Classification: GLOBAL RUNTIME PROBLEM**

Why:
- ToolShell canonical anchors are rendered once in shared shell view for every tool.
- Validation scope and adapter logic are shared in `wwwroot/js/tool-runtime.js`.
- Failure signature (scope changing to non-`tool-root`, legacy detection, missing canonical nodes) matches shared bootstrap/validation flow.
- Impact observed in unrelated tools (`csv-to-json`, `json-formatter`) indicates platform-wide runtime behavior, not tool module specificity.

## 3) Evidence trace from logs and code

### Log symptoms (from forensic issue log)
- Pre-mount diagnostics reported `rootTag: section`, `rootId: tool-root`.
- Later diagnostics reported `scopeTag: div`, `scopeIsToolRoot: false`.
- Legacy adapter path triggered and returned `adapted: false`.
- Final contract errors missing canonical nodes (`data-tool-shell`, `data-tool-context`, `data-tool-status`, `data-tool-followup`).

### Code evidence
1. Canonical shell exists server-side with required anchors under `#tool-root`. (`Views/Tools/ToolShell.cshtml`)
2. Runtime loaded templates into the root container by default (`templateLoader(slug, root, ...)`), allowing replacement of shell DOM when templates are legacy/generic.
3. Post-mount validation previously selected validation scope from subtree/container (`toolRoot.closest('[data-runtime-container]') || toolRoot`), enabling non-ToolShell scope selection.
4. Layout detector marks DOM as legacy if `[data-tool-root]` exists without full canonical nodes, which is common in many tool templates.

## 4) Exact failure sequence timeline

1. ToolShell SSR renders canonical anchors in `#tool-root`.
2. Runtime bootstrap begins; template load executes.
3. Template loader writes markup at runtime target and may place nested `data-runtime-container`/`data-tool-root` wrappers.
4. Post-template/post-lifecycle validation resolves to nested subtree (`div`), not canonical `#tool-root`.
5. Validator on subtree finds missing canonical nodes and classifies as `LEGACY_LAYOUT` due legacy hints.
6. Legacy adapter runs against wrong scope and cannot produce full ToolShell contract (`adapted: false`).
7. Runtime emits `dom_contract_failure`; crash overlay appears.

## 5) Architecture rule violated

Violated rule: **DOM contract validation must execute against the canonical ToolShell root before/around mount and must not validate arbitrary inner nodes.**

The runtime allowed dynamic scope drift from `#tool-root` to inner container nodes, violating ToolShell contract invariants.

## 6) Why legacy adapter triggers

Legacy adapter was triggered because detection ran on a scope containing legacy indicators (e.g., `[data-tool-root]`, `.tool-page`) but not full canonical anchors. That condition maps to `LEGACY_LAYOUT` by validator logic.

## 7) Why fallback fails

Fallback/adaptation fails because adaptation was attempted on a non-canonical subtree. Even if adapted partially, canonical anchors (`data-tool-context`, `data-tool-status`, `data-tool-followup`) remained absent in that scope, so revalidation still fails.

## 8) Risk assessment

- **Blast radius:** High (all tools using shared runtime path).
- **User impact:** High (runtime crash overlay, tool unusable).
- **Regression likelihood without fix:** High (scope drift can recur with any template).
- **Mitigation confidence after fix:** High, with scope pinning + anchor checks + immunity test over all manifests.

---

## Engineering plan

### PHASE A — Root stabilization
- **Goal:** Preserve canonical ToolShell anchors regardless of template/lifecycle behavior.
- **Files:**
  - `src/ToolNexus.Web/wwwroot/js/tool-runtime.js`
- **Changes:**
  - Add `ensureToolShellAnchors(root)` guard.
  - Ensure anchors are present after template hydration and before DOM validation.
- **Risk:** Medium (touches bootstrap path).
- **Rollback:** Revert commit for `tool-runtime.js` and restore previous bootstrap behavior.

### PHASE B — Validation scope correction
- **Goal:** Always validate against canonical `#tool-root`.
- **Files:**
  - `src/ToolNexus.Web/wwwroot/js/tool-runtime.js`
- **Changes:**
  - Update `resolveValidationScope()` to pin scope to document `#tool-root` when related root is provided.
  - Replace post-mount ad-hoc scope calculation with `validateDomAtPhase(root, 'post-mount')`.
- **Risk:** Low-Medium.
- **Rollback:** Revert scope resolution changes only; retain diagnostics.

### PHASE C — Legacy adapter isolation
- **Goal:** Prevent legacy adapter from executing on ToolShell pages due scope drift.
- **Files:**
  - `src/ToolNexus.Web/wwwroot/js/tool-runtime.js`
- **Changes:**
  - Load templates into ToolShell output zone when shell contract exists, instead of replacing root shell container.
  - Keep adapter pathway for true legacy contexts only.
- **Risk:** Medium (template placement behavior change).
- **Rollback:** Revert template target routing; keep scope pinning if needed.

### PHASE D — Regression immunity
- **Goal:** Detect contract regressions across all manifests.
- **Files:**
  - `tests/runtime/runtime-dom-contract-immunity.test.js`
- **Changes:**
  - Iterate all manifest files.
  - Bootstrap runtime per slug with controlled lifecycle module.
  - Assert pre-mount anchors exist, validation scope is `tool-root`, no `dom_contract_failure`, and no unexpected legacy adapter triggers.
- **Risk:** Low.
- **Rollback:** Remove new test if harness constraints emerge, but retain runtime fix.
