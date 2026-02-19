# Frontend Tool Platform Consolidation Report

## Phase 1 — Platform Discovery Matrix

Discovery was performed across `src/ToolNexus.Web/wwwroot/js/tools/*.js` by inspecting initialization hooks, event subscriptions, and explicit teardown support.

| Tool | Init Pattern | Event Ownership | Has Destroy | Risk Level |
|---|---|---|---|---|
| base64-decode.js | DOMContentLoaded | KeyboardEventManager | Yes | MEDIUM |
| base64-encode.js | DOMContentLoaded | Direct global keydown listener | No | HIGH |
| case-converter.js | DOMContentLoaded | Direct global keydown listener | No | HIGH |
| css-minifier.js | DOMContentLoaded | Direct global keydown listener | No | HIGH |
| csv-to-json.js | DOMContentLoaded | Root element listeners only | No | MEDIUM |
| csv-viewer.js | DOMContentLoaded | Direct global keydown listener | No | HIGH |
| html-entities.js | DOMContentLoaded | Root element listeners only | No | MEDIUM |
| html-formatter.js | DOMContentLoaded | Direct global keydown listener | No | HIGH |
| html-to-markdown.js | DOMContentLoaded | Direct global keydown listener | No | HIGH |
| js-minifier-ui.js | Module export only | Direct global keydown listener | No | HIGH |
| json-formatter.js | DOMContentLoaded | Direct global keydown listener | No | HIGH |
| json-to-xml.js | Module export only | Direct global keydown listener | No | HIGH |
| text-diff.js | Module export only | Direct global keydown listener | No | HIGH |
| url-decode.js | DOMContentLoaded | Root element listeners only | No | MEDIUM |
| url-encode.js | DOMContentLoaded | Kernel + root listeners | Yes | LOW |
| xml-formatter.js | Module export only | Direct global keydown listener | No | HIGH |
| xml-to-json.js | Module export only | Direct global keydown listener | No | HIGH |

## Phase 2 — Architecture Smell Detection

### High-risk patterns
- Multiple bootstrapping styles (`DOMContentLoaded`, ad-hoc module side effects, and implicit class constructors).
- Tool code attaching global listeners (`document/window` keydown) without deterministic teardown.
- Initialization logic coupled directly to `document.querySelector` in tool entrypoints.
- Lifecycle ownership spread across per-tool hacks instead of a central registry.

## Phase 3 — Introduced Tool Platform Kernel

A shared `ToolPlatformKernel` was added to centralize lifecycle ownership.

### Kernel responsibilities now implemented
- Standardized tool registration and mount path.
- Deterministic destroy path and root deregistration.
- Lifecycle state tracking (`created`, `initialized`, `destroyed`, `missing`).
- Test-only reset for leak validation.

## Phase 4 — Standard Tool Blueprint

Blueprint documented for future migrations:

```
tool-name/
   tool.app.js
   tool.api.js
   tool.dom.js
   tool.test.js
```

Separation contract:
- `app`: lifecycle and wiring
- `api`: business logic
- `dom`: rendering + interaction

## Phase 5 — Event Platform Integration

- `url-encode` runs through kernel lifecycle and continues to use `KeyboardEventManager` for root-scoped shortcuts.
- `base64-decode` migrated from raw global keydown to `KeyboardEventManager` and received deterministic `destroy()` cleanup.

## Phase 6 — Platform QA Pattern

Shared utilities added for tests:
- `createTestRoot()`
- `mountTool()`
- `destroyTool()`

These utilities standardize mount/unmount and event isolation tests.

## Phase 7 — Migration Strategy

1. **Immediate priority**: keyboard-heavy tools with direct global listeners (HIGH risk list above).
2. **Next**: tools with mount hacks and no teardown.
3. **Final**: module-only tools as they are upgraded to kernel lifecycle wrappers.

## Phase 8 — Platform Validation

Validation targets and current status:
1. **Listener Cardinality**: verified in tests for kernelized `url-encode` flow.
2. **Lifecycle Safety**: remount stress tests run for 50 cycles with no listener leaks.
3. **Initialization Consistency**: kernelized entrypoints added for `url-encode` and `base64-decode`.

## Phase 9 — Engineering Outcome Report

### Platform Before
- Tool initialization styles: mixed and inconsistent.
- Lifecycle consistency: largely implicit; destroy often missing.
- Event ownership: many direct document/window listeners.

### Platform After
- Unified lifecycle: `create(root)`, `init()`, `destroy()` supported via kernelized entrypoints.
- Kernel ownership: registration + lifecycle state tracked centrally.
- Event model: keyboard shortcuts routed through `KeyboardEventManager` for migrated tools.

### Architecture Improvements
- Standardized lifecycle contract.
- Shared lifecycle infrastructure (`ToolPlatformKernel`).
- Reduced duplication via shared test utilities and kernel mount path.

### Remaining Migration Work
Legacy patterns still in place for:
- `base64-encode.js`
- `case-converter.js`
- `css-minifier.js`
- `csv-viewer.js`
- `html-formatter.js`
- `html-to-markdown.js`
- `js-minifier-ui.js`
- `json-formatter.js`
- `json-to-xml.js`
- `text-diff.js`
- `xml-formatter.js`
- `xml-to-json.js`
