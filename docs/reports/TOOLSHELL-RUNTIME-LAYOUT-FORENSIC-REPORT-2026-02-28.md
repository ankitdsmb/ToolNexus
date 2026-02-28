# TOOLNEXUS RUNTIME FORENSIC REPORT
## Scope: Runtime Layout + Tool UI Injection + Shell Ownership Conflicts
## Date: 2026-02-28
## Mode: Architecture Forensics (Option A locked)

---

## 1. EXECUTIVE SUMMARY

The runtime breakage is a **global structural conflict** between the ToolShell contract and template/runtime mounting behavior. The shell still imposes a two-column execution grid (`input/output`) while the injected tool templates already render their own internal dual-panel workspace. At runtime, templates are injected into the shell input zone only, leaving shell output as a separate parallel region. This creates a split-inside-split topology and visually manifests as squeezed tool UI, an empty right panel, detached markdown/docs rail, and unstable spacing.

The failure is architectural, not cosmetic: ownership boundaries are violated in DOM composition, CSS layout authority, and mount lifecycle behavior.

---

## 2. ROOT CAUSE CLASSIFICATION

### RC-1 — Shell ownership violation
Shell continues to own intra-runtime panel geometry via grid columns and named grid areas, instead of acting as a neutral container host for embedded tool widgets. Evidence: shell runtime grid and explicit `input/output/followup` area mapping. (`src/ToolNexus.Web/wwwroot/css/site.css`)

### RC-2 — Template ownership conflict
Template loader mounts tool templates into `[data-tool-input]` specifically, while templates contain complete local runtime layouts (`.tool-local-body` two-column). This guarantees nested layout contention. (`src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js`, `src/ToolNexus.Web/wwwroot/css/tool-auto-professional.css`, sample template HTML)

### RC-3 — DOM contract drift masked by runtime repair
Runtime synthesizes missing anchors and treats legacy aliases as compatible, allowing non-canonical structure to pass longer than intended. This suppresses early failures and lets broken topology persist globally. (`src/ToolNexus.Web/wwwroot/js/tool-runtime.js`, `src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract.js`)

### RC-4 — Lifecycle observability mismatch
Runtime logs claim template target root while loader actually injects into input handoff container, introducing forensic ambiguity and slowing diagnosis. (`src/ToolNexus.Web/wwwroot/js/tool-runtime.js`, `src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js`)

### RC-5 — Shell/content zone coupling conflict
Tool documentation rail (`aside`) is still rendered as a parallel workspace zone and normalized into single-column flow in workspace mode, visually detached from execution intent and competing for perceived runtime ownership. (`src/ToolNexus.Web/Views/Tools/ToolShell.cshtml`, `src/ToolNexus.Web/wwwroot/css/site.css`)

---

## 3. COMPLETE ISSUE LIST

## ISSUE TNX-FOR-001
- **Symptom:** Tool UI appears squeezed into left side.
- **Technical cause:** Template is mounted under `[data-tool-input]`, not full runtime host; tool widget already has internal workspace split.
- **Files responsible:**
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js`
  - `src/ToolNexus.Web/wwwroot/css/tool-auto-professional.css`
  - `src/ToolNexus.Web/wwwroot/tool-templates/json-formatter.html` (representative of global pattern)
- **Risk level:** Critical
- **Blast radius:** Global (all tool templates using runtime loader)

## ISSUE TNX-FOR-002
- **Symptom:** Empty right runtime panel remains visible.
- **Technical cause:** Shell reserves `[data-tool-output]` as separate grid area while template payload is injected into input handoff; output is not primary template mount target.
- **Files responsible:**
  - `src/ToolNexus.Web/Views/Tools/ToolShell.cshtml`
  - `src/ToolNexus.Web/wwwroot/css/site.css`
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js`
- **Risk level:** High
- **Blast radius:** Global

## ISSUE TNX-FOR-003
- **Symptom:** Split-inside-split visual pattern.
- **Technical cause:** Outer shell grid (`input/output`) + inner template grid (`.tool-local-body`) both enforce lateral partitioning.
- **Files responsible:**
  - `src/ToolNexus.Web/wwwroot/css/site.css`
  - `src/ToolNexus.Web/wwwroot/css/tool-auto-professional.css`
  - `src/ToolNexus.Web/wwwroot/tool-templates/*.html` (tool-runtime-widget pattern)
- **Risk level:** Critical
- **Blast radius:** Global/new tools inherit automatically

## ISSUE TNX-FOR-004
- **Symptom:** Runtime shell still owns input/output/action composition.
- **Technical cause:** Shell markup predefines panels and runtime JS force-fills status/actions/output evidence in shell anchors.
- **Files responsible:**
  - `src/ToolNexus.Web/Views/Tools/ToolShell.cshtml`
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js`
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-presentation-engine.js`
- **Risk level:** High
- **Blast radius:** Global

## ISSUE TNX-FOR-005
- **Symptom:** Template mounted in wrong zone relative to Option A lock.
- **Technical cause:** `resolveRootHandoffTarget` hardcodes mount host to `[data-tool-input]` and creates `data-runtime-template-handoff` there.
- **Files responsible:**
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js`
- **Risk level:** Critical
- **Blast radius:** Global

## ISSUE TNX-FOR-006
- **Symptom:** SEO markdown/docs feels detached from runtime.
- **Technical cause:** docs rail is a peer zone with separate styling and non-runtime card semantics; workspace normalization collapses to single column but retains visual distinction and low-emphasis opacity.
- **Files responsible:**
  - `src/ToolNexus.Web/Views/Tools/ToolShell.cshtml`
  - `src/ToolNexus.Web/wwwroot/css/site.css`
- **Risk level:** Medium
- **Blast radius:** Global

## ISSUE TNX-FOR-007
- **Symptom:** Runtime panel height and spacing inconsistent.
- **Technical cause:** Multiple min-height/padding regimes across base shell styles and workspace overrides (`clamp(620px...)`, `70vh`, media override `64vh`) plus nested template min-heights.
- **Files responsible:**
  - `src/ToolNexus.Web/wwwroot/css/site.css`
  - `src/ToolNexus.Web/wwwroot/css/tool-auto-professional.css`
  - per-tool runtime CSS files (e.g., `src/ToolNexus.Web/wwwroot/css/pages/json-formatter.css`)
- **Risk level:** Medium
- **Blast radius:** Global

## ISSUE TNX-FOR-008
- **Symptom:** New tools inherit same broken layout by default.
- **Technical cause:** Generic template contract + loader strategy always inject into input zone and generic CSS enforces two-column local body.
- **Files responsible:**
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js`
  - `src/ToolNexus.Web/wwwroot/css/tool-auto-professional.css`
- **Risk level:** Critical
- **Blast radius:** Global/future tools

## ISSUE TNX-FOR-009
- **Symptom:** DOM contract failures are hard to isolate and can self-heal silently.
- **Technical cause:** `ensureToolShellAnchors` creates missing canonical anchors at runtime; validator also accepts legacy aliases in diagnostics model.
- **Files responsible:**
  - `src/ToolNexus.Web/wwwroot/js/tool-runtime.js`
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract.js`
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js`
- **Risk level:** High
- **Blast radius:** Global runtime reliability and debugging

## ISSUE TNX-FOR-010
- **Symptom:** Runtime ownership telemetry/log narrative is contradictory.
- **Technical cause:** runtime logs report template target root (`#tool-root`) while loader logs true target (`[data-tool-input]`).
- **Files responsible:**
  - `src/ToolNexus.Web/wwwroot/js/tool-runtime.js`
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js`
- **Risk level:** Medium
- **Blast radius:** Global observability/forensics

## ISSUE TNX-FOR-011
- **Symptom:** Partial DOM replacement side effects during failure states.
- **Technical cause:** runtime does not replace shell root wholesale, but performs `replaceChildren` on key zones (status/actions/output), and `innerHTML` template injection, causing local ownership resets.
- **Files responsible:**
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js`
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-presentation-engine.js`
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-auto-runtime.js`
  - `src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js`
- **Risk level:** Medium
- **Blast radius:** Global runtime behavior consistency

---

## 4. FAILURE TIMELINE

1. ToolShell SSR renders canonical anchors plus shell-level input/output/follow-up regions and docs rail.
2. Runtime bootstrap validates/enhances root and proceeds with template loading.
3. Template loader resolves handoff host to `[data-tool-input]` and injects full template markup via `innerHTML`.
4. Injected template includes its own local header/actions/body/metrics and often a two-column local body.
5. Shell output region remains independently rendered and then unified control runtime augments status/actions/output evidence in shell zones.
6. Result: left shell input contains an internally split tool UI; right shell output remains mostly framework-owned/empty until execution evidence arrives.
7. CSS enforces both shell split and widget split, amplifying compression and spatial imbalance.
8. On contract drift, runtime repair (`ensureToolShellAnchors`) can create missing anchors and avoid hard failure, preserving broken ownership topology.
9. Diagnostic logs diverge (root target vs input target), delaying accurate incident triage.

---

## 5. ARCHITECTURE RULES BEING VIOLATED

1. **Option A lock violation:** shell is not container-only; it still dictates runtime internals through grid and panel authority.
2. **Ownership separation violation:** tool widget does not own full internal runtime width; it is constrained to shell input zone.
3. **Single-layout-authority violation:** both shell and widget define horizontal workspace segmentation.
4. **Contract purity violation:** runtime auto-repair and legacy alias acceptance reduce strictness and allow drift persistence.
5. **Observability correctness violation:** runtime ownership logging is internally inconsistent.

---

## 6. SOLUTION PLAN (PER ISSUE)

## TNX-FOR-001 / TNX-FOR-005 / TNX-FOR-008 (Mount target ownership)
- **Exact fix strategy:** Move template injection host from `[data-tool-input]` handoff to a dedicated full-width tool content host owned by tool widget under shell runtime root.
- **What to change:**
  - Refactor `resolveRootHandoffTarget` to resolve to full-runtime content slot (single host).
  - Keep canonical anchors for status/follow-up/context as shell metadata channels only.
  - Remove input-zone-prepend behavior.
- **Why it works:** eliminates nested shell->input containment; widget receives full horizontal budget and internal layout authority.
- **Rollback strategy:** feature-flag mount target (`runtime.templateMountTarget=input|full`) with default to full after soak period.

## TNX-FOR-002 / TNX-FOR-003 / TNX-FOR-004 (Shell grid overreach)
- **Exact fix strategy:** reduce shell runtime to container/meta orchestration, not dual-panel geometry for widget internals.
- **What to change:**
  - Remove shell `grid-template-columns` partitioning for widget content area.
  - Keep only immutable shell anchors for lifecycle metadata and follow-up actions.
  - Ensure widget host occupies full runtime width.
- **Why it works:** enforces single source of layout truth (tool widget).
- **Rollback strategy:** preserve previous CSS blocks behind scoped class (`.legacy-shell-grid`) toggled only for rollback.

## TNX-FOR-006 (Docs detachment)
- **Exact fix strategy:** decouple runtime execution layout from docs rail visuals and placement weight.
- **What to change:**
  - Keep docs as context content but avoid competing workspace semantics (`workspace-shell__context-rail` styling in runtime mode).
  - Normalize docs to non-competing companion section in Option A runtime mode.
- **Why it works:** removes pseudo-panel competition and perceived empty right panel confusion.
- **Rollback strategy:** route-level class toggle to restore current docs rail treatment.

## TNX-FOR-007 (Height/spacing inconsistency)
- **Exact fix strategy:** establish one runtime vertical sizing policy and remove conflicting min-height rules.
- **What to change:**
  - Consolidate `min-height` and padding variables at one layer.
  - Avoid simultaneous shell + template hard minimums except for accessibility floor.
- **Why it works:** prevents compounded overflows and inconsistent whitespace.
- **Rollback strategy:** keep previous variable map in legacy CSS token namespace.

## TNX-FOR-009 (Contract repair masking)
- **Exact fix strategy:** convert anchor synthesis to diagnostics-only in production and strict fail in QA/dev for missing canonical anchors.
- **What to change:**
  - Gate `ensureToolShellAnchors` behavior by environment/policy.
  - Promote missing-anchor incidents to explicit conformance failures.
- **Why it works:** catches drift at source; avoids hidden runtime mutation.
- **Rollback strategy:** temporary emergency switch to re-enable synthesis.

## TNX-FOR-010 (Log mismatch)
- **Exact fix strategy:** unify mount target telemetry from one source.
- **What to change:**
  - Emit canonical `runtime.template.mountTarget` from loader return value.
  - Remove contradictory root-target log lines.
- **Why it works:** restores forensic traceability.
- **Rollback strategy:** keep deprecated log fields for one release with explicit `deprecated=true` marker.

## TNX-FOR-011 (Partial DOM replacements)
- **Exact fix strategy:** adopt non-destructive rendering for status/actions/output and reserve `replaceChildren` for guarded transitions.
- **What to change:**
  - Update presentation engine and failure handlers to patch known child slots.
  - Prevent output-wide replacement when possible.
- **Why it works:** preserves tool-owned subtree stability.
- **Rollback strategy:** controlled fallback path retaining existing replace behavior under fail-safe flag.

---

## 7. GLOBAL FIX STRATEGY (FINAL ARCHITECTURE UNDER OPTION A)

## Shell responsibilities
- Render immutable execution shell contract anchors and governance/context metadata.
- Provide lifecycle status channel and follow-up action channel.
- Provide one neutral full-width tool content host.
- Never define internal horizontal split for tool widget content.

## Tool responsibilities
- Own internal interaction layout completely (including any local left/right editors).
- Render execution-specific controls/results inside widget domain.
- Avoid redefining shell anchors.

## Runtime responsibilities
- Mount template into shell’s single tool-content host.
- Validate contract strictly and report drift deterministically.
- Do not auto-heal structural violations silently.
- Keep telemetry truthfully aligned with actual mount targets and ownership decisions.

---

## 8. VALIDATION PLAN

## A. DOM contract tests
1. Assert exactly one canonical shell root and all required anchors exist.
2. Assert tool template mounts into full-width content host (not input anchor).
3. Assert no nested `[data-tool-shell]` survives post-sanitization.

## B. Layout stability tests
1. Desktop: verify widget host width ≈ runtime width (no left squeeze).
2. Ensure no empty sibling output panel when widget provides full interactive UI.
3. Confirm docs/context section does not alter runtime width allocation in Option A mode.

## C. Runtime mount tests
1. Mount success path: no runtime DOM synthesis occurs.
2. Missing anchor path: deterministic failure + telemetry event.
3. Legacy template path: mapped through canonical host without nested split.

## D. Visual regression checks
1. Baseline snapshots for top 10 high-usage tools.
2. Cross-breakpoint snapshots (desktop/tablet/mobile).
3. Snapshot assertion for: no split-inside-split, no empty right execution panel, stable follow-up bar.

## E. Observability checks
1. Validate log/event fields for template mount target, shell ownership, and contract state.
2. Ensure no contradictory mount target logs in same execution.

---

## 9. FINAL REQUIRED STATEMENTS

- **ROOT CAUSE CONFIDENCE LEVEL:** 0.95 (high confidence; reproduced by direct static code path evidence across shell markup, runtime loader behavior, and CSS ownership layers).
- **FIRST SAFE FIX TO APPLY:** change template mount target away from `[data-tool-input]` to a full-width dedicated runtime tool host while preserving existing anchors.
- **LONG TERM PERMANENT FIX:** enforce strict Option A ownership contract in code + tests: shell as container/meta only, tool widget as sole internal layout authority, runtime as strict non-healing contract enforcer with truthful telemetry.

