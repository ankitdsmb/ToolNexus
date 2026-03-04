# ToolNexus Architecture & Functional Discovery Report

## Scope
This report documents current-state architecture discovery across ToolNexus before implementing the **Website CSS Performance Analyzer** capability.

---

## 1) Solution Architecture

### Projects and responsibilities
- **ToolNexus.Web**: Razor-rendered product UI, tool shell pages, runtime bootstrapping, web-facing endpoints (including some tool-specific endpoints like document conversion).
- **ToolNexus.Api**: authenticated execution API (`/api/v1/tools/*`), admin APIs, rate limiting, API middleware/security stack.
- **ToolNexus.Application**: tool execution pipeline, orchestration, policies, caching/rate/concurrency steps, service-layer contracts.
- **ToolNexus.Infrastructure**: EF Core persistence, repositories, executor registration, cache providers, startup phases, hosted workers.
- **ToolNexus.Domain**: domain model layer for cross-cutting business abstractions.
- **ToolNexus.ToolLibrary**: reusable tool-level transformation logic.
- **ToolNexus.ConsoleRunner**: non-web execution host for command-line orchestration/testing.

### Interaction model
- Web and API both compose Application + Infrastructure.
- Browser uses ToolShell + JS runtime from Web, then calls execution endpoints (typically `/api/v1/tools/{slug}/{action}`) for server execution.
- Infrastructure-backed repositories and workers persist and process execution/audit telemetry.

---

## 2) Tool Execution Architecture (ToolShell / runtime)

### Runtime components
- `ToolShell.cshtml` provides server-rendered page frame, SEO metadata, and runtime config injection.
- `ToolShellPartial.cshtml` provides canonical runtime anchor nodes and mounting surface (`#tool-root`).
- `tool-runtime.js` is the lifecycle orchestrator (manifest fetch, template load, DOM contract checks, module import/mount, fallback paths, observability).
- `tool-page.js` is legacy-style action runner/editor flow for API-bound actions.
- `tool-lifecycle-adapter.js` normalizes tool modules into a create/init/destroy lifecycle contract.

### How loading/execution works
1. Tool route `/tools/{slug}` renders ToolShell + runtime config.
2. JS runtime discovers `#tool-root` and slug from data attributes.
3. Runtime fetches manifest (`/tools/manifest/{slug}` by default).
4. Runtime loads template + styles + dependencies.
5. Runtime validates DOM contract and mounts lifecycle module.
6. `runTool(action,input)` path executes business action; depending on module it can be local JS or API call.

### Client/server interaction
- Browser execution commands use fetch POST to tool execution API.
- Runtime also exposes telemetry/error channels and mounts fallback UI when contracts fail.

---

## 3) Tool Registration & Routing

### Registration sources
- `App_Data/tool-manifests/*.json` as primary web manifests.
- Auto-generation from `Views/Tools/*.cshtml` when manifest missing.
- Platform-level `tools.manifest.json` fallback discovery.

### Registry + lookup
- `ToolManifestLoader` normalizes paths/dependencies/styles and materializes manifests.
- `ToolRegistryService` builds descriptor map keyed by slug.

### Routing
- `ToolsController` route `/tools/{segment}` resolves category vs tool slug.
- Tool manifest endpoint at `/tools/manifest/{slug}` exposes runtime descriptor payload.

### Adding a new tool (current pattern)
1. Add tool metadata to platform manifest.
2. Add `App_Data/tool-manifests/<slug>.json` with module/template paths.
3. Add JS runtime module and HTML template.
4. Add backend executor and/or controller path if server-backed.

---

## 4) API Project Architecture

### Controllers
- Primary execution controller: `/api/v1/tools/{slug}/{action}` in `ToolNexus.Api.Controllers.ToolsController`.
- Admin controllers in `Controllers/Admin/*` for governance, runtime incidents, analytics, quality scores, execution ledgers.

### Services and pipeline
- API delegates execution to `IToolService` (Application layer).
- `ToolExecutionPipeline` runs ordered steps: validation, policy enforcement, rate/concurrency, cache, execution, telemetry/metrics.

### Background/diagnostic jobs
- Endpoint diagnostics hosted service in API.
- Most heavy background processing (telemetry queue, audit outbox) is in Infrastructure and shared across Web/API hosts.

### Database usage
- API and Web both use shared EF contexts via Infrastructure DI.

### Web <-> API communication
- Tool pages receive `apiBaseUrl` and execution path prefix from Web MVC model and call API endpoints via browser fetch.

---

## 5) Server-Side Tool Execution Model

### Current execution modes
- **Client-side**: modules can execute locally in `runTool` (e.g., css minifier today).
- **Server-side**: API `/api/v1/tools/*` pipeline invokes `IToolExecutor` implementations.
- **Hybrid**: UI/runtime in browser + execution by API or specialized Web endpoint (e.g., document converter upload endpoint).

### Placement guidance for new CSS analyzer
- **Playwright scanning, multi-page crawl, CSS coverage analysis**: server-side/background only.
- **Optimized CSS file generation/download packaging**: server-side.
- **UI controls/report rendering**: web runtime + SSR pages.

---

## 6) Database Structure & Storage Strategy

### Existing persistence shape
- Core content tables (`ToolContents`, `ToolDefinitions`, categories/faq/related).
- Execution policy and eventing (`ToolExecutionPolicies`, `ToolExecutionEvents`, `ExecutionRuns`, snapshots, conformance, authority decisions).
- Governance/admin/audit tables (`audit_events`, `audit_outbox`, dead letter, runtime incidents, quality scores, decisions).
- Optimization/intelligence tables already exist for recommendation/simulation/outcome and graph-like intelligence snapshots.

### Caching strategy
- In-memory + distributed cache abstraction (`RedisToolResultCache` with memory first + redis fallback + circuit breaker).
- Execution pipeline cache step for cacheable tool manifests.

### Proposed storage for CSS analyzer
Create dedicated tables:
- `css_scan_jobs` (status, target URL, limits, requester, policy decisions, timestamps)
- `css_scan_pages` (per crawled URL, status, timing, bytes)
- `css_selector_observations` (selector usage frequency + source stylesheet)
- `css_optimization_artifacts` (optimized css blob metadata, hash, downloadable asset path)
- `css_public_reports` (public slug/token, canonical URL, summary SEO payload)

Reference existing execution/audit tables for cross-cutting telemetry; avoid overloading generic execution result columns with large scan payloads.

---

## 7) Security Model & Required Extensions

### Existing controls
- Auth: JWT + cookie smart scheme.
- Authorization policies for admin and tool actions.
- API-wide rate limiting by remote IP token bucket.
- Request validation via `[ApiController]` + data annotations.
- URL SSRF protection helper exists (`UrlSecurityValidator`) against localhost/private ranges and DNS-resolved private IPs.
- Security/logging middleware stack includes security headers and sanitized error handling.

### Required new controls for CSS scanner
1. **Mandatory SSRF guard** on every user-supplied URL using hardened validator + DNS rebinding protections.
2. **Network egress allow/deny policy** (block RFC1918, metadata endpoints, internal TLDs).
3. **Crawler request budget limits** (page count, depth, total bytes, total time).
4. **Per-user/IP quotas** for scan creation endpoints.
5. **Safe artifact serving** (signed tokens + expiry for downloads/public reports).
6. **Input canonicalization** and strict hostname normalization before persistence.

---

## 8) Performance Constraints

### Current constraints in platform
- Pipeline per-tool concurrency cap (`MaxConcurrency` policy; semaphore limiter).
- API edge rate limit policy.
- Background queue uses unbounded channel with single reader worker for telemetry.
- Audit outbox worker has retry and lease semantics.

### Implication for Playwright scans
Playwright crawling is heavier than current transform tools and should **not** run inline in API request threads. Use queued job orchestration + dedicated worker pool with:
- bounded queue,
- hard worker concurrency cap,
- lease/heartbeat + cancellation,
- resumable job state.

---

## 9) Existing Tool Patterns

### Client-only example
- `css-minifier` runtime module executes local minification in browser module (`runCssMinifier`) without server dependency.

### Server-backed example
- Generic tool actions through `/api/v1/tools/{slug}/{action}` and backend executors.

### Hybrid example
- `document-converter`: runtime UI in browser + binary upload execution to server endpoint (`/api/tools/document-converter/run`) returning downloadable file.

### Structural pattern commonality
- Tool module exports lifecycle (`create/init/destroy`) + `runTool` execution entry.
- Manifest declares slug/module/template/styles.

---

## 10) SEO Architecture

### Rendering mode
- Razor MVC SSR pages with route-driven rendering (`/tools/{slug}`), not pure SPA.
- SEO metadata (`Title`, `Description`, canonical, JSON-LD) injected server-side via `ToolShell`.

### Public report integration recommendation
Add SSR route such as:
- `/tools/css-report/{reportSlug}`

Controller should load persisted report summary and render indexable page with canonical metadata + structured data.

---

## 11) Tool UI Structure Constraints

### Runtime anchors and contract
- `ToolShellPartial` defines required anchors (`data-tool-shell`, input/output/status/actions/content-host).
- Runtime enforces anchor presence and contract validity; dev/test can hard-fail on missing anchors.

### UI constraints for new tool
- Must mount inside canonical ToolShell anchors.
- Avoid replacing/removing required contract nodes.
- Keep long-running scan progress in status/follow-up regions to preserve runtime UX contract.

---

## 12) Playwright Integration Feasibility

### Where it should run
Best fit: **API + dedicated background worker service** (hosted in API process initially, separable later).

Rationale:
- heavy CPU/network I/O unsuitable for web request thread,
- operational controls (quotas, retries, cancellation, metrics) align with worker model,
- existing background-health and worker-leasing patterns already present.

---

## 13) Multi-Page Scanning Strategy

### Recommended crawler design
1. Seed with validated canonical URL.
2. Fetch + render with Playwright (headless chromium).
3. Extract same-origin links; enqueue breadth-first.
4. Enforce constraints: max pages, max depth, max total bytes, max duration.
5. Block non-essential resources for speed (`font`, `media`, large third-party scripts optionally).
6. Capture CSS coverage data, used selectors, unused selector candidates per page.
7. Aggregate cross-page selector frequency and criticality.

### Suggested defaults
- max pages: 25
- max depth: 2
- max duration: 180s
- max response bytes/page: configurable (e.g., 5MB)

---

## 14) Implementation Plan (Website CSS Performance Analyzer)

1. **Backend domain model**: scan job/page/selector/artifact/report entities + migrations.
2. **API layer**: endpoints to create job, poll status, fetch report, download optimized CSS.
3. **Queue + worker**: enqueue scans and execute Playwright workflow with cancellation support.
4. **Analyzer service**: coverage merge, selector usage scoring, duplicate rule detection.
5. **Optimizer service**: generate optimized CSS variants (safe, aggressive) and size deltas.
6. **Security hardening**: SSRF, quotas, domain allow/deny, payload limits.
7. **Tool runtime UI**: configure scan options, live progress, results panels, download actions.
8. **Public SEO report pages**: SSR route, summary model, canonical metadata and shareable slug.
9. **Observability**: metrics for queue length, scan durations, fail reasons, bytes saved.
10. **Tests**: unit (parser/analyzer), integration (API contracts), e2e (tool workflow).

---

## 15) Risk Analysis

### Key risks
- **Runtime conflicts**: breaking ToolShell DOM contract while adding complex UI.
- **Performance bottlenecks**: Playwright scans exhausting CPU/memory under load.
- **Security vulnerabilities**: SSRF / internal network access via crawler URLs.
- **Storage bloat**: large artifacts and per-selector datasets growing quickly.
- **Operational instability**: stuck scans or zombie browser processes.

### Mitigations
- Enforce contract-safe mounting + runtime validation tests.
- Dedicated bounded worker pool + strict timeouts + process-level limits.
- Hardened URL validation + DNS re-check + egress policy.
- Retention policies and compressed artifact storage.
- Heartbeat + lease-based job ownership + periodic reaper cleanup.

---

## 16) Final Roadmap

### Phase 1 — Backend services
- Entity schema, repositories, API contracts, scan job lifecycle.

### Phase 2 — Scanning engine
- Playwright worker, crawler queue, resource policies, cancellation.

### Phase 3 — CSS analyzer
- Coverage aggregation, selector attribution, duplicate/unused detection.

### Phase 4 — Optimization engine
- CSS rewrite pipeline, variant generation, artifact packaging.

### Phase 5 — Public report pages
- SSR report route, SEO metadata/JSON-LD, share/download UX.

---

## Recommended architecture decision
Implement the CSS Performance Analyzer as a **hybrid tool**:
- **Web runtime + SSR** for UX and public reports,
- **API + background worker** for scan execution and optimization,
- **Infrastructure persistence** for job state, artifacts metadata, and report indexing.

This aligns with current ToolNexus execution/governance model while avoiding runtime-thread overload and preserving platform security boundaries.
