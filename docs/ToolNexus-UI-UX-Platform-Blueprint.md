# ToolNexus UI/UX Platform Blueprint (Execution-First UX)

**Version:** 1.0  
**Date:** 2026-02-26  
**Audience:** Architects, UI/UX engineers, frontend engineers, platform engineers, QA, and AI/Codex agents  
**Purpose:** This document captures the *complete UX philosophy, visual DNA, execution model, and platform maturity guidance* for ToolNexus so future sessions and contributors can immediately operate at the same architectural maturity.

---

## 1. Executive Summary

ToolNexus is **not a tool website**.  
ToolNexus is a **developer execution platform**.

UI/UX decisions must reinforce:

- Execution-centric workflows
- Governance visibility
- Predictable structure
- High information density
- Low-friction iteration

The core principle:

> Stable Structure + Dynamic Data = Developer Trust

---

## 2. Product Identity

### 2.1 What ToolNexus IS

- A capability-driven execution platform
- A unified runtime workspace
- A governed execution environment
- A developer work surface

### 2.2 What ToolNexus is NOT

- A marketing-style dashboard
- A collection of unrelated tools
- A form-submit-result website

---

## 3. Platform UX Principles (Non-Negotiable)

1. **Execution First**
   - UI must always feel ready to execute.

2. **Predictability**
   - Same layout across all tools.
   - No mental context switching.

3. **Structural Stability**
   - Layout never shifts during execution.

4. **Visible System Intelligence**
   - Runtime, policy, risk, authority visible.

5. **Progressive Complexity**
   - Simple first; advanced only when needed.

6. **Zero Friction Actions**
   - Primary actions always visible.

7. **Information Density**
   - Dense but readable, developer-oriented.

---

## 4. Visual DNA Map (Immutable Layout Identity)

This defines the permanent platform skeleton.

```
┌────────────────────────────────────────────┐
│ PLATFORM HEADER (GLOBAL)                   │
├────────────────────────────────────────────┤
│ TOOL CONTEXT STRIP (Execution metadata)    │
├────────────────────────────────────────────┤
│                                            │
│              TOOL WORKSPACE                │
│                                            │
│   LEFT (Input)      RIGHT (Output)         │
│                                            │
├────────────────────────────────────────────┤
│ FOLLOW-UP ACTION BAR                       │
└────────────────────────────────────────────┘
```

### Rule

Tools NEVER change this structure.

Only content changes.

---

## 5. Header DNA

Target height: **64–72px max**

Contains:

- Logo
- ToolNexus label
- Tool name
- Environment tag

Must NOT include:

- Large descriptions
- Excessive spacing
- Hero-style visuals

Goal: orientation, not explanation.

---

## 6. Tool Context Strip (Critical)

Purpose: make governance and runtime intelligence visible.

Height: 36–40px.

Display capsules such as:

- Runtime: Auto / DotNet / Python
- Risk: Low / Medium / High
- Policy: Admitted / Denied
- Lifecycle: Active
- Authority: Legacy / Unified / Shadow

Rules:

- Runtime-driven (bound to execution snapshot/context)
- Position fixed
- Data updates allowed; layout changes forbidden

---

## 7. Workspace DNA (Core Experience)

Desktop ratio:

- Left panel: 38–42%
- Right panel: 58–62%

Why:

- Inputs need less space
- Outputs/logs need more space

Mental model:

```
Configure  →  Observe
```

---

## 8. Input Panel DNA

Hierarchy:

1. Input fields
2. Validation summary
3. Actions section

Action rules:

- Primary execute button: full width
- Secondary actions: compact row below

Inputs must remain stable during execution.

---

## 9. Execution Status DNA (Right Panel Top)

Always visible.

Height: 48–56px.

Example states:

- READY
- QUEUED
- RUNNING
- SUCCESS
- FAILED
- POLICY_DENIED
- NORMALIZED

Must map to a shared runtime state contract.

---

## 10. Execution UI Stability (Critical Rule)

Configuration UI must NEVER structurally change during execution.

Forbidden:

- collapsing input panel
- moving buttons
- replacing input layout
- resizing major regions

Allowed:

- disabling inputs subtly
- showing spinner/overlay if needed

All execution dynamics belong in the right panel.

---

## 11. Output Panel UX

Output must be adaptive:

- JSON → Monaco read-only viewer
- Logs → streaming view
- Markdown → rich render
- Tables → data grid

Output is interactive:

- expand sections
- copy values
- compare runs
- export

---

## 12. Follow-Up Action Bar

Capability-driven actions only.

Examples:

- Re-run
- Copy output
- Export
- View logs
- Compare previous run

No tool-specific random actions.

---

## 13. The 3 Platform-Feel Signals

1. Persistent execution presence
   - Status shown even when idle.

2. System identity visibility
   - Runtime / authority / policy visible.

3. Instant actionability
   - Next actions immediately available.

---

## 14. Execution Gravity (Retention UX)

Goal: execution feels easier than leaving the page.

Four forces:

1. Visible history
2. Low-friction rerun
3. Progressive output discovery
4. Platform awareness

Implementation:

- show last execution summary
- always expose rerun
- keep prior results visible

---

## 15. VS Code UX Rules (Adapted)

1. Stable layout
2. Progressive complexity
3. Immediate feedback
4. Surface area control
5. Command-driven UX
6. Context awareness
7. Non-blocking UX
8. Visibility of state
9. Shortcut-first design
10. Visual calm

---

## 16. ToolNexus Evolution Ladder

1. Tool Website
2. Unified Tool Platform (current)
3. Execution Workspace (next)
4. Intelligent Platform
5. Invisible Execution Layer
6. Capability Platform

Rule:

Evolution is layering, not redesign.

---

## 17. UI Technology Recommendations

### Core UI

- Tailwind CSS
- shadcn/ui
- Radix UI
- Lucide icons

### Editors / Rich Inputs

- Monaco Editor (priority)
- CodeMirror 6 (lightweight cases)
- CKEditor 5 (admin rich text)
- TipTap (Notion-like editing)

### Markdown / Content

- react-markdown
- remark-gfm
- rehype-highlight
- MDX (advanced docs)

### Syntax Highlighting

- Shiki (preferred)
- Highlight.js (fallback)

### Data UX

- TanStack Table
- AG Grid (enterprise-heavy use)

### Forms / Validation

- React Hook Form
- Zod

### Motion / Interaction

- Framer Motion (subtle only)
- sonner or react-hot-toast

### Layout

- react-resizable-panels

### Advanced UX

- cmdk (command palette)
- XState (execution lifecycle state machine)
- react-virtual (large lists/logs)

---

## 18. Architecture Alignment Map

| UI Component | Runtime Source |
|---|---|
| Context Strip | ExecutionSnapshot |
| Status Bar | Runtime State Contract |
| Output Panel | Conformance Result |
| Capsules | Authority + Policy |
| Follow-up Actions | Capability metadata |

---

## 19. Non-Goals (Important)

Do NOT:

- create tool-specific layouts
- introduce marketing-style dashboards
- animate layout shifts
- hide execution details
- allow UI to influence authority decisions

---

## 20. Admin UX Requirements (Visibility Alignment)

Admin must mirror runtime concepts:

- Execution history
- Snapshot metadata
- Governance decisions
- Runtime identity
- Quality score

If runtime concepts are invisible to admin, the platform is incomplete.

---

## 21. UX Implementation Checklist

Before calling UI complete:

- [ ] Stable layout under execution
- [ ] Context strip runtime-driven
- [ ] Status always visible
- [ ] Rerun available
- [ ] Output adaptive rendering
- [ ] Follow-up action bar implemented
- [ ] Split panels resizable
- [ ] Keyboard shortcuts supported
- [ ] Command palette available
- [ ] Last execution summary shown

---

## 22. Coding Standards for UI Work

- Use shared components only.
- No per-tool layout changes.
- All execution UI reads runtime state contract.
- Use capability metadata instead of ad-hoc logic.
- Keep visual noise low.

---

## 23. Future-Proofing Notes

This UX supports:

- Invisible UI execution
- Inline execution
- AI-generated tools
- Capability marketplace
- Multi-language runtime expansion

Do NOT redesign Visual DNA when adding these.

Layer onto existing structure.

---

## 24. Key Mental Model (Read Often)

ToolNexus is:

```
Execution Workspace Platform
```

Not:

```
Tool Pages
```

---

## 25. Final Platform Principle

> Capabilities evolve.  
> Execution contract and workspace DNA do NOT.

---

## 26. Appendix — Quick Reference Cheatsheet

### Golden Rules

- Structure stable, data dynamic.
- Left config, right execution.
- Execution always visible.
- Governance visibly surfaced.
- Actions immediately available.

### Biggest UX Mistake to Avoid

Mixing configuration UI with execution state UI.

---

End of document.
