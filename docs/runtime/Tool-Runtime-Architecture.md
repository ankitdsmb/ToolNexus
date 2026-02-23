# Tool Runtime Architecture

## Bootstrap lifecycle
1. `tool-runtime.js` reads `window.ToolNexusConfig` and resolves slug/runtime paths.
2. Manifest + template load prepares ToolShell container (`#tool-root`).
3. `tool-dom-contract-validator` audits required nodes.
4. `tool-dom-adapter` repairs legacy structures (`data-tool-*` anchors).
5. `tool-lifecycle-adapter` mounts module lifecycle (`create/init/destroy`) or compatibility path.
6. Runtime observability emits classification, fallback, and regression signals.

## Adapters
- **DOM Adapter** (`runtime/tool-dom-adapter.js`): upgrades legacy/partial markup to the DOM contract.
- **Lifecycle Adapter** (`runtime/tool-lifecycle-adapter.js`): resolves module contracts and returns cleanup.
- **Execution Normalizer** (`runtime/tool-execution-normalizer.js`): normalizes module shape while preventing accidental invocation of execution-only `runTool(action,input)` contracts during bootstrap.

## Runtime metadata contract
Legacy `runTool` modules can now explicitly declare runtime intent:

- `toolRuntimeType: "mount"` → treat `runTool` as mount/bootstrap contract.
- `toolRuntimeType: "execution"` → never call `runTool` during bootstrap.

Resolution order in the execution normalizer:
1. Explicit metadata (`toolRuntimeType`) on module/runtime capability/manifest.
2. Legacy fallback detection using `runTool` arity (`>= 2` => execution-only).

This keeps existing tools backward compatible while allowing explicit and deterministic runtime behavior for newly hardened modules.

## Legacy bridge flow
When modern lifecycle methods are absent:
1. Try normalized legacy lifecycle (`init`/mount helpers).
2. Try kernel fallback (`ToolNexusKernel.initialize`).
3. Invoke `legacy-execution-bridge` only as compatibility bridge.
4. If no UI mounts, trigger controlled fallback container.

## DOM contract system
Required anchors:
- `data-tool-root`
- `data-tool-header`
- `data-tool-body`
- `data-tool-input`
- `data-tool-output`
- `data-tool-actions`

Contract validation happens pre-mount; adaptation creates missing anchors to keep runtime deterministic.

## Error recovery path
- Runtime classifies failures (`error-classification-engine.js`) and logs stage metadata.
- Recoverable failures run adaptation and retry flows.
- Non-recoverable failures mount fallback content and emit observability events for CI + Playwright guards.

## Runtime Incident Reporting

Tool runtime now reports structured incidents without crashing the runtime surface.

### Incident schema

```json
{
  "toolSlug": "json-formatter",
  "phase": "bootstrap | mount | execute",
  "errorType": "contract_violation | runtime_error",
  "message": "...",
  "stack": "...",
  "payloadType": "html_element | string | object | ...",
  "timestamp": "ISO-8601"
}
```

### Behavior guarantees

- Runtime payload contract violations (HTMLElement action payloads, non-string actions, unsupported action shapes) return safe no-op responses.
- Runtime always records incidents through `runtime-incident-reporter` and never throws from the reporting path.
- Reporter queues, deduplicates by fingerprint, debounces burst traffic, and sends batched incidents to `POST /api/admin/runtime/incidents`.
- Admin Execution Monitoring includes `runtime_incident` records alongside existing execution/audit incidents with severity, message, count, and last occurrence.

## Tool Health Scoring (Admin)

Tool health is now exposed through `GET /api/admin/runtime/tool-health` and consumed by the Admin Dashboard Tool Health panel.

Response shape:

```json
[
  {
    "slug": "json-formatter",
    "healthScore": 61,
    "incidentCount": 5,
    "lastIncidentUtc": "2026-03-03T10:20:30Z",
    "dominantError": "legacy mismatch"
  }
]
```

Scoring model:

- Group incidents by `toolSlug`.
- `incidentCount` is the summed incident `count` across all fingerprints for the tool.
- Weighted incident count is computed by severity:
  - `critical` weight = `12`
  - `warning` weight = `5`
- `healthScore = max(0, 100 - weightedIncidentCount)`.
- `lastIncidentUtc` is the maximum `lastOccurredUtc` in the tool group.
- `dominantError` is the most frequent incident message for the tool (ties break by most recent occurrence).

Dashboard status colors map directly from score bands:

- Green (`healthy`) = `healthScore >= 85`
- Yellow (`degraded`) = `60 <= healthScore < 85`
- Red (`broken`) = `healthScore < 60`
