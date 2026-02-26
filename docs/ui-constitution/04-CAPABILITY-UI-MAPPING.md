# 04 — Capability to UI Mapping

## Purpose
Define deterministic mapping from effective capability grants (capability envelope) to visible UI behavior.

## Capability Categories
The platform recognizes the following capability categories:

- `execution`
- `ui`
- `data`
- `network`
- `privileged`

## Deterministic Mapping Rules
UI behavior is derived only from effective grants after policy and governance evaluation.

### Rule 1: Network Capability
- If `network` is effectively granted, the UI shows the network badge.
- If `network` is not effectively granted, the network badge is not shown.

### Rule 2: Privileged Capability
- If `privileged` is effectively granted, the UI enables the governance panel and requires explicit confirmation before privileged execution.
- If `privileged` is not effectively granted, privileged controls and privileged confirmation affordances are not shown.

### Rule 3: No Capability
- If the required capability for an action is not effectively granted, that action is hidden.

## Effective Grants Only
UI reflects effective grants only.

Inputs that must not drive UI access decisions:

- Raw client-side intent
- Ungoverned client payload fields
- Pre-policy capability declarations

## Governance Enforcement Rule
UI cannot bypass policy decisions.

Implications:

- Policy-denied actions remain non-executable even if client UI state is manipulated.
- Server authority and governance outcomes are the source of truth for executable actions.
- UI visibility and interactivity must stay consistent with current effective grants.

## Determinism Constraint
For a given execution context and effective capability envelope, the UI outcome is fixed and repeatable.

- Same grants => same visible actions and indicators.
- Grant changes => corresponding deterministic UI state change.
- No heuristic or stylistic variation is allowed in capability-to-behavior mapping.
