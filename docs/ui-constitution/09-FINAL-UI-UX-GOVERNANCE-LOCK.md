# 09 — FINAL UI/UX GOVERNANCE LOCK

Status: **Authoritative / Locked**
Scope: All ToolNexus UI implementation, templates, and AI-assisted UI changes.

This document finalizes and locks the ToolNexus UI/UX architecture. It may be polished for clarity, but its architectural meaning is immutable.

---

## SECTION 1 — PLATFORM IDENTITY (LOCKED)

ToolNexus is an **Execution Workspace Platform**.

ToolNexus is **not**:
- a marketing website,
- an article-first platform,
- a set of simple standalone tool pages.

Canonical execution lifecycle (immutable):

**Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry**

UI is a projection layer of this execution contract only.

---

## SECTION 2 — FINAL TOOL SHELL ARCHITECTURE

Immutable layout zones:
- HEADER
- CONTEXT STRIP
- MAIN CONTROL BAR (top)
- LEFT INPUT PANEL
- RIGHT OUTPUT PANEL
- OUTPUT TABS
- FOLLOW-UP ACTION BAR
- OPTIONAL SPONSORED / ADS ZONE

Rules:
- The structure never changes per tool.
- Tools render only inside their owned zones.
- Layout remains stable during execution.

Text architecture diagram:

```text
┌──────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├──────────────────────────────────────────────────────────────┤
│ CONTEXT STRIP                                                │
├──────────────────────────────────────────────────────────────┤
│ MAIN CONTROL BAR (top)                                       │
├──────────────────────────────────────────────────────────────┤
│ LEFT INPUT PANEL                  │ RIGHT OUTPUT PANEL       │
│                                   │ ┌──────────────────────┐ │
│                                   │ │ OUTPUT TABS         │ │
│                                   │ │ Result / Guide      │ │
│                                   │ │ Examples / Logs     │ │
│                                   │ └──────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ FOLLOW-UP ACTION BAR                                         │
├──────────────────────────────────────────────────────────────┤
│ OPTIONAL SPONSORED / ADS ZONE                                │
└──────────────────────────────────────────────────────────────┘
```

---

## SECTION 3 — TOOL SHELL DOM CONTRACT

Mandatory anchors:
- `data-tool-shell`
- `data-tool-context`
- `data-tool-input`
- `data-tool-status`
- `data-tool-output`
- `data-tool-followup`
- `data-tool-sponsored` (optional)

### `data-tool-shell`
- Owner: Platform.
- Purpose: Root ToolShell boundary and structural container.
- Allowed modifications: Data-state attributes (e.g., mode/template/status hooks), non-structural classes.
- Forbidden modifications: Renaming, removing, duplicating, reparenting, or replacing the root structure.

### `data-tool-context`
- Owner: Platform layout; runtime/governance capsules via platform bindings.
- Purpose: Render execution context (authority, policy, runtime identity, lifecycle, etc.).
- Allowed modifications: Capsule value/content updates through approved bindings.
- Forbidden modifications: Relocation, replacement, structural mutation, or hiding required context contract.

### `data-tool-input`
- Owner: Panel frame = Platform; form content = Tool (schema-first preferred).
- Purpose: Collect request/configuration input.
- Allowed modifications: Tool input fields and validation UI inside approved content area.
- Forbidden modifications: Collapsing/removing/repositioning the panel, or moving core controls outside anchor.

### `data-tool-status`
- Owner: Platform status presenter with runtime state payload.
- Purpose: Always-visible execution state surface.
- Allowed modifications: State/value transitions and approved status details.
- Forbidden modifications: Hiding, removing, replacing, or relocating status block.

### `data-tool-output`
- Owner: Panel frame = Platform; output payload = Runtime/tool adapters.
- Purpose: Primary execution output surface.
- Allowed modifications: Render result/guide/examples/log views inside output area.
- Forbidden modifications: Moving execution dynamics outside output region or mutating panel structure/order.

### `data-tool-followup`
- Owner: Platform action bar and policy; tool actions via approved metadata.
- Purpose: Workflow continuation actions after or around execution.
- Allowed modifications: Registering eligible follow-up actions through platform contracts.
- Forbidden modifications: Arbitrary layout systems, relocation, or bypass of platform action governance.

### `data-tool-sponsored` (optional)
- Owner: Platform monetization/configuration governance.
- Purpose: Optional sponsored continuation module beneath follow-up actions.
- Allowed modifications: Config-driven sponsored content rendering when enabled.
- Forbidden modifications: Mandatory rendering, execution interruption, or placement outside designated zone.

Legacy tools must map into these anchors without creating alternate shell structures.

---

## SECTION 4 — EXECUTION MODES (LOCKED)

Two supported modes:

1. **Partial Mode**
   - Embedded inside normal site shell.
   - Used for discovery entry.

2. **Workspace Mode**
   - Full-screen / OS-style execution experience.
   - Minimal distractions.

Rules:
- Both modes use the **same ToolShell**.
- Only surrounding chrome changes.
- No duplicated layouts.

Mode control:
- `data-mode` attribute and/or query parameter.

---

## SECTION 5 — OUTPUT TAB SYSTEM (FINAL)

Output tabs live inside the right output panel only.

Tabs:
- Result
- Guide
- Examples
- Logs

Rules:
- Tabs are interpretations/views of execution output.
- Guide markdown is secondary.
- Execution output remains the default tab.

---

## SECTION 6 — MARKDOWN STRATEGY (LOCKED)

Markdown is allowed only for:
- guide,
- examples,
- usage help.

Rules:
- Markdown renders inside output tabs.
- Markdown tabs are hidden by default.
- Markdown should be server-rendered when possible for SEO.
- ToolShell is not an article page.

---

## SECTION 7 — SEO ARCHITECTURE (DUAL PAGE MODEL)

Final model:

1. **Tool Overview Page**
   - SEO-heavy,
   - full markdown,
   - discovery content,
   - related tools.

2. **ToolShell Execution Page**
   - execution-first,
   - lightweight guide tab,
   - SEO secondary.

Rules:
- Overview page carries ranking weight.
- Execution page is optimized for workflow UX.

---

## SECTION 8 — RELATED TOOLS STRATEGY

Rules:
- Full related-tool discovery belongs on the overview page.
- ToolShell exposes lightweight contextual suggestions only.
- In ToolShell, related tools appear in the follow-up action bar.

Purpose:
- Workflow continuation, not navigation distraction.

---

## SECTION 9 — ADS / MONETIZATION ARCHITECTURE

Rules:
- Ads never interrupt execution workflow.
- Ads may appear only on:
  - overview pages, or
  - optional sponsored zone below follow-up bar.

Ads must be:
- optional,
- configuration-controlled,
- removable without layout break.

Preferred monetization:
- sponsored tools and workflow continuation surfaces.

---

## SECTION 10 — ADMIN TEMPLATE CUSTOMIZATION SYSTEM

Template governance:

Templates are **visual skins only**.

Templates may change:
- spacing density,
- visual styling,
- chrome appearance,
- color theme.

Templates must not change:
- ToolShell layout,
- DOM anchors,
- execution flow.

Admin panel requirement:
- Provide a **UI Template Selector** dropdown.

Application contract:
- Apply selected template via `data-template` attribute on ToolShell root.

---

## SECTION 11 — CSS GOVERNANCE (LOCKED)

Rules:
- Design tokens are the single source of truth.
- No per-tool layout systems.
- Execution density is preferred over marketing whitespace.
- Shell controls spacing rhythm and layout boundaries.

Template CSS must remain scoped and non-structural.

---

## SECTION 12 — AI GOVERNANCE RULES

All AI agents must:
1. Read `docs/ui-constitution/` first.
2. Respect the ToolShell contract.
3. Never invent new layout structures.
4. Preserve execution lifecycle UI.

Codex/AI may polish wording and readability, but cannot redefine architecture.

---

## SECTION 13 — IMPLEMENTATION ORDER (LOCKED)

1. ToolShell anchor implementation
2. Output tab integration
3. Workspace mode support
4. Template system integration
5. Context strip runtime capsules
6. Follow-up + sponsored zone
7. Visual polishing
8. Admin customization completion

---

## SECTION 14 — FINAL LOCK STATEMENT

This document is authoritative for all ToolNexus UI work.

If implementation conflicts with this architecture,
implementation must change — not the governance.
