# AI Capability Factory

This module implements governed AI tool generation as draft capabilities only.

## Lifecycle

1. Signals are stored in `ai_generation_signals`.
2. AI writes draft artifacts into `tool_generation_drafts`.
3. Validation writes append-only records to `generation_validation_reports`.
4. Governance and operator decisions are recorded in `generation_decisions` with telemetry event names.
5. Sandbox outputs are recorded in `generation_sandbox_reports`.
6. Activation only occurs through explicit operator-driven `ai.tool.activated` decision events.

## Safety Guarantees

- AI never activates directly; activation requires governance and operator decision records.
- Drafts with forbidden operations fail validation and remain inactive.
- Required indexes include `correlation_id`, `tenant_id`, and execution timestamps for audit traceability.
- Admin UX surface: **AI Capability Factory** panel with queue, validation, sandbox, and approval workflow visibility.
