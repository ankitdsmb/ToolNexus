# ToolNexus — MASTER ARCHITECTURE CONTEXT (MAC)

Version: 1.0
Purpose: Permanent architecture memory anchor for ToolNexus.

This document defines immutable platform rules, architecture identity, UX DNA, and AI-agent constraints.

Any implementation MUST align with this file.

Related permanent lock artifact: `docs/PLATFORM-EVOLUTION-FREEZE.md`.

---

# 1. PLATFORM IDENTITY

ToolNexus is:

    Execution Workspace Platform

ToolNexus is NOT:

- tool website
- dashboard
- collection of pages.

Tools are execution capabilities inside a shared runtime workspace.

---

# 2. CORE ARCHITECTURE LOCK (IMMUTABLE)

These concepts must NEVER be redesigned:

- Universal Execution Engine
- Execution Authority Resolver
- Execution Snapshot
- Execution Conformance Validator
- Capability-driven execution model
- Policy/Governance evaluation layer

All new features must integrate through these layers.

No parallel execution paths allowed.

---

# 3. EXECUTION FLOW (CANONICAL)

Execution lifecycle:

Request
→ Authority Resolution
→ Execution Snapshot Freeze
→ Runtime Execution
→ Conformance Validation
→ Telemetry + Incident Reporting
→ Result

UI must reflect this lifecycle.

---

# 4. NON-NEGOTIABLE PLATFORM RULES

1. Client cannot influence execution authority.
2. Governance decisions must be server-controlled.
3. Execution must be observable.
4. Runtime identity must be visible.
5. Feature incomplete without admin visibility.

---

# 5. DATABASE RULES

DATABASE = PostgreSQL ONLY.

AI/Codex MUST:

- use PostgreSQL-compatible schema.
- avoid SQL Server syntax.
- use UUIDs for primary identities.
- add indexes for:
    - correlationId
    - tenantId
    - execution timestamps.

No in-memory substitutes for persistent domains.

---

# 6. EXECUTION LEDGER REQUIREMENT

Execution is a persisted artifact.

Required domains:

- ExecutionRun
- ExecutionSnapshot
- ConformanceResult
- GovernanceDecision reference.

Execution history must be queryable from admin UI.

---

# 7. GOVERNANCE MODEL

Governance decisions are immutable records.

Execution must reference decision IDs.

Lifecycle:

Draft → Review → Approved → Active → Deprecated.

No execution without approved lifecycle state.

---

# 8. RUNTIME IDENTITY CONTRACT

Runtime identity must be unified across:

- backend execution engine
- adapters
- telemetry
- frontend UI.

Identity includes:

- runtime type
- adapter
- authority
- fallback usage.

---

# 9. UI/UX DNA (IMMUTABLE)

Global layout:

HEADER
CONTEXT STRIP
WORKSPACE (LEFT INPUT / RIGHT OUTPUT)
FOLLOW-UP ACTION BAR

Rules:

- Structure never changes.
- Only content updates.
- Configuration panel stable during execution.
- Execution dynamics only in right panel.

---

# 10. EXECUTION UX PRINCIPLES

- Execution always visible.
- Status always present.
- Context capsules show system intelligence.
- One-click rerun.
- Output is interactive.

Stable structure + dynamic data = trust.

---

# 11. PLATFORM FEEL SIGNALS

Must always exist:

1. Persistent execution presence.
2. System identity visibility.
3. Instant follow-up actions.

---

# 12. EXECUTION GRAVITY RULE

Execution should feel easier than leaving the page.

Implementation:

- show last run summary
- keep output visible
- support instant rerun.

---

# 13. TOOL COMPLEXITY MODEL

Tier 1:
- auto UI
- minimal inputs.

Tier 2:
- advanced options hidden initially.

Tier 3+:
- custom runtime UI allowed.

No uncontrolled UI expansion.

---

# 14. ADMIN PLATFORM REQUIREMENTS

Every runtime concept must exist in admin UI:

- execution ledger
- snapshots
- governance decisions
- capability registry
- quality score.

If admin cannot see it → feature incomplete.

---

# 15. CAPABILITY MARKETPLACE RULES

Capabilities require lifecycle state.

Required states:

Draft
Review
Approved
Active
Deprecated.

Only Approved/Active capabilities executable.

---

# 16. AI CAPABILITY FACTORY RULES

AI may GENERATE.

Platform must VALIDATE.

Pipeline:

Generate
→ Craft Refinement
→ Validation
→ Governance Approval
→ Publish.

AI output NEVER directly published.

---

# 17. CRAFT LAYER PRINCIPLES

AI-generated tools must feel human-crafted:

- refined naming
- minimal input surface
- real examples
- confident language
- strong defaults.

---

# 18. OBSERVABILITY REQUIREMENTS

Telemetry must include:

- authority
- runtime identity
- conformance normalization
- execution snapshots
- fallback usage.

No silent execution paths.

---

# 19. TEST COMPLETENESS RULE

A feature is incomplete unless it includes:

- unit tests
- runtime tests
- browser tests
- integration tests.

No partial testing accepted.

---

# 20. AI AGENT STRICT RULES (CRITICAL)

AI/Codex MUST NOT:

- introduce new execution paths.
- redesign layout DNA.
- bypass governance.
- add SQL Server syntax.
- implement backend without admin visibility.
- create features without persistence.
- add tool-specific layouts.

If unsure → integrate via existing abstractions.

---

# 21. PLATFORM EVOLUTION LADDER

Current stage:

Level 2 → Unified Tool Platform.

Target next stage:

Level 3 → Execution Workspace.

Evolution must be layering, not redesign.

---

# 22. TOOLNEXUS GOLDEN PRINCIPLE

Capabilities evolve.

Execution contract DOES NOT.

---

# END