# Phase 1 Audit Snapshot (Targeted Refactor Scope)

## Project Structure Map
- Backend/API: `src/ToolNexus.Api`, `src/ToolNexus.Application`, `src/ToolNexus.Infrastructure`
- Web/UI: `src/ToolNexus.Web`
- Frontend JavaScript tools: `src/ToolNexus.Web/wwwroot/js/tools`
- Frontend styles: `src/ToolNexus.Web/wwwroot/css`
- Tests: `tests/*` (.NET) and `tests/js` (new Jest/jsdom tests)

## Audited Components
- JS tool logic (detailed): `csv-to-json.js`
- Existing shared platform behavior reviewed through docs and existing tests.

## Findings
- **Global registration coupling**: Tool used `window.ToolNexusModules` directly (kept for compatibility, now guarded).
- **Initialization risk**: multiple calls could re-bind listeners and keyboard handlers.
- **No debounce on auto-convert**: frequent input events could trigger unnecessary conversions.
- **Input defensive checks**: parser previously assumed string input.
- **Test gap**: no JS unit/DOM tests for this tool.

## Refactor Risk Controls Applied
- Idempotent initialization guard.
- Debounced auto-convert input pipeline.
- Parser input type validation.
- Preserved URLs/contracts and existing `runTool('convert', input)` behavior.
- Added Jest/jsdom automated coverage for core logic + DOM interactions.
