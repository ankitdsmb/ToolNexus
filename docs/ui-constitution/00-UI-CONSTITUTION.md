# ToolNexus UI Constitution

## 1) Platform Identity
- ToolNexus UI is the interface of an **Execution Workspace Platform**.
- The UI represents a unified execution runtime, not a collection of standalone tool pages.
- Product framing, navigation, and interaction patterns must reinforce workspace continuity.

## 2) Core Execution Lifecycle (Immutable)
All UI surfaces must align to the canonical lifecycle:

**Request → Authority Resolution → Execution Snapshot → Runtime Execution → Conformance Validation → Telemetry**

- No UI pattern may imply or introduce alternate execution paths.
- Lifecycle visibility must remain explicit across execution states.

## 3) UI Philosophy
### Execution-first
- Interface priority is initiating, observing, and iterating executions.
- Execution context and outcomes take precedence over decorative presentation.

### Governance visible
- Authority, policy, and runtime signals must be visible as first-class platform context.
- Governance visibility is mandatory for trust and auditability.

### Stable layout
- Platform layout remains structurally stable during execution.
- Dynamic behavior occurs through state/data updates, not structural rearrangement.

## 4) Architecture Invariants
- The UI is a **projection layer** of server-governed execution state.
- Authority and governance decisions are made server-side only.
- Client interactions may request execution, but must not determine authority outcomes.

## 5) Non-goals
- No marketing-style UI paradigms.
- No per-tool layout systems that fragment platform structure.
- No design direction that weakens execution workspace consistency.

## 6) AI Collaboration Rule
- All AI agents and contributors must read this constitution before proposing or implementing UI changes.
- Any UI change that conflicts with this constitution is invalid.
