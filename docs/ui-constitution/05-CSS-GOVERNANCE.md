# 05 — CSS Governance

## Purpose
Prevent CSS drift, spacing inconsistency, and per-tool visual divergence by enforcing platform-level styling governance.

## Governance Rules (Mandatory)

1. **Design tokens are the single source of truth**
   - Spacing, typography, color, radius, shadows, and z-index values must come from approved platform tokens.
   - Hardcoded visual values (e.g., arbitrary `px`, custom hex, one-off shadows) are not allowed when a token exists.

2. **No per-tool layout systems**
   - Tools must use the shared platform shell and workspace layout primitives.
   - Tool-level CSS must not redefine global structure, panel geometry, or layout behavior.

3. **Execution density over marketing spacing**
   - UI must stay compact, readable, and execution-focused.
   - Prefer concise spacing patterns that maximize visible execution context and output.

4. **Avoid large vertical gaps**
   - Vertical whitespace must be intentional and token-based.
   - Large empty blocks that push execution-critical controls or status below the fold are prohibited.

5. **Platform shell controls spacing**
   - Global rhythm is owned by the platform shell.
   - Tools may compose within provided containers, but may not override shell-level spacing contracts.

---

## Allowed CSS Override Scope

Tool-level CSS overrides are allowed only within a tool’s local content container and only for:

- Content presentation details (e.g., syntax highlighting adjustments, small visual affordances).
- Component-internal spacing using approved spacing tokens.
- Non-structural states (hover, focus, selected, disabled) using approved tokens.
- Responsive behavior of local content blocks that does not alter platform shell structure.

### Explicitly Allowed Examples

- Adjusting spacing between fields inside an existing shared form component using token values.
- Styling output content (code block wrapping, table cell density, inline badges) without changing panel boundaries.
- Minor local alignment fixes that do not alter shared header/context-strip/workspace/action-bar structure.

---

## Forbidden Patterns (Non-Negotiable)

The following are forbidden because they create tool-specific layout systems and architectural drift:

1. **Shell/layout overrides**
   - Overriding header, context strip, left/right workspace split, or follow-up action bar spacing/positioning.
   - Changing container widths/heights that redefine platform layout proportions.

2. **Tool-specific spacing scales**
   - Introducing custom spacing ramps (e.g., bespoke `6px/10px/14px/22px` systems) outside approved tokens.

3. **Hardcoded “marketing” whitespace**
   - Hero-like top padding, oversized section margins, and decorative vertical gaps.

4. **Global CSS leakage from tool scope**
   - Selectors targeting global shell classes, shared layout wrappers, or broad element selectors (`body`, global `h1/h2`, etc.) from tool styles.

5. **Ad hoc structural hacks**
   - Negative margins, absolute-position layout workarounds, or transform-based nudging used to bypass shell spacing rules.

---

## Practical Enforcement Checklist

A CSS change is acceptable only if all answers are **Yes**:

- Uses approved design tokens for visual values.
- Stays within local tool content scope.
- Does not modify shell structure or platform spacing rhythm.
- Preserves compact, execution-first density.
- Avoids large non-functional vertical whitespace.
- Introduces no new per-tool layout system.

If any answer is **No**, the change must be redesigned to align with platform CSS governance.
