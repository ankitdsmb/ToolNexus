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
