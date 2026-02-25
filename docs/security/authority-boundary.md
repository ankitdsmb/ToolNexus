# Authority Boundary Hardening

## Objective

Client payloads must never influence execution authority.

## Enforced Boundary

ToolNexus now enforces authority decisions from server-controlled sources only:

- server configuration (`ExecutionAuthorityOptions`)
- governance admission decisions in the universal execution engine
- capability metadata from the server-side tool catalog (`ToolDescriptor.RuntimeLanguage`, `ToolDescriptor.ExecutionCapability`)

## Client Payload Rules

The server ignores authority-control fields from client options, including:

- `authority`
- `executionAuthority`
- `runtimeAuthority`
- `governanceAuthority`
- `language`
- `executionCapability`
- any option key that contains `authority` (case-insensitive)

These keys are stripped before request mapping and are never forwarded into universal execution authority selection.

## Security Incident Telemetry

When a client submits authority-control fields, ToolNexus emits a structured warning log as a security incident:

- message: `Security incident: authority override options were ignored...`
- metadata: tool id and blocked option keys

This telemetry creates an auditable signal for malicious payload authority injection and override attempts.

## Validation Coverage

The test suite covers:

- malicious payload authority injection sanitization
- authority override attempts using `language` and `executionCapability`
- resolver behavior that ignores client-provided risk-tier overrides
