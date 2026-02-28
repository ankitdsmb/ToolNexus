# Runtime DOM Contract Fix

## Objective
Ensure runtime bootstrap never validates the DOM contract before ToolShell anchors are present, and preserve visible runtime state even when module resolution fails.

## Bootstrap Order (implemented)
1. ToolShell anchor scaffold is ensured (`data-tool-shell`, `data-tool-context`, `data-tool-input`, `data-tool-status`, `data-tool-output`, `data-tool-followup`).
2. Dependencies and module resolution execute.
3. DOM contract validation executes after module resolution.
4. Runtime lifecycle mount executes after validation.

## Failure Handling
- On module import failure, the ToolShell stays rendered.
- Runtime sets explicit error state (`data-runtime-state="error"`).
- Status and output areas receive runtime error content.
- Empty DOM is prevented via ToolShell fallback anchors.

## Tests Added
- Runtime mount anchor test verifying:
  - `data-tool-shell`
  - `data-tool-context`
  - `data-tool-status`
  - `data-tool-followup`
- Regression coverage to ensure tools mount without `dom_contract_failure` events and with valid DOM contract validation.

## JSON Formatter Result
`json-formatter` now bootstraps through the stabilized order without triggering DOM contract runtime assertions, including module-missing fallback paths.
