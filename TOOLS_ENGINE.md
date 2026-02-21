# TOOLS_ENGINE

## Tool Creation Model
- Tool metadata originates in `tools.manifest.json` and per-tool manifest JSON files under `App_Data/tool-manifests`.
- Runtime descriptor resolution is via `ToolRegistryService` + `ToolManifestLoader`.

## Shared Tool Shell
- `ToolShell.cshtml` acts as universal wrapper for runtime mount point + SEO content blocks.
- Runtime bootstraps through `tool-runtime.js` and loads module/template/dependencies dynamically.

## Duplicated Logic Assessment
- Tool modules commonly split across multiple files (api/dom/app/index/normalizer/etc).
- Legacy bridge + modern runtime adapters coexist; valuable for compatibility but adds coordination overhead.

## Client vs Server Execution
- Client-safe action support exists (manifest `clientSafeActions`).
- Server execution remains canonical via API pipeline and executors.
- Hybrid execution increases resilience but requires strict parity tests.

## SEO Duplication
- Tool content can come from static manifest SEO fields and optional DB content (`ToolContentService`).
- Potential duplication/drift between content sources if editorial workflow is not governed.

## Performance Risks
1. Dynamic dependency loading + runtime orchestration can increase first-interaction latency.
2. Large module graph for tool ecosystem may hurt cache behavior and bundle churn.
3. Hybrid runtime fallback pathways increase complexity of hot-path debugging.
