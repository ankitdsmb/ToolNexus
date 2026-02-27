# PHASE 0 — Foundation Lock

This document is the **architecture memory lock** for ToolNexus phase progression.

All future phases **MUST reference this file** before proposing or implementing platform changes.

No execution architecture redesign is permitted through phase work unless explicitly approved as a platform-level architecture exception.

---

## 1. Platform Identity

ToolNexus is an **Execution Workspace Platform**.

ToolNexus is governed by a capability-driven runtime model where execution lifecycle integrity is the platform core.

ToolNexus is not a tool catalog, not independent tool pages, and not a UI-first project.

---

## 2. ToolShell Immutable Structure

The ToolShell layout is immutable and must remain:

1. **Header**
2. **Context Strip**
3. **Left Input Panel**
4. **Right Output Panel**
5. **Follow-up Action Bar**

Rules:

- Structural regions must not be reordered, removed, or replaced by tool-specific page layouts.
- Tools may update content inside regions but may not alter the global shell composition.
- Execution-centric interaction must remain anchored to Input (left) and Output (right).

---

## 3. Runtime Lifecycle States

Canonical lifecycle contract:

1. **Request**
2. **Authority Resolution**
3. **Execution Snapshot**
4. **Runtime Execution**
5. **Conformance Validation**
6. **Telemetry**

Rules:

- No side execution paths.
- No bypass of authority resolver.
- No bypass of governance/policy enforcement.
- No skipped conformance validation.
- Runtime fallback behavior must remain observable through telemetry.

---

## 4. Governance Rules

Governance is server-side, auditable, and immutable per execution decision boundary.

Mandatory rules:

- Client payload must not influence authority or policy decisions.
- Governance decisions must be recorded and traceable.
- Execution decisions must be observable in telemetry and admin surfaces.
- Runtime authority, policy outcome, and conformance context must be preserved as execution evidence.

---

## 5. UI Stability Requirements

UI stability is a platform trust requirement.

Required behavior:

- Global ToolShell structure remains stable during execution.
- Configuration UI in the input panel does not structurally shift while runtime states change.
- Execution dynamics (status, logs, outcomes, telemetry-facing feedback) are presented in the output panel.
- Cross-tool UX consistency is mandatory unless explicitly approved as a platform exception.

---

## Foundation Lock Enforcement

This file is a **memory lock artifact**.

Any future phase plan, implementation spec, or delivery PR must explicitly reference `docs/PHASE-0-FOUNDATION-LOCK.md` as a baseline architectural constraint document.
