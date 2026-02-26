# ToolNexus UI Constitution — 03: Universal Runtime State Machine

## Purpose

This document defines the canonical UI runtime state machine for ToolNexus execution experiences.

It standardizes runtime state meaning and UI behavior across all capabilities and tools so execution UX remains consistent, auditable, and architecture-aligned.

## Canonical State Contract (Required)

Frontend implementations **must** use only the canonical states below:

1. `idle`
2. `validating`
3. `running`
4. `streaming`
5. `success`
6. `warning`
7. `policy-blocked`
8. `failed`
9. `canceled`

## Constitutional Rules

1. Frontend must use canonical states exactly as defined in this document.
2. No custom state labels are allowed in UI components, state stores, reducers, or execution widgets.
3. Backend state contracts are authoritative; frontend must map directly to backend-provided runtime states without reinterpretation.
4. If backend introduces a new state contract version, frontend must be updated to align with the authoritative backend contract before release.

## State Definitions and UI Behavior

| State | State meaning | Button behavior | Input lock behavior | Output behavior |
|---|---|---|---|---|
| `idle` | No execution is in progress. UI is ready for a new request. | Primary execute button enabled. Cancel disabled. Follow-up actions available only when prior output exists. | Inputs editable. | Show latest available output summary if present; otherwise show ready/empty execution panel. |
| `validating` | Request is undergoing pre-execution validation (schema, required fields, policy pre-checks, runtime readiness checks). | Execute button disabled. Cancel disabled unless backend explicitly reports cancelable validation (default disabled). | Inputs locked to prevent request mutation during validation. | Output panel shows validation progress/status; no runtime result stream yet. |
| `running` | Execution has been admitted and is actively running in runtime, but not yet emitting streamed output chunks. | Execute button disabled. Cancel enabled when backend marks execution cancelable. | Inputs locked. | Output panel shows active execution status with runtime metadata and pending result/log indicators. |
| `streaming` | Execution is active and producing incremental output, logs, or partial artifacts. | Execute button disabled. Cancel enabled when backend marks execution cancelable. | Inputs locked. | Output panel appends streamed content in-order with visible live status. Preserve prior chunks and timestamps. |
| `success` | Execution completed successfully and passed conformance without blocking issues. | Execute button enabled for rerun. Cancel disabled. Follow-up actions enabled per capability metadata. | Inputs unlocked. | Output panel shows finalized result set, completion metadata, and available follow-up actions. |
| `warning` | Execution completed with non-blocking warnings (for example normalization warnings or advisory conformance notes). | Execute button enabled for rerun. Cancel disabled. Follow-up actions enabled. | Inputs unlocked. | Output panel shows completed results plus clearly visible warning details and conformance notes. |
| `policy-blocked` | Execution was denied by policy/governance and did not run. | Execute button enabled after block is shown (subject to user edits). Cancel disabled. | Inputs unlocked after block response is received. | Output panel shows authoritative policy denial reason, governance metadata, and non-execution status. |
| `failed` | Execution or validation failed due to runtime, conformance, dependency, or system error. | Execute button enabled for rerun. Cancel disabled once terminal failure is reached. | Inputs unlocked after failure is terminal. | Output panel shows failure details, correlation metadata, and diagnostics/log references when available. |
| `canceled` | Execution was canceled after admission or while running/streaming, and is now terminal. | Execute button enabled for rerun. Cancel disabled once cancellation is confirmed terminal. | Inputs unlocked after terminal cancel confirmation. | Output panel shows cancellation status, partial output (if any), and cancellation timestamp/metadata. |

## Implementation Notes (Normative)

- These states are platform-wide and apply to all ToolNexus capability surfaces.
- UI text, badges, and visual treatment may vary by design system theme, but state identity must remain canonical.
- State transitions should be driven by backend execution lifecycle events and authoritative API payloads.
- Client-side derived sub-statuses (e.g., spinner labels) are permitted only as presentation details and must not replace canonical state identity.

## Compliance Checklist

- Uses only canonical states listed in this document.
- Does not introduce aliases or tool-specific runtime labels.
- Reflects backend state contract as source of truth.
- Preserves stable workspace layout while updating only execution state data.

