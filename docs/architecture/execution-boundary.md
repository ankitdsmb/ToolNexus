# Execution Boundary: UI Suggests, Server Decides

## Platform Rule

**UI may suggest; server decides execution.**

ToolNexus enforces a hard boundary between client-side intelligence and server-side execution control.

### Client must not control execution governance

Client payloads **must not** be used to:

- choose execution authority
- choose runtime adapter
- modify capability class
- bypass conformance checks
- alter policy decisions

If client payload includes these fields, runtime must safely ignore them and continue with server-controlled execution.

## Responsibilities

### UI intelligence responsibilities

The UI runtime is responsible for:

- collecting user input for tool operations
- presenting contextual suggestions and assistive UX
- emitting best-effort telemetry for diagnostics
- submitting operation input payloads to server endpoints

### Server authority responsibilities

The server runtime is responsible for:

- resolving execution authority
- selecting runtime adapter
- enforcing capability class constraints
- enforcing conformance and policy decisions
- producing authoritative execution outcomes

## Safe vs unsafe behavior

### Safe behavior

- UI suggests a related tool based on user input context.
- UI sends business input fields (for example, `text`, `payload`, `format`).
- Server chooses authority/adapter/policy independent of client hints.

### Unsafe behavior

- UI sends `executionAuthority`, `runtimeAdapter`, or `capabilityClass` and expects them to be honored.
- UI attempts to set policy or conformance bypass flags.
- Client code treats policy outcomes as overridable by browser state.

## Runtime safety contract (client)

Client runtime safety validation is intentionally lightweight:

- detect forbidden execution-governance fields in outgoing payloads
- ignore those fields before request dispatch
- in development mode, log a warning for visibility
- do not fail user requests solely because forbidden fields were present

This preserves user experience while maintaining governance integrity.

## Telemetry guardrail

Client runtime emits an optional telemetry marker during request dispatch:

- `runtime.executionBoundaryRespected = true`

This tag supports debugging and regression detection around execution-boundary behavior.
