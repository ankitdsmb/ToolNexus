# TOOL PLATFORM VALIDATION REPORT

## GLOBAL SCORE (0–100)

**97.7**

### PER TOOL RESULTS

* **base64-decode** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **base64-encode** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **case-converter** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **css-minifier** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **csv-to-json** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **csv-viewer** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **document-converter** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **file-merge** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: FAIL | css ownership: PASS
* **html-entities** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **html-formatter** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **html-to-markdown** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **js-minifier** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **json-formatter** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **json-to-csv** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **json-to-xml** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **json-to-yaml** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **json-toolkit-pro** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: FAIL | css ownership: PASS
* **json-transform-studio** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **json-validator** — structure: PASS | layout: PASS | density: ACCEPTABLE | runtime safety: PASS | css ownership: PASS
* **markdown-to-html** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **regex-tester** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **sql-formatter** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **text-diff** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **text-intelligence-analyzer** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: FAIL | css ownership: PASS
* **url-decode** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **url-encode** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **uuid-generator** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **xml-formatter** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **xml-to-json** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS
* **yaml-to-json** — structure: PASS | layout: PASS | density: PROFESSIONAL | runtime safety: PASS | css ownership: PASS

### CRITICAL VIOLATIONS

* `src/ToolNexus.Web/wwwroot/js/tools/file-merge/main.js:1` — Runtime safety contract missing: init export, destroy export, runTool export, null-safe destroy
* `src/ToolNexus.Web/wwwroot/js/tools/json-toolkit-pro.js:1` — Runtime safety contract missing: runTool export
* `src/ToolNexus.Web/wwwroot/js/tools/text-intelligence-analyzer.js:1` — Runtime safety contract missing: runTool export

### QUICK FIX ACTION PLAN

* 1. Remove any shell anchor (`data-tool-*`) usage from tool templates; keep those anchors exclusively in ToolShell.
* 2. Remove shell-anchor selectors from tool CSS (`css/pages/*`, `css/tools/*`) and scope styling to `.tool-runtime-widget`/`.tool-local-*` only.
* 3. Remove `.tool-local-*` selectors from shell CSS (`site.css`, `ui-system.css`) and relocate to per-tool CSS where needed.
* 4. Reduce editor/container `min-height` values over 520px and major container padding over 32px to improve execution density.
* 5. Ensure each tool module exposes `init`, `destroy`, and `runTool`, with mount-only logic and null-safe destroy semantics.

### AUTO HEAL MODE

* **Violation:** `src/ToolNexus.Web/wwwroot/js/tools/file-merge/main.js:1` — Runtime safety contract missing: init export, destroy export, runTool export, null-safe destroy
  * **Why execution law fails:** runtime lifecycle contract is incomplete, so ToolShell cannot guarantee mount/execute/destroy safety.
  * **Minimal safe fix:** add missing `init`, `destroy`, or `runTool` exports in the existing module and keep execution logic inside `runTool` only.
* **Violation:** `src/ToolNexus.Web/wwwroot/js/tools/json-toolkit-pro.js:1` — Runtime safety contract missing: runTool export
  * **Why execution law fails:** runtime lifecycle contract is incomplete, so ToolShell cannot guarantee mount/execute/destroy safety.
  * **Minimal safe fix:** add missing `init`, `destroy`, or `runTool` exports in the existing module and keep execution logic inside `runTool` only.
* **Violation:** `src/ToolNexus.Web/wwwroot/js/tools/text-intelligence-analyzer.js:1` — Runtime safety contract missing: runTool export
  * **Why execution law fails:** runtime lifecycle contract is incomplete, so ToolShell cannot guarantee mount/execute/destroy safety.
  * **Minimal safe fix:** add missing `init`, `destroy`, or `runTool` exports in the existing module and keep execution logic inside `runTool` only.

### ARCHITECTURE SAFETY RESULT

**FAIL**

### CSS OWNERSHIP MATRIX

* **SHELL CSS OWNERSHIP:** `wwwroot/css/site.css`, `wwwroot/css/ui-system.css`
* **TOOL CSS OWNERSHIP:** `wwwroot/css/pages/*`, `wwwroot/css/tools/*`
* **Violations: Tool CSS → Shell anchors**
  * None
* **Violations: Shell CSS → Tool internals**
  * None
