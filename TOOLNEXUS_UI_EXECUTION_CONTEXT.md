# TOOLNEXUS UI Execution Context (LLM Handoff)

## SECTION 1 — Project Identity (Short)

- **Platform identity:** ToolNexus is currently implemented as an **execution workspace platform** with runtime + governance telemetry, not just static tool pages.
- **Canonical execution lifecycle in code:**
  - Request
  - Authority Resolution
  - Execution Snapshot
  - Runtime Execution
  - Conformance Validation
  - Telemetry
- **Stack reality:** `.NET 8`, `ASP.NET Core MVC`, `Razor (.cshtml)`, browser JS runtime modules under `wwwroot/js/runtime`, and PostgreSQL-focused persistence/migrations in infrastructure.

---

## SECTION 2 — Current UI Architecture (REAL IMPLEMENTATION)

### 2.1 Current layout structure

| Area | Files | Components / Views | Responsibility |
|---|---|---|---|
| Global web shell | `src/ToolNexus.Web/Views/Shared/_Layout.cshtml` | `_Header`, `_Footer`, `<main class="container">` | Shared site shell with command palette, theme/version scripts, and dynamic runtime loader gating. |
| Header/footer partials | `src/ToolNexus.Web/Views/Shared/_Header.cshtml`, `src/ToolNexus.Web/Views/Shared/_Footer.cshtml` | Topbar + global footer nav/meta | Global brand/nav/chrome; not execution-specific. |
| Tool page (primary runtime path) | `src/ToolNexus.Web/Views/Tools/ToolShell.cshtml` | `#tool-root[data-tool-root]`, `data-tool-input/output/actions` | Main runtime host for tool execution with runtime boot config in `window.ToolNexusConfig`. |
| Legacy/per-tool Razor views still present | `src/ToolNexus.Web/Views/Tools/*.cshtml` (e.g., `Tool.cshtml`, `JsonFormatter.cshtml`, `base64Encode.cshtml`) | Legacy page contracts | Historical/compatibility tool UIs; architecture is mixed. |
| Tool discovery pages | `src/ToolNexus.Web/Views/Tools/Index.cshtml`, `Category.cshtml` | Tool catalog + category grids | Non-runtime discovery and navigation. |
| Admin shell | `src/ToolNexus.Web/Areas/Admin/Views/Shared/_AdminLayout.cshtml` | `_AdminContextStrip`, `_AdminActionBar`, `_AdminAuditBanner` | Separate admin control-plane shell with Tabler styling and admin workspace slots. |

### 2.2 Current ToolShell state

- **Universal ToolShell:** Implemented as a default route outcome in `ToolsController` (`return View("ToolShell", viewModel)`), and most tool manifests are pinned to `"ViewName": "ToolShell"`.
- **Layout drift exists:**
  - Legacy views remain in `Views/Tools` and are still discoverable through manifest generation/discovery logic.
  - Global shell (`_Layout`) is website-oriented (hero/catalog/funnel styling support) while runtime shell is embedded inside page content, not an immutable platform frame.
- **Tool-specific layouts exist:**
  - Old Razor pages and many tool-specific CSS files (`wwwroot/css/tools/*`, `wwwroot/css/pages/*`).
- **Platform UX DNA violations (current):**
  - No strict immutable zones implemented as first-class components (`context strip`, strict `follow-up action bar` contract missing on tool runtime page).
  - Execution visibility is partially delegated to JS runtime widgets, not a stable top-level shell primitive.

### 2.3 Existing UI anchors

Requested anchors status:

| Anchor | Exists? | Location(s) |
|---|---|---|
| `data-tool-shell` | **Missing** | No matches in repo. |
| `data-tool-input` | **Present** | `Views/Tools/ToolShell.cshtml`, multiple `wwwroot/tool-templates/*.html`, runtime adapter can inject it. |
| `data-tool-status` | **Partial (admin-only, not runtime shell)** | `Areas/Admin/Views/Tools/Index.cshtml` rows use `data-tool-status` for enabled/disabled table filtering. |
| `data-tool-output` | **Present** | `Views/Tools/ToolShell.cshtml`, templates, runtime adapter. |
| `data-tool-followup` | **Missing** | No matches in repo. |

---

## SECTION 3 — Runtime → UI Contracts (CRITICAL)

### 3.1 ExecutionSnapshot DTO

- **Model:** `ExecutionSnapshot`
- **File:** `src/ToolNexus.Application/Models/ExecutionSnapshot.cs`
- **UI-relevant fields:**
  - `SnapshotId`
  - `Authority`
  - `RuntimeLanguage`
  - `ExecutionCapability`
  - `CorrelationId` / `TenantId`
  - `TimestampUtc`
  - `ConformanceVersion`
  - `PolicySnapshot`
  - `GovernanceDecisionId` / `GovernancePolicyVersion` / `GovernanceStatus` / `GovernanceDecisionReason` / `GovernanceApprovedBy`
- **Current exposure path:** not sent on main tool execute response directly; surfaced through ledger/admin APIs and telemetry context.

### 3.2 Runtime state enums/contracts

- **Authority enum:** `ExecutionAuthority` (`LegacyAuthoritative`, `UnifiedAuthoritative`, `ShadowOnly`) in `Services/Pipeline/ExecutionAuthority.cs`.
- **Conformance status contract:** validator normalizes execution `Status` to one of `Succeeded|Failed|Canceled|TimedOut` in `DefaultExecutionConformanceValidator`.
- **Governance status enum:** `GovernanceDecisionStatus` (`Approved`, `Denied`, `Override`) in `Models/GovernanceDecisionModels.cs`.
- **Frontend state handling:** mostly string-based labels (`Ready`, `Running`, etc.) in runtime JS, not strongly enum-bound to backend.

### 3.3 Capability envelope structure

- **Model:** `CapabilityRegistryEntry` with nested `CapabilityGovernanceMetadata`.
- **File:** `src/ToolNexus.Application/Models/CapabilityMarketplaceModels.cs`
- **Fields impacting UI/control plane:**
  - runtime/language/capability: `RuntimeLanguage`, `ExecutionCapabilityType`
  - rendering and complexity: `UiRenderingType`, `ComplexityTier`
  - activation/lifecycle: `ActivationState`, `Status`, `InstallationState`
  - governance metadata: `Authority`, `SnapshotId`, `PolicyVersionToken`, `PolicyExecutionEnabled`

### 3.4 Policy/governance data exposed to UI

- **Admin endpoints + models:**
  - Execution list/detail/snapshot via `src/ToolNexus.Api/Controllers/Admin/ExecutionsController.cs`
  - DTOs in `ExecutionLedgerModels.cs` include authority decision, conformance, snapshot fields.
- **Main tool UI:** receives execution response (`ToolExecutionResponse`) + runtime identity when execution succeeds/fails; governance/snapshot details are not fully promoted to first-class runtime UI capsules.

### 3.5 Contract example (effective merged shape from ledger/admin)

```json
{
  "id": "f7f6...",
  "toolId": "json-formatter",
  "executedAtUtc": "2026-03-10T12:00:00Z",
  "authority": "UnifiedAuthoritative",
  "conformance": {
    "isValid": true,
    "normalizedStatus": "Succeeded",
    "wasNormalized": false,
    "issueCount": 0
  },
  "snapshot": {
    "snapshotId": "0d3a...",
    "runtimeLanguage": "dotnet",
    "executionCapability": "standard",
    "conformanceVersion": "v1",
    "governanceDecisionId": "00000000-0000-0000-0000-000000000000"
  },
  "runtimeIdentity": {
    "runtimeType": "dotnet",
    "adapter": "DotNetExecutionAdapter",
    "workerType": "dotnet:standard",
    "fallbackUsed": false,
    "executionAuthority": "UnifiedAuthoritative"
  }
}
```

---

## SECTION 4 — Capability-Driven UI Status

- **Current influence path:**
  - `ToolShell.cshtml` injects `runtimeUiMode` + `runtimeComplexityTier` and operation schema into `window.ToolNexusConfig`.
  - `tool-auto-runtime.js` reads `uiMode`, `complexityTier`, and schema to decide generated UI behavior.
- **Mapper/resolver classes:**
  - Backend: manifest/descriptor shaping in `ToolManifestLoader`, `ToolRegistryService`.
  - Frontend: `tool-capability-matrix.js` detects lifecycle/template/dependency capabilities (technical capability detection, not governance capability mapping).
- **Hardcoded vs dynamic:**
  - Dynamic: schema-driven auto controls and mount mode inference.
  - Hardcoded: forbidden field prefixes, complexity tier thresholds, visual labels/states.
- **Missing mappings / risk:**
  - No full mapper from backend governance capability metadata (`CapabilityGovernanceMetadata`) to runtime capsules in user-facing tool shell.
  - Capability lifecycle states mainly visible in admin screens, weakly connected to execution-time UX.

---

## SECTION 5 — Execution State Machine

- **Backend states observed:**
  - Authority: `LegacyAuthoritative|UnifiedAuthoritative|ShadowOnly`.
  - Conformance status: `Succeeded|Failed|Canceled|TimedOut` (+ normalized fallback path).
  - Governance status: `Approved|Denied|Override`.
- **Frontend handling:**
  - Runtime controls use status text updates (`Ready`, run-progress, error states) inside JS (`tool-auto-runtime.js`, `tool-unified-control-runtime.js`, `tool-page.js`).
  - No canonical shared frontend enum mirroring backend contracts.
- **State origin:**
  - Execution state originates on backend pipeline (`UniversalExecutionEngine`, conformance validator).
  - UI currently derives display states from response success/error and local runtime events.
- **Duplication hotspots:**
  - Status labels repeated across legacy tool JS modules + unified runtime modules.
  - Both new runtime shell and legacy tool-page script implement output/status behavior.

---

## SECTION 6 — CSS / Design System Reality

- **Main CSS files:**
  - Tokens/base: `design-tokens.css`, `theme.css`, `base.css`, `ui-system.css`, `site.css`
  - Product/home layers: `home-system.css`, `product-transform.css`
  - Admin shell: `admin-shell.css`
  - Tool/page-specific files under `css/tools/*` and `css/pages/*`
- **Token system:** present (`design-tokens.css`) with typography/spacing/radius/motion/z-index variables.
- **Spacing system reality:** duplicated token definitions (`--space-*` repeated in multiple files, including `ui-system.css`) and inconsistent use of `space-*` vs section-gap custom vars.
- **Risk/status colors:** primarily theme variables and Tabler classes in admin; runtime status uses text + generic UI states rather than a strict platform status color contract.
- **Current CSS risks:**
  - High duplication across `site.css` and `ui-system.css`.
  - Tool-specific CSS proliferation causing layout inconsistency.
  - Existing page-shell spacing produces large vertical gaps (`--section-gap` etc.) that conflict with compact execution-workspace goals.

---

## SECTION 7 — Output Rendering System

- **Primary runtime output renderer:** `createUnifiedToolControl().renderResult()` in `wwwroot/js/runtime/tool-unified-control-runtime.js`.
  - Renders preview (`<pre>`) + expandable full payload (`<details><pre>`).
  - Serializes non-string payloads with JSON stringify.
- **Fallback/legacy rendering:**
  - `tool-page.js` maintains editor-based output handling (Monaco/CodeMirror/textareas depending on available deps).
  - `tool-page-result-normalizer.js` gates invalid runtime results to fallback messaging.
- **JSON/log/markdown/table support status:**
  - JSON: explicit support in both unified and legacy flows.
  - Logs: telemetry/log capture handled separately by runtime incident reporter/logger; not a dedicated output renderer.
  - Markdown/table: no first-class shared output renderer pipeline; tool-specific scripts may handle format-specific output.
- **Streaming output logic:**
  - No robust incremental stream renderer in end-user runtime path; admin monitoring uses periodic fetch polling.

---

## SECTION 8 — Follow-up Actions Implementation

- **End-user tool runtime:**
  - Actions are present as runtime buttons (`Run`, suggestion badge) inside unified control and tool-specific modules.
  - Legacy `tool-page.js` still owns copy/download helpers in fallback path.
- **Rerun/copy/export:**
  - Rerun = run button + tool module re-execution.
  - Copy/export implemented mainly in legacy/fallback script (`tool-page.js`).
- **Platform vs tool-specific action model:**
  - Mixed. Unified runtime defines a baseline action block, but many tool scripts still provide custom action behaviors.
- **Gap:** no explicit `data-tool-followup` contract/action bar zone in runtime page skeleton.

---

## SECTION 9 — Admin UI Alignment

- **Execution-related admin pages:**
  - Execution history + detail (`Areas/Admin/Views/ExecutionLedger/*`)
  - Runtime operations center (`Areas/Admin/Views/ExecutionMonitoring/Index.cshtml`)
  - Governance, capability marketplace, quality, architecture evolution, AI capability factory.
- **Governance monitoring:** present via dedicated governance views/controllers and monitoring cards.
- **Telemetry visualization:** present but mostly table/card + polling fetch scripts, not an integrated timeline/state machine visual model.
- **Missing runtime concepts in admin UI:**
  - No deep visual trace of request→authority→snapshot→execution→conformance pipeline as a single correlated flow surface.
  - Runtime identity and conformance are visible in data records, but not consistently normalized into shared UI components.

---

## SECTION 10 — Auto Runtime UI Generator (IMPORTANT)

- **Exists:** yes.
- **Architecture files:**
  - Runtime bootstrap orchestrator: `wwwroot/js/tool-runtime.js`
  - Auto runtime generator: `wwwroot/js/runtime/tool-auto-runtime.js`
  - Unified control component: `wwwroot/js/runtime/tool-unified-control-runtime.js`
  - DOM contract + adapter/validator: `tool-dom-contract.js`, `tool-dom-adapter.js`, `tool-dom-contract-validator.js`
- **Runtime inputs:**
  - Manifest (`/tools/manifest/{slug}`), `window.ToolNexusConfig.tool.operationSchema`, `runtimeUiMode`, `runtimeComplexityTier`, dependencies/template paths.
- **Behavior:**
  - Generates controls from schema, mounts unified control shell, executes tool via API, renders result, and emits observability telemetry.
- **Limitations:**
  - Complexity tier guardrails are coarse (`tier >= 4` + `uiMode=auto` error path).
  - Boundary between generated and legacy runtime remains transitional (adapters and fallback bridges still required).
  - Governance/runtime authority metadata is not strongly represented in auto-generated UI output strip.

---

## SECTION 11 — Testing Coverage (UI)

- **Playwright coverage exists:**
  - runtime mount/autodiscovery specs
  - smoke tool execution spec
  - DOM contract + visual regression specs
- **JS runtime/unit coverage exists:**
  - dedicated tests for runtime kernel, auto runtime, DOM adapter/contract, lifecycle adapter, observability, incident reporter, cleanup and normalization.
- **ASP.NET view contract coverage exists:**
  - Web tests for admin view contracts and tool shell SEO/contract tests.
- **Missing/weak UI coverage areas:**
  - Strict immutable workspace-zone contract tests for end-user ToolShell anchors (`data-tool-shell`, `data-tool-status`, `data-tool-followup`) are not enforced.
  - End-to-end test asserting governance/authority capsules are visible on tool execution surface is missing.

---

## SECTION 12 — Known UI Problems (Honest Analysis)

- **Layout inconsistency:**
  - Universal ToolShell exists but legacy per-tool pages/scripts/styles remain active in codebase.
- **Execution visibility gaps:**
  - Execution lifecycle stages are not explicitly visualized as immutable shell zones in main user runtime page.
- **Governance visibility gaps:**
  - Governance/snapshot data is mostly admin-facing; end-user runtime surface has limited authoritative context capsules.
- **State handling problems:**
  - Backend has structured authority/conformance contracts; frontend still uses ad-hoc status text and duplicated per-tool logic.
- **Duplication risks:**
  - CSS duplication + mixed runtime strategies (auto runtime + legacy bridge + page fallback) increase drift and regression risk.

---

## SECTION 13 — What MUST NOT Be Changed

Inferred invariants from code + architecture docs:

1. **Execution pipeline order must stay canonical**: request → authority resolver → snapshot → runtime execution → conformance validator → telemetry.
2. **Authority/governance decisions remain server-side**; UI can display but must not decide.
3. **Snapshot + telemetry identity fields are required contracts** (snapshot ID, authority, runtime identity, conformance metadata).
4. **Tool API contract compatibility must be preserved** (`/api/v1/tools/{slug}/{action}` with existing response semantics).
5. **Admin observability surfaces for runtime concepts must remain available** (executions, governance, capability lifecycle, incidents).

---

## SECTION 14 — Immediate Next Safe UI Step

**Implement one canonical ToolShell contract wrapper in `Views/Tools/ToolShell.cshtml` with explicit immutable anchor zones (`data-tool-shell`, `data-tool-status`, `data-tool-followup`) and map existing runtime status updates into that wrapper without changing backend execution APIs.**

