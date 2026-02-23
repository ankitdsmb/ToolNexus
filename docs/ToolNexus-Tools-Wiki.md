# ToolNexus Wiki

## 0. Executive Overview

ToolNexus is a multi-surface developer tool platform composed of:
- `ToolNexus.Web` for Razor-rendered UI and client-side ToolShell runtime.
- `ToolNexus.Api` for authenticated API endpoints, observability, and admin operations.
- `ToolNexus.Application` for orchestration, policies, and use-case logic.
- `ToolNexus.Infrastructure` for persistence, executors, cache, telemetry, and external integrations.
- Test suites spanning unit, integration, JS runtime, and Playwright layers.

Platform design DNA:
- Tool-centric information architecture (every feature maps back to tool execution and lifecycle).
- Runtime-first frontend strategy (modular JS runtime with per-tool adapters).
- Progressive hardening through policy, caching, telemetry, and governance services.
- Strong CI discipline across .NET, Node/Jest, and Playwright workflows.

## 1. High-Level Architecture

### 1.1 Layer model

1. Presentation Layer
   - `ToolNexus.Web` MVC controllers, Razor views, static assets, tool manifests.
   - Browser runtime (`tool-runtime.js`, `tool-platform-kernel.js`, per-tool modules).
2. API Layer
   - `ToolNexus.Api` controllers and middleware chain for authz/authn, redaction, headers, and rate limiting.
3. Application Layer
   - Service contracts, orchestration, pipeline steps, policy abstractions, content/editor/admin services.
4. Infrastructure Layer
   - EF Core repositories, DB context, distributed cache, Redis abstractions, tool executors, insight providers.
5. Data & Ops Layer
   - PostgreSQL/SQLite provider handling, Redis optional dependencies, hosted services, health checks, telemetry queues.

### 1.2 Request flow

Web flow:
1. Browser requests tool route in `ToolNexus.Web`.
2. MVC resolves tool descriptor + view selection.
3. Razor view emits shell + manifest metadata.
4. Client runtime mounts tool module, normalizes input/output contract, emits observability snapshot.
5. For server-backed operations, runtime posts to API route (`/api/v1/tools/*`).

API flow:
1. ASP.NET pipeline enters middleware sequence (`SecurityHeaders`, correlation, logging, sanitize).
2. AuthN/AuthZ + rate limit policy applied.
3. Controller delegates to application service (`IToolService`, admin services, policy services).
4. Application orchestrates executor/repository/cache/pipeline services.
5. Infrastructure returns output, metrics, telemetry side effects.

### 1.3 Tool lifecycle

1. Definition source loaded from manifest repository (`DbToolManifestRepository` / `JsonFileToolManifestRepository`).
2. Governance validation (`IToolManifestGovernance`, startup validators).
3. Runtime/tool catalog projection (`ToolCatalogService`, registry + resolver in web).
4. Execution request enters orchestration (`OrchestrationService` + tool pipeline).
5. Execution strategy dispatch:
   - API-backed executor (`IApiToolExecutionStrategy`), or
   - client/no-op path (`IClientToolExecutionStrategy`) when appropriate.
6. Result normalization + caching + telemetry publication.
7. Admin analytics aggregation pipelines update platform diagnostics.

## 2. Repository Structure

### 2.1 Directory tree (non-generated)

```text
.github
.github/workflows
reports
reports/migration
scripts
src
src/ToolNexus.Api
src/ToolNexus.Api/.keyring
src/ToolNexus.Api/Authentication
src/ToolNexus.Api/Configuration
src/ToolNexus.Api/Controllers
src/ToolNexus.Api/Controllers/Admin
src/ToolNexus.Api/Diagnostics
src/ToolNexus.Api/Filters
src/ToolNexus.Api/Middleware
src/ToolNexus.Api/Options
src/ToolNexus.Api/Properties
src/ToolNexus.Api/bin
src/ToolNexus.Api/obj
src/ToolNexus.Application
src/ToolNexus.Application/Abstractions
src/ToolNexus.Application/Models
src/ToolNexus.Application/Options
src/ToolNexus.Application/Services
src/ToolNexus.Application/Services/Insights
src/ToolNexus.Application/Services/Pipeline
src/ToolNexus.Application/Services/Pipeline/Steps
src/ToolNexus.Application/Services/Policies
src/ToolNexus.Application/bin
src/ToolNexus.Application/obj
src/ToolNexus.ConsoleRunner
src/ToolNexus.ConsoleRunner/bin
src/ToolNexus.ConsoleRunner/obj
src/ToolNexus.Infrastructure
src/ToolNexus.Infrastructure/Caching
src/ToolNexus.Infrastructure/Content
src/ToolNexus.Infrastructure/Content/Entities
src/ToolNexus.Infrastructure/Data
src/ToolNexus.Infrastructure/Data/Migrations
src/ToolNexus.Infrastructure/Executors
src/ToolNexus.Infrastructure/HealthChecks
src/ToolNexus.Infrastructure/Insights
src/ToolNexus.Infrastructure/Observability
src/ToolNexus.Infrastructure/Options
src/ToolNexus.Infrastructure/Security
src/ToolNexus.Infrastructure/bin
src/ToolNexus.Infrastructure/obj
src/ToolNexus.Web
src/ToolNexus.Web/.keyring
src/ToolNexus.Web/App_Data
src/ToolNexus.Web/App_Data/tool-manifests
src/ToolNexus.Web/Areas
src/ToolNexus.Web/Areas/Admin
src/ToolNexus.Web/Areas/Admin/Controllers
src/ToolNexus.Web/Areas/Admin/Controllers/Api
src/ToolNexus.Web/Areas/Admin/Models
src/ToolNexus.Web/Areas/Admin/Services
src/ToolNexus.Web/Areas/Admin/Views
src/ToolNexus.Web/Areas/Admin/Views/Analytics
src/ToolNexus.Web/Areas/Admin/Views/ChangeHistory
src/ToolNexus.Web/Areas/Admin/Views/Dashboard
src/ToolNexus.Web/Areas/Admin/Views/Management
src/ToolNexus.Web/Areas/Admin/Views/Shared
src/ToolNexus.Web/Areas/Admin/Views/Shared/Workspaces
src/ToolNexus.Web/Areas/Admin/Views/Tools
src/ToolNexus.Web/Controllers
src/ToolNexus.Web/Models
src/ToolNexus.Web/Models/Layout
src/ToolNexus.Web/Options
src/ToolNexus.Web/Properties
src/ToolNexus.Web/Security
src/ToolNexus.Web/Services
src/ToolNexus.Web/Views
src/ToolNexus.Web/Views/Home
src/ToolNexus.Web/Views/Shared
src/ToolNexus.Web/Views/Tools
src/ToolNexus.Web/Views/Tools/Plugins
src/ToolNexus.Web/bin
src/ToolNexus.Web/obj
src/ToolNexus.Web/wwwroot
src/ToolNexus.Web/wwwroot/assets
src/ToolNexus.Web/wwwroot/css
src/ToolNexus.Web/wwwroot/css/pages
src/ToolNexus.Web/wwwroot/css/tools
src/ToolNexus.Web/wwwroot/js
src/ToolNexus.Web/wwwroot/js/runtime
src/ToolNexus.Web/wwwroot/js/tools
src/ToolNexus.Web/wwwroot/js/tools/__tests__
src/ToolNexus.Web/wwwroot/js/tools/file-merge
src/ToolNexus.Web/wwwroot/js/tools/file-merge/src
src/ToolNexus.Web/wwwroot/js/tools/file-merge/src/core
src/ToolNexus.Web/wwwroot/js/tools/file-merge/src/strategies
src/ToolNexus.Web/wwwroot/js/tools/file-merge/src/ui
src/ToolNexus.Web/wwwroot/js/tools/file-merge/src/worker
src/ToolNexus.Web/wwwroot/js/tools/html-entities
src/ToolNexus.Web/wwwroot/js/tools/json-formatter
src/ToolNexus.Web/wwwroot/js/tools/json-to-csv
src/ToolNexus.Web/wwwroot/js/tools/json-to-yaml
src/ToolNexus.Web/wwwroot/js/tools/json-validator
src/ToolNexus.Web/wwwroot/js/tools/sql-formatter
src/ToolNexus.Web/wwwroot/js/tools/url-decode
src/ToolNexus.Web/wwwroot/js/tools/uuid-generator
src/ToolNexus.Web/wwwroot/js/tools/yaml-to-json
src/ToolNexus.Web/wwwroot/js/vendor
src/ToolNexus.Web/wwwroot/tool-templates
tests
tests/ToolNexus.Api.IntegrationTests
tests/ToolNexus.Api.IntegrationTests/bin
tests/ToolNexus.Api.IntegrationTests/obj
tests/ToolNexus.Application.Tests
tests/ToolNexus.Application.Tests/bin
tests/ToolNexus.Application.Tests/obj
tests/ToolNexus.Infrastructure.Tests
tests/ToolNexus.Tools.Json.Tests
tests/ToolNexus.Tools.Json.Tests/bin
tests/ToolNexus.Tools.Json.Tests/obj
tests/ToolNexus.Web.Tests
tests/ToolNexus.Web.Tests/bin
tests/ToolNexus.Web.Tests/obj
tests/js
tests/js/runtime
tests/playwright
tests/playwright/contracts
tests/playwright/helpers
tests/playwright/runtime
tests/playwright/screenshots
tests/playwright/screenshots/baseline
tests/playwright/screenshots/current
tests/playwright/screenshots/diff
tests/playwright/smoke
```

### 2.2 Top-level responsibilities

- `.github/workflows`: CI definitions for end-to-end build/test/release checks.
- `scripts`: governance and release guard scripts (design-system, SEO/A11y, ecosystem integrity).
- `src/ToolNexus.Web`: Razor host + ToolShell runtime assets.
- `src/ToolNexus.Api`: API gateway and middleware instrumentation.
- `src/ToolNexus.Application`: business orchestration and service contracts.
- `src/ToolNexus.Infrastructure`: persistence/executor/telemetry/caching implementations.
- `tests/*`: layered verification matrix (unit/integration/runtime/browser).
- `reports/migration`: migration execution reports and production cutover evidence.

## 3. Runtime Architecture

### 3.1 ToolShell runtime components

Primary frontend runtime files (top-level):
```text
src/ToolNexus.Web/wwwroot/js/command-palette-loader.js
src/ToolNexus.Web/wwwroot/js/command-palette.js
src/ToolNexus.Web/wwwroot/js/dynamic-widget-engine.js
src/ToolNexus.Web/wwwroot/js/header-state.js
src/ToolNexus.Web/wwwroot/js/modal-manager.js
src/ToolNexus.Web/wwwroot/js/motion-system.js
src/ToolNexus.Web/wwwroot/js/runtime/dependency-loader.js
src/ToolNexus.Web/wwwroot/js/runtime/error-classification-engine.js
src/ToolNexus.Web/wwwroot/js/runtime/legacy-execution-bridge.js
src/ToolNexus.Web/wwwroot/js/runtime/legacy-tool-bootstrap.js
src/ToolNexus.Web/wwwroot/js/runtime/runtime-migration-logger.js
src/ToolNexus.Web/wwwroot/js/runtime/runtime-observability.js
src/ToolNexus.Web/wwwroot/js/runtime/runtime-observer.js
src/ToolNexus.Web/wwwroot/js/runtime/safe-dom-mount.js
src/ToolNexus.Web/wwwroot/js/runtime/safe-init-scheduler.js
src/ToolNexus.Web/wwwroot/js/runtime/tool-capability-matrix.js
src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-adapter.js
src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js
src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract.js
src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-context.js
src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-normalizer.js
src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js
src/ToolNexus.Web/wwwroot/js/runtime/tool-state-registry.js
src/ToolNexus.Web/wwwroot/js/runtime/tool-template-binder.js
src/ToolNexus.Web/wwwroot/js/runtime/tool-template-loader.js
src/ToolNexus.Web/wwwroot/js/theme-manager.js
src/ToolNexus.Web/wwwroot/js/tool-page.js
src/ToolNexus.Web/wwwroot/js/tool-runtime.js
src/ToolNexus.Web/wwwroot/js/tool-shell-feel.js
src/ToolNexus.Web/wwwroot/js/tools-grid.js
src/ToolNexus.Web/wwwroot/js/tools/base64-decode.js
src/ToolNexus.Web/wwwroot/js/tools/base64-encode.api.js
src/ToolNexus.Web/wwwroot/js/tools/base64-encode.app.js
src/ToolNexus.Web/wwwroot/js/tools/base64-encode.dom.js
src/ToolNexus.Web/wwwroot/js/tools/base64-encode.js
src/ToolNexus.Web/wwwroot/js/tools/case-converter.js
src/ToolNexus.Web/wwwroot/js/tools/css-minifier.api.js
src/ToolNexus.Web/wwwroot/js/tools/css-minifier.app.js
src/ToolNexus.Web/wwwroot/js/tools/css-minifier.dom.js
src/ToolNexus.Web/wwwroot/js/tools/css-minifier.js
src/ToolNexus.Web/wwwroot/js/tools/csv-to-json.api.js
src/ToolNexus.Web/wwwroot/js/tools/csv-to-json.app.js
src/ToolNexus.Web/wwwroot/js/tools/csv-to-json.dom.js
src/ToolNexus.Web/wwwroot/js/tools/csv-to-json.js
src/ToolNexus.Web/wwwroot/js/tools/csv-viewer.js
src/ToolNexus.Web/wwwroot/js/tools/html-entities.js
src/ToolNexus.Web/wwwroot/js/tools/html-formatter.api.js
src/ToolNexus.Web/wwwroot/js/tools/html-formatter.app.js
src/ToolNexus.Web/wwwroot/js/tools/html-formatter.dom.js
src/ToolNexus.Web/wwwroot/js/tools/html-formatter.js
src/ToolNexus.Web/wwwroot/js/tools/html-to-markdown.api.js
src/ToolNexus.Web/wwwroot/js/tools/html-to-markdown.app.js
src/ToolNexus.Web/wwwroot/js/tools/html-to-markdown.dom.js
src/ToolNexus.Web/wwwroot/js/tools/html-to-markdown.js
src/ToolNexus.Web/wwwroot/js/tools/js-minifier-config.js
src/ToolNexus.Web/wwwroot/js/tools/js-minifier-engine.js
src/ToolNexus.Web/wwwroot/js/tools/js-minifier-errors.js
src/ToolNexus.Web/wwwroot/js/tools/js-minifier-normalizer.js
src/ToolNexus.Web/wwwroot/js/tools/js-minifier-ui.js
src/ToolNexus.Web/wwwroot/js/tools/js-minifier-utils.js
src/ToolNexus.Web/wwwroot/js/tools/js-minifier.js
src/ToolNexus.Web/wwwroot/js/tools/json-formatter-constants.js
src/ToolNexus.Web/wwwroot/js/tools/json-formatter-transformers.js
src/ToolNexus.Web/wwwroot/js/tools/json-formatter-validation.js
src/ToolNexus.Web/wwwroot/js/tools/json-formatter.api.js
src/ToolNexus.Web/wwwroot/js/tools/json-formatter.app.js
src/ToolNexus.Web/wwwroot/js/tools/json-formatter.dom.js
src/ToolNexus.Web/wwwroot/js/tools/json-formatter.js
src/ToolNexus.Web/wwwroot/js/tools/json-to-csv.js
src/ToolNexus.Web/wwwroot/js/tools/json-to-xml.api.js
src/ToolNexus.Web/wwwroot/js/tools/json-to-xml.app.js
src/ToolNexus.Web/wwwroot/js/tools/json-to-xml.dom.js
src/ToolNexus.Web/wwwroot/js/tools/json-to-xml.js
src/ToolNexus.Web/wwwroot/js/tools/json-to-yaml.api.js
src/ToolNexus.Web/wwwroot/js/tools/json-to-yaml.app.js
src/ToolNexus.Web/wwwroot/js/tools/json-to-yaml.dom.js
src/ToolNexus.Web/wwwroot/js/tools/json-to-yaml.js
src/ToolNexus.Web/wwwroot/js/tools/json-validator.js
src/ToolNexus.Web/wwwroot/js/tools/keyboard-event-manager.js
src/ToolNexus.Web/wwwroot/js/tools/markdown-to-html.api.js
src/ToolNexus.Web/wwwroot/js/tools/markdown-to-html.app.js
src/ToolNexus.Web/wwwroot/js/tools/markdown-to-html.dom.js
src/ToolNexus.Web/wwwroot/js/tools/markdown-to-html.js
src/ToolNexus.Web/wwwroot/js/tools/regex-tester.api.js
src/ToolNexus.Web/wwwroot/js/tools/regex-tester.app.js
src/ToolNexus.Web/wwwroot/js/tools/regex-tester.dom.js
src/ToolNexus.Web/wwwroot/js/tools/regex-tester.js
src/ToolNexus.Web/wwwroot/js/tools/sql-formatter.api.js
src/ToolNexus.Web/wwwroot/js/tools/sql-formatter.app.js
src/ToolNexus.Web/wwwroot/js/tools/sql-formatter.dom.js
src/ToolNexus.Web/wwwroot/js/tools/sql-formatter.js
src/ToolNexus.Web/wwwroot/js/tools/text-diff.api.js
src/ToolNexus.Web/wwwroot/js/tools/text-diff.app.js
src/ToolNexus.Web/wwwroot/js/tools/text-diff.dom.js
src/ToolNexus.Web/wwwroot/js/tools/text-diff.js
src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js
src/ToolNexus.Web/wwwroot/js/tools/url-decode.js
src/ToolNexus.Web/wwwroot/js/tools/url-encode.app.js
src/ToolNexus.Web/wwwroot/js/tools/url-encode.config.js
src/ToolNexus.Web/wwwroot/js/tools/url-encode.constants.js
src/ToolNexus.Web/wwwroot/js/tools/url-encode.engine.js
src/ToolNexus.Web/wwwroot/js/tools/url-encode.errors.js
src/ToolNexus.Web/wwwroot/js/tools/url-encode.js
src/ToolNexus.Web/wwwroot/js/tools/url-encode.normalizer.js
src/ToolNexus.Web/wwwroot/js/tools/url-encode.state.js
src/ToolNexus.Web/wwwroot/js/tools/url-encode.utils.js
src/ToolNexus.Web/wwwroot/js/tools/uuid-generator.js
src/ToolNexus.Web/wwwroot/js/tools/xml-formatter.api.js
src/ToolNexus.Web/wwwroot/js/tools/xml-formatter.app.js
src/ToolNexus.Web/wwwroot/js/tools/xml-formatter.dom.js
src/ToolNexus.Web/wwwroot/js/tools/xml-formatter.js
src/ToolNexus.Web/wwwroot/js/tools/xml-to-json.api.js
src/ToolNexus.Web/wwwroot/js/tools/xml-to-json.app.js
src/ToolNexus.Web/wwwroot/js/tools/xml-to-json.dom.js
src/ToolNexus.Web/wwwroot/js/tools/xml-to-json.js
src/ToolNexus.Web/wwwroot/js/tools/yaml-to-json.api.js
src/ToolNexus.Web/wwwroot/js/tools/yaml-to-json.app.js
src/ToolNexus.Web/wwwroot/js/tools/yaml-to-json.dom.js
src/ToolNexus.Web/wwwroot/js/tools/yaml-to-json.js
src/ToolNexus.Web/wwwroot/js/ui-state-manager.js
src/ToolNexus.Web/wwwroot/js/vendor/js-yaml.mjs
src/ToolNexus.Web/wwwroot/js/vendor/terser.bundle.min.js
src/ToolNexus.Web/wwwroot/js/version-manager.js
```

Runtime stack responsibilities:
- `tool-runtime.js`: lifecycle coordinator for mounting and fallback behavior.
- `tool-platform-kernel.js`: contract governance and execution normalization.
- `dynamic-widget-engine.js`, `ui-state-manager.js`, `motion-system.js`: platform UX consistency.
- Per-tool modules under `wwwroot/js/tools/*`: parser/formatter/ui/state specializations.
- Runtime observability tests in `tests/js/runtime/*` and Playwright contract tests in `tests/playwright/contracts/*`.

### 3.2 Discovery and loading

- Tool metadata enters from manifest files in `src/ToolNexus.Web/App_Data/tool-manifests`.
- `IToolManifestLoader` parses sources.
- `IToolRegistryService` builds registry index.
- `IToolViewResolver` resolves Razor template mapping.
- Browser runtime then loads corresponding script modules, validates DOM contract, and mounts.

### 3.3 Execution pipeline (application-side)

- Pipeline registration via `ToolExecutionPipelineServiceCollectionExtensions`.
- Steps include policy enforcement, caching, telemetry, resilience, and execution strategy dispatch.
- Concurrency limiter and metrics collector keep execution bounded and measurable.

## 4. Dependency Injection & Services

### 4.1 Composition roots

- `src/ToolNexus.Web/Program.cs`
- `src/ToolNexus.Api/Program.cs`
- `src/ToolNexus.Application/DependencyInjection.cs`
- `src/ToolNexus.Infrastructure/DependencyInjection.cs`
- `src/ToolNexus.Application/Services/Pipeline/ToolExecutionPipelineServiceCollectionExtensions.cs`

### 4.2 Service registration matrix

The platform currently registers singleton/scoped/transient services for executors, repositories, policy services, telemetry processors, caching adapters, and MVC support services.

Key rules:
- Executor instances are singleton multi-bindings of `IToolExecutor`.
- Use-case services are mostly scoped in application layer.
- Platform-wide governance/insight/cache abstractions are singleton where stateful caches or shared coordinators are required.
- Infrastructure switches implementation branches based on configuration (e.g., Redis lock/event bus vs in-memory equivalents).

## 5. Core Modules

### 5.1 Tool Runtime Module (Frontend)

- Entry kernel and runtime host under `wwwroot/js`.
- Tool modules are mixed format (legacy single-file and new folderized modules with `index.js`, `ui.js`, `parser.js`, etc.).
- Contract tests ensure mount and event lifecycle parity.

### 5.2 UI Rendering Module (Web)

- Controllers: public browsing, auth, tool route rendering.
- Areas/Admin provides dashboard, tools management, analytics, change history, API endpoints.
- ViewModels in `Models` and `Areas/Admin/Models` define shape guarantees to Razor templates.

### 5.3 API Module

- `/api/v1/tools` execution and admin API controllers.
- Middleware chain for security headers, correlation, request/response logs, sanitization.
- Health and metrics endpoints (`/health`, `/ready`, `/metrics`, `/health/background`).

### 5.4 Application Module

- Orchestration service integrates execution, preprocessing, caching, telemetry, and policy guards.
- Content/editor/admin services mediate repository access.
- Manifest governance and startup validation enforce consistency.

### 5.5 Infrastructure Module

- EF Core context + repositories for tool definitions, content, policies, audit logs.
- Executors for built-in transform tools + manifest-mapped executor wrappers.
- Distributed cache and telemetry worker infrastructure.

## 6. CLASS-BY-CLASS DOCUMENTATION (CRITICAL)

Documentation contract: every discovered `class`, `interface`, `record`, and `enum` is listed below. For artifacts where direct behavioral intent is not explicit in declaration-only scan, `Purpose` is marked `UNKNOWN` and must be refined during focused module deep-dives.

| Artifact | Kind | Namespace | File | Purpose |
|---|---|---|---|---|
| `ToolActionAuthorizationHandler` | class | `ToolNexus.Api.Authentication` | `src/ToolNexus.Api/Authentication/ToolActionAuthorizationHandler.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolActionRequirement` | class | `ToolNexus.Api.Authentication` | `src/ToolNexus.Api/Authentication/ToolActionRequirement.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiCorsOptions` | class | `ToolNexus.Api.Configuration` | `src/ToolNexus.Api/Configuration/ApiCorsOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ServiceCollectionExtensions` | class | `ToolNexus.Api.Configuration` | `src/ToolNexus.Api/Configuration/ServiceCollectionExtensions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AnalyticsController` | class | `ToolNexus.Api.Controllers.Admin` | `src/ToolNexus.Api/Controllers/Admin/AnalyticsController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ContentController` | class | `ToolNexus.Api.Controllers.Admin` | `src/ToolNexus.Api/Controllers/Admin/ContentController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecutionController` | class | `ToolNexus.Api.Controllers.Admin` | `src/ToolNexus.Api/Controllers/Admin/ExecutionController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `UpdateExecutionPolicyRequest` | record | `ToolNexus.Api.Controllers.Admin` | `src/ToolNexus.Api/Controllers/Admin/ExecutionController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolsController` | class | `ToolNexus.Api.Controllers.Admin` | `src/ToolNexus.Api/Controllers/Admin/ToolsController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `SaveToolRequest` | record | `ToolNexus.Api.Controllers.Admin` | `src/ToolNexus.Api/Controllers/Admin/ToolsController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `SetToolStatusRequest` | record | `ToolNexus.Api.Controllers.Admin` | `src/ToolNexus.Api/Controllers/Admin/ToolsController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolsController` | class | `ToolNexus.Api.Controllers` | `src/ToolNexus.Api/Controllers/ToolsController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecuteToolRequest` | record | `ToolNexus.Api.Controllers` | `src/ToolNexus.Api/Controllers/ToolsController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `EndpointDiagnosticsHostedService` | class | `ToolNexus.Api.Diagnostics` | `src/ToolNexus.Api/Diagnostics/EndpointDiagnosticsHostedService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `RedactingLoggingExceptionFilter` | class | `ToolNexus.Api.Filters` | `src/ToolNexus.Api/Filters/RedactingLoggingExceptionFilter.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `HealthCheckResponseWriter` | class | `ToolNexus.Api` | `src/ToolNexus.Api/HealthCheckResponseWriter.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `HealthStateLoggingPublisher` | class | `ToolNexus.Api` | `src/ToolNexus.Api/HealthStateLoggingPublisher.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiCacheHeadersMiddleware` | class | `ToolNexus.Api.Middleware` | `src/ToolNexus.Api/Middleware/ApiCacheHeadersMiddleware.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiKeyValidationMiddleware` | class | `ToolNexus.Api.Middleware` | `src/ToolNexus.Api/Middleware/ApiKeyValidationMiddleware.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ContentSecurityPolicyBuilder` | class | `ToolNexus.Api.Middleware` | `src/ToolNexus.Api/Middleware/ContentSecurityPolicyBuilder.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CorrelationEnrichmentMiddleware` | class | `ToolNexus.Api.Middleware` | `src/ToolNexus.Api/Middleware/CorrelationEnrichmentMiddleware.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `RequestResponseLoggingMiddleware` | class | `ToolNexus.Api.Middleware` | `src/ToolNexus.Api/Middleware/RequestResponseLoggingMiddleware.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `SanitizeErrorMiddleware` | class | `ToolNexus.Api.Middleware` | `src/ToolNexus.Api/Middleware/SanitizeErrorMiddleware.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiErrorResponse` | record | `ToolNexus.Api.Middleware` | `src/ToolNexus.Api/Middleware/SanitizeErrorMiddleware.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `SecurityHeadersMiddleware` | class | `ToolNexus.Api.Middleware` | `src/ToolNexus.Api/Middleware/SecurityHeadersMiddleware.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `JwtSecurityOptions` | class | `ToolNexus.Api.Options` | `src/ToolNexus.Api/Options/JwtSecurityOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `SecurityHeadersOptions` | class | `ToolNexus.Api.Options` | `src/ToolNexus.Api/Options/SecurityHeadersOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Program` | class | `GLOBAL` | `src/ToolNexus.Api/Program.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolExecutor` | interface | `ToolNexus.Application.Abstractions` | `src/ToolNexus.Application/Abstractions/IToolExecutor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolMetadata` | record | `ToolNexus.Application.Abstractions` | `src/ToolNexus.Application/Abstractions/ToolMetadata.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolRequest` | record | `ToolNexus.Application.Abstractions` | `src/ToolNexus.Application/Abstractions/ToolRequest.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolResult` | record | `ToolNexus.Application.Abstractions` | `src/ToolNexus.Application/Abstractions/ToolResult.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DependencyInjection` | class | `ToolNexus.Application` | `src/ToolNexus.Application/DependencyInjection.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminAnalyticsDashboard` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/AdminAnalyticsDashboard.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminAnalyticsToolMetric` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/AdminAnalyticsDashboard.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminAnalyticsTrendPoint` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/AdminAnalyticsDashboard.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolAnomalyType` | enum | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/AdminAnalyticsDashboard.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolAnomalySeverity` | enum | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/AdminAnalyticsDashboard.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolAnomalySnapshot` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/AdminAnalyticsDashboard.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminAuditLogEntry` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/AdminAuditLogModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecutionMetrics` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ExecutionMetrics.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolContentEditorGraph` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentEditorModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ContentValueItem` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentEditorModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ContentStepItem` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentEditorModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ContentExampleItem` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentEditorModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ContentFaqItem` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentEditorModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ContentRelatedItem` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentEditorModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `RelatedToolOption` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentEditorModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `SaveToolContentGraphRequest` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentEditorModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolContent` | class | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolStep` | class | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExample` | class | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolFaq` | class | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolRelated` | class | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolCategory` | class | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolContentModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolDefinitionListItem` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolDefinitionModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolDefinitionDetail` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolDefinitionModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CreateToolDefinitionRequest` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolDefinitionModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `UpdateToolDefinitionRequest` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolDefinitionModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolDescriptor` | class | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolDescriptor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionEvent` | class | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolExecutionEvent.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionPolicyModel` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolExecutionPolicyModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `UpdateToolExecutionPolicyRequest` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolExecutionPolicyModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionRequest` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolExecutionRequest.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionResponse` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolExecutionResponse.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolInsightResult` | record | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolInsightResult.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolManifest` | class | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolManifest.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolSecurityLevel` | enum | `ToolNexus.Application.Models` | `src/ToolNexus.Application/Models/ToolManifest.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InputSanitizationOptions` | class | `ToolNexus.Application.Options` | `src/ToolNexus.Application/Options/InputSanitizationOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `PlatformCacheOptions` | class | `ToolNexus.Application.Options` | `src/ToolNexus.Application/Options/PlatformCacheOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionPolicyOptions` | class | `ToolNexus.Application.Options` | `src/ToolNexus.Application/Options/ToolExecutionPolicyOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionPolicyDefinition` | class | `ToolNexus.Application.Options` | `src/ToolNexus.Application/Options/ToolExecutionPolicyOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolResultCacheOptions` | class | `ToolNexus.Application.Options` | `src/ToolNexus.Application/Options/ToolResultCacheOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminAnalyticsService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/AdminAnalyticsService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminAuditLogService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/AdminAuditLogService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `is` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/CacheKeyBuilder.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CacheKeyBuilder` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/CacheKeyBuilder.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CachingAdminAnalyticsService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/CachingAdminAnalyticsService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CachingExecutionPolicyService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/CachingExecutionPolicyService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CachingToolCatalogService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/CachingToolCatalogService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CachingToolDefinitionService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/CachingToolDefinitionService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecutionPolicyService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ExecutionPolicyService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IAdminAnalyticsRepository` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IAdminAnalyticsRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DailyToolMetricsSnapshot` | record | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IAdminAnalyticsRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IAdminAnalyticsService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IAdminAnalyticsService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IAdminAuditLogRepository` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IAdminAuditLogRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IAdminAuditLogService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IAdminAuditLogService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IApiKeyValidator` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IApiKeyValidator.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IBackgroundEventBus` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IBackgroundEventBus.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IDistributedPlatformCache` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IDistributedPlatformCache.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IExecutionPolicyRepository` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IExecutionPolicyRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IExecutionPolicyService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IExecutionPolicyService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ILogRedactionPolicy` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ILogRedactionPolicy.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IOrchestrationService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IOrchestrationService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IPlatformCacheService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IPlatformCacheService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ISitemapService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ISitemapService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolCatalogService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolCatalogService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolContentEditorRepository` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolContentEditorRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolContentEditorService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolContentEditorService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolContentRepository` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolContentRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolContentService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolContentService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolDefinitionRepository` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolDefinitionRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolDefinitionService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolDefinitionService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolExecutionClient` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolExecutionClient.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionClientResult` | record | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolExecutionClient.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolExecutionEventService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolExecutionEventService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolExecutionPreProcessor` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolExecutionPreProcessor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolExecutionRateGuard` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolExecutionRateGuard.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolIntelligenceService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolIntelligenceService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolManifestGovernance` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolManifestGovernance.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolManifestRepository` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolManifestRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolResponseCache` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolResponseCache.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolResultCache` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolResultCache.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolService` | interface | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/IToolService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InputSanitizationException` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/InputSanitizationException.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InputSanitizationPreProcessor` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/InputSanitizationPreProcessor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolInsightProvider` | interface | `ToolNexus.Application.Services.Insights` | `src/ToolNexus.Application/Services/Insights/IToolInsightProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolInsightService` | interface | `ToolNexus.Application.Services.Insights` | `src/ToolNexus.Application/Services/Insights/IToolInsightService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolInsightService` | class | `ToolNexus.Application.Services.Insights` | `src/ToolNexus.Application/Services/Insights/ToolInsightService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ManifestExecutorAlignmentValidator` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ManifestExecutorAlignmentValidator.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ManifestStartupValidator` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ManifestStartupValidator.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `NoOpToolExecutionEventService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/NoOpToolExecutionEventService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `OrchestrationService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/OrchestrationService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiExecutionStep` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/ApiExecutionStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiToolExecutionStrategy` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/ApiToolExecutionStrategy.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CachingExecutionStep` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/CachingExecutionStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ClientExecutionStep` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/ClientExecutionStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolConcurrencyLimiter` | interface | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/IToolConcurrencyLimiter.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolExecutionPipeline` | interface | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/IToolExecutionPipeline.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolExecutionResiliencePipelineProvider` | interface | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/IToolExecutionResiliencePipelineProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolExecutionStep` | interface | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/IToolExecutionStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IClientToolExecutionStrategy` | interface | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/IToolExecutionStrategies.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IApiToolExecutionStrategy` | interface | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/IToolExecutionStrategies.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InMemoryToolConcurrencyLimiter` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/InMemoryToolConcurrencyLimiter.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Releaser` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/InMemoryToolConcurrencyLimiter.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `NoOpClientExecutionStrategy` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/NoOpClientExecutionStrategy.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `PostProcessingExecutionStep` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/PostProcessingExecutionStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CacheLookupStep` | class | `ToolNexus.Application.Services.Pipeline.Steps` | `src/ToolNexus.Application/Services/Pipeline/Steps/CacheLookupStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CacheWriteStep` | class | `ToolNexus.Application.Services.Pipeline.Steps` | `src/ToolNexus.Application/Services/Pipeline/Steps/CacheWriteStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecutionStep` | class | `ToolNexus.Application.Services.Pipeline.Steps` | `src/ToolNexus.Application/Services/Pipeline/Steps/ExecutionStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecutionTelemetryStep` | class | `ToolNexus.Application.Services.Pipeline.Steps` | `src/ToolNexus.Application/Services/Pipeline/Steps/ExecutionTelemetryStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `MetricsStep` | class | `ToolNexus.Application.Services.Pipeline.Steps` | `src/ToolNexus.Application/Services/Pipeline/Steps/MetricsStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `PolicyEnforcementStep` | class | `ToolNexus.Application.Services.Pipeline.Steps` | `src/ToolNexus.Application/Services/Pipeline/Steps/PolicyEnforcementStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `RateLimitStep` | class | `ToolNexus.Application.Services.Pipeline.Steps` | `src/ToolNexus.Application/Services/Pipeline/Steps/RateLimitStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ValidationStep` | class | `ToolNexus.Application.Services.Pipeline.Steps` | `src/ToolNexus.Application/Services/Pipeline/Steps/ValidationStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionContext` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/ToolExecutionContext.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionMetrics` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/ToolExecutionMetrics.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionPipeline` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/ToolExecutionPipeline.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionPipelineServiceCollectionExtensions` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/ToolExecutionPipelineServiceCollectionExtensions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionResiliencePipelineProvider` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/ToolExecutionResiliencePipelineProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ValidationExecutionStep` | class | `ToolNexus.Application.Services.Pipeline` | `src/ToolNexus.Application/Services/Pipeline/ValidationExecutionStep.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `PlatformCacheWarmupHostedService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/PlatformCacheWarmupHostedService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolExecutionPolicy` | interface | `ToolNexus.Application.Services.Policies` | `src/ToolNexus.Application/Services/Policies/IToolExecutionPolicy.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolHttpMethodPolicy` | enum | `ToolNexus.Application.Services.Policies` | `src/ToolNexus.Application/Services/Policies/IToolExecutionPolicy.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolExecutionPolicyRegistry` | interface | `ToolNexus.Application.Services.Policies` | `src/ToolNexus.Application/Services/Policies/IToolExecutionPolicyRegistry.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionPolicy` | record | `ToolNexus.Application.Services.Policies` | `src/ToolNexus.Application/Services/Policies/ToolExecutionPolicy.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `SitemapService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/SitemapService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolCatalogService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ToolCatalogService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolContentEditorService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ToolContentEditorService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolContentService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ToolContentService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolDefinitionService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ToolDefinitionService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolIntelligenceService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ToolIntelligenceService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolManifestGovernanceService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ToolManifestGovernanceService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolResultCacheItem` | record | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ToolResultCacheItem.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolService` | class | `ToolNexus.Application.Services` | `src/ToolNexus.Application/Services/ToolService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DistributedPlatformCacheService` | class | `ToolNexus.Infrastructure.Caching` | `src/ToolNexus.Infrastructure/Caching/DistributedPlatformCacheService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InMemoryPlatformCacheService` | class | `ToolNexus.Infrastructure.Caching` | `src/ToolNexus.Infrastructure/Caching/InMemoryPlatformCacheService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `PlatformCacheInvalidationEvent` | record | `ToolNexus.Infrastructure.Caching` | `src/ToolNexus.Infrastructure/Caching/PlatformCacheInvalidationEvent.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `RedisToolResultCache` | class | `ToolNexus.Infrastructure.Caching` | `src/ToolNexus.Infrastructure/Caching/RedisToolResultCache.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IAdminAuditLogger` | interface | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/AdminAuditLogger.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminAuditLogger` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/AdminAuditLogger.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CachingAdminAnalyticsRepository` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/CachingAdminAnalyticsRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DatabaseInitializationHostedService` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/DatabaseInitializationHostedService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DatabaseInitializationStatus` | enum | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/DatabaseInitializationState.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DatabaseInitializationState` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/DatabaseInitializationState.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DbToolManifestRepository` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/DbToolManifestRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `EfAdminAnalyticsRepository` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/EfAdminAnalyticsRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `EfAdminAuditLogRepository` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/EfAdminAuditLogRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `EfExecutionPolicyRepository` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/EfExecutionPolicyRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `EfToolContentEditorRepository` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/EfToolContentEditorRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `EfToolContentRepository` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/EfToolContentRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `EfToolDefinitionRepository` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/EfToolDefinitionRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminAuditLogEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/AdminAuditLogEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DailyToolMetricsEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/DailyToolMetricsEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolAnomalySnapshotEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolAnomalySnapshotEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolContentEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolContentEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolFeatureEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolContentEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolStepEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolContentEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExampleEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolContentEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolFaqEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolContentEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolCategoryEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolContentEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolRelatedEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolContentEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolUseCaseEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolContentEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolDefinitionEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolDefinitionEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionEventEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolExecutionEventEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionPolicyEntity` | class | `ToolNexus.Infrastructure.Content.Entities` | `src/ToolNexus.Infrastructure/Content/Entities/ToolExecutionPolicyEntity.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InMemoryToolExecutionRateGuard` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/InMemoryToolExecutionRateGuard.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `JsonFileToolManifestRepository` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/JsonFileToolManifestRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolManifestDocument` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/JsonFileToolManifestRepository.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolContentSeedHostedService` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/ToolContentSeedHostedService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionPolicyRegistry` | class | `ToolNexus.Infrastructure.Content` | `src/ToolNexus.Infrastructure/Content/ToolExecutionPolicyRegistry.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DatabaseProviderConfiguration` | class | `ToolNexus.Infrastructure.Data` | `src/ToolNexus.Infrastructure/Data/DatabaseProviderConfiguration.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InitialContentBaseline` | class | `ToolNexus.Infrastructure.Data.Migrations` | `src/ToolNexus.Infrastructure/Data/Migrations/20260222173745_InitialContentBaseline.Designer.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InitialContentBaseline` | class | `ToolNexus.Infrastructure.Data.Migrations` | `src/ToolNexus.Infrastructure/Data/Migrations/20260222173745_InitialContentBaseline.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AddToolDefinitions` | class | `ToolNexus.Infrastructure.Data.Migrations` | `src/ToolNexus.Infrastructure/Data/Migrations/20260223010000_AddToolDefinitions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AddExecutionPolicies` | class | `ToolNexus.Infrastructure.Data.Migrations` | `src/ToolNexus.Infrastructure/Data/Migrations/20260224000000_AddExecutionPolicies.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AddToolExecutionEvents` | class | `ToolNexus.Infrastructure.Data.Migrations` | `src/ToolNexus.Infrastructure/Data/Migrations/20260225000000_AddToolExecutionEvents.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AddDailyToolMetrics` | class | `ToolNexus.Infrastructure.Data.Migrations` | `src/ToolNexus.Infrastructure/Data/Migrations/20260226000000_AddDailyToolMetrics.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AddToolAnomalySnapshots` | class | `ToolNexus.Infrastructure.Data.Migrations` | `src/ToolNexus.Infrastructure/Data/Migrations/20260227000000_AddToolAnomalySnapshots.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AddAdminAuditLog` | class | `ToolNexus.Infrastructure.Data.Migrations` | `src/ToolNexus.Infrastructure/Data/Migrations/20260301000000_AddAdminAuditLog.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolNexusContentDbContextModelSnapshot` | class | `ToolNexus.Infrastructure.Data.Migrations` | `src/ToolNexus.Infrastructure/Data/Migrations/ToolNexusContentDbContextModelSnapshot.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolNexusContentDbContext` | class | `ToolNexus.Infrastructure.Data` | `src/ToolNexus.Infrastructure/Data/ToolNexusContentDbContext.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolNexusContentDbContextFactory` | class | `ToolNexus.Infrastructure.Data` | `src/ToolNexus.Infrastructure/Data/ToolNexusContentDbContextFactory.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DependencyInjection` | class | `ToolNexus.Infrastructure` | `src/ToolNexus.Infrastructure/DependencyInjection.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Base64ToolExecutor` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/Base64ToolExecutor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CsvToolExecutor` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/CsvToolExecutor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `HtmlToolExecutor` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/HtmlToolExecutor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `JsonToXmlConverter` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/JsonToXmlConverter.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `JsonToolExecutor` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/JsonToolExecutor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `JsonValidatorToolExecutor` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/JsonValidatorToolExecutor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ManifestMappedToolExecutor` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/ManifestMappedToolExecutor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `WordToken` | record | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/ManifestMappedToolExecutor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `MinifierToolExecutor` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/MinifierToolExecutor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionClient` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/ToolExecutionClient.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutorBase` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/ToolExecutorBase.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `XmlToolExecutor` | class | `ToolNexus.Infrastructure.Executors` | `src/ToolNexus.Infrastructure/Executors/XmlToolExecutor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DatabaseInitializationHealthCheck` | class | `ToolNexus.Infrastructure.HealthChecks` | `src/ToolNexus.Infrastructure/HealthChecks/DatabaseInitializationHealthCheck.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DistributedCacheHealthCheck` | class | `ToolNexus.Infrastructure.HealthChecks` | `src/ToolNexus.Infrastructure/HealthChecks/DistributedCacheHealthCheck.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `JsonInsightProvider` | class | `ToolNexus.Infrastructure.Insights` | `src/ToolNexus.Infrastructure/Insights/JsonInsightProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `RegexInsightProvider` | class | `ToolNexus.Infrastructure.Insights` | `src/ToolNexus.Infrastructure/Insights/RegexInsightProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `starts` | class | `ToolNexus.Infrastructure.Insights` | `src/ToolNexus.Infrastructure/Insights/RegexInsightProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `SqlInsightProvider` | class | `ToolNexus.Infrastructure.Insights` | `src/ToolNexus.Infrastructure/Insights/SqlInsightProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TextDiffInsightProvider` | class | `ToolNexus.Infrastructure.Insights` | `src/ToolNexus.Infrastructure/Insights/TextDiffInsightProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `XmlInsightProvider` | class | `ToolNexus.Infrastructure.Insights` | `src/ToolNexus.Infrastructure/Insights/XmlInsightProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `BackgroundWorkQueue` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/BackgroundWorkQueue.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `BackgroundWorkerHealthState` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/BackgroundWorkerHealthState.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecutionMetricsAggregator` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/ExecutionMetricsAggregator.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IBackgroundWorkQueue` | interface | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/IBackgroundWorkQueue.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IDistributedWorkerLock` | interface | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/IDistributedWorkerLock.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ITelemetryEventProcessor` | interface | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/ITelemetryEventProcessor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InMemoryBackgroundEventBus` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/InMemoryBackgroundEventBus.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Subscription` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/InMemoryBackgroundEventBus.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InMemoryWorkerLock` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/InMemoryWorkerLock.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Releaser` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/InMemoryWorkerLock.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `RedisBackgroundEventBus` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/RedisBackgroundEventBus.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `RedisWorkerLock` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/RedisWorkerLock.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Releaser` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/RedisWorkerLock.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TelemetryBackgroundWorker` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/TelemetryBackgroundWorker.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TelemetryEventProcessor` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/TelemetryEventProcessor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionEventService` | class | `ToolNexus.Infrastructure.Observability` | `src/ToolNexus.Infrastructure/Observability/ToolExecutionEventService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiKeyOptions` | class | `ToolNexus.Infrastructure.Options` | `src/ToolNexus.Infrastructure/Options/ApiKeyOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DatabaseInitializationOptions` | class | `ToolNexus.Infrastructure.Options` | `src/ToolNexus.Infrastructure/Options/DatabaseInitializationOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiKeyValidator` | class | `ToolNexus.Infrastructure.Security` | `src/ToolNexus.Infrastructure/Security/ApiKeyValidator.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `LogRedactionPolicy` | class | `ToolNexus.Infrastructure.Security` | `src/ToolNexus.Infrastructure/Security/LogRedactionPolicy.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutorRegistration` | class | `ToolNexus.Infrastructure` | `src/ToolNexus.Infrastructure/ToolExecutorRegistration.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AnalyticsController` | class | `ToolNexus.Web.Areas.Admin.Controllers` | `src/ToolNexus.Web/Areas/Admin/Controllers/AnalyticsController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AnalyticsController` | class | `ToolNexus.Web.Areas.Admin.Controllers.Api` | `src/ToolNexus.Web/Areas/Admin/Controllers/Api/AnalyticsController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ContentController` | class | `ToolNexus.Web.Areas.Admin.Controllers.Api` | `src/ToolNexus.Web/Areas/Admin/Controllers/Api/ContentController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ChangeHistoryController` | class | `ToolNexus.Web.Areas.Admin.Controllers` | `src/ToolNexus.Web/Areas/Admin/Controllers/ChangeHistoryController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DashboardController` | class | `ToolNexus.Web.Areas.Admin.Controllers` | `src/ToolNexus.Web/Areas/Admin/Controllers/DashboardController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ManagementController` | class | `ToolNexus.Web.Areas.Admin.Controllers` | `src/ToolNexus.Web/Areas/Admin/Controllers/ManagementController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolsController` | class | `ToolNexus.Web.Areas.Admin.Controllers` | `src/ToolNexus.Web/Areas/Admin/Controllers/ToolsController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ListDetailWorkspaceViewModel` | record | `ToolNexus.Web.Areas.Admin.Models` | `src/ToolNexus.Web/Areas/Admin/Models/ListDetailWorkspaceViewModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolAdminIndexViewModel` | class | `ToolNexus.Web.Areas.Admin.Models` | `src/ToolNexus.Web/Areas/Admin/Models/ToolAdminViewModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolAdminFormModel` | class | `ToolNexus.Web.Areas.Admin.Models` | `src/ToolNexus.Web/Areas/Admin/Models/ToolAdminViewModels.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminToolsViewModelService` | class | `ToolNexus.Web.Areas.Admin.Services` | `src/ToolNexus.Web/Areas/Admin/Services/AdminToolsViewModelService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IAdminToolsViewModelService` | interface | `ToolNexus.Web.Areas.Admin.Services` | `src/ToolNexus.Web/Areas/Admin/Services/IAdminToolsViewModelService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AuthController` | class | `ToolNexus.Web.Controllers` | `src/ToolNexus.Web/Controllers/AuthController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `HomeController` | class | `ToolNexus.Web.Controllers` | `src/ToolNexus.Web/Controllers/HomeController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolsController` | class | `ToolNexus.Web.Controllers` | `src/ToolNexus.Web/Controllers/ToolsController.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `HomeViewModel` | class | `ToolNexus.Web.Models` | `src/ToolNexus.Web/Models/HomeViewModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `LayoutFooterViewModel` | class | `ToolNexus.Web.Models.Layout` | `src/ToolNexus.Web/Models/Layout/LayoutFooterViewModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `LayoutHeaderViewModel` | class | `ToolNexus.Web.Models.Layout` | `src/ToolNexus.Web/Models/Layout/LayoutHeaderViewModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `NavLinkViewModel` | class | `ToolNexus.Web.Models.Layout` | `src/ToolNexus.Web/Models/Layout/NavLinkViewModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolCategoryViewModel` | class | `ToolNexus.Web.Models` | `src/ToolNexus.Web/Models/ToolCategoryViewModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolIndexViewModel` | class | `ToolNexus.Web.Models` | `src/ToolNexus.Web/Models/ToolIndexViewModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolPageViewModel` | class | `ToolNexus.Web.Models` | `src/ToolNexus.Web/Models/ToolPageViewModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `RelatedToolViewModel` | class | `ToolNexus.Web.Models` | `src/ToolNexus.Web/Models/ToolPageViewModel.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolSeoMetadata` | class | `ToolNexus.Web.Models` | `src/ToolNexus.Web/Models/ToolSeoMetadata.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiSettings` | class | `ToolNexus.Web.Options` | `src/ToolNexus.Web/Options/ApiSettings.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InternalAuthOptions` | class | `ToolNexus.Web.Options` | `src/ToolNexus.Web/Options/InternalAuthOptions.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Program` | class | `GLOBAL` | `src/ToolNexus.Web/Program.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IInternalUserPrincipalFactory` | interface | `ToolNexus.Web.Security` | `src/ToolNexus.Web/Security/InternalUserPrincipalFactory.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InternalUserPrincipalFactory` | class | `ToolNexus.Web.Security` | `src/ToolNexus.Web/Security/InternalUserPrincipalFactory.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AppVersionService` | class | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/AppVersionService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IAppVersionService` | interface | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/IAppVersionService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolManifestLoader` | interface | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/IToolManifestLoader.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolRegistryService` | interface | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/IToolRegistryService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `IToolViewResolver` | interface | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/IToolViewResolver.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolDescriptor` | class | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/ToolDescriptor.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolManifest` | class | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/ToolManifest.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolManifestLoader` | class | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/ToolManifestLoader.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `PlatformManifest` | class | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/ToolManifestLoader.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `PlatformManifestTool` | class | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/ToolManifestLoader.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolRegistryService` | class | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/ToolRegistryService.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolViewResolver` | class | `ToolNexus.Web.Services` | `src/ToolNexus.Web/Services/ToolViewResolver.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminContentEndpointIntegrationTests` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/AdminContentEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Tool` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/AdminContentEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Item` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/AdminContentEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Step` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/AdminContentEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Example` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/AdminContentEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Faq` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/AdminContentEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `RelatedItem` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/AdminContentEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Option` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/AdminContentEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `Graph` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/AdminContentEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiIntegrationCollection` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/ApiIntegrationCollection.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ApiIntegrationTestFactory` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/ApiIntegrationTestFactory.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `BackgroundHealthEndpointTests` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/BackgroundHealthEndpointTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `BackgroundHealthResponse` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/BackgroundHealthEndpointTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DatabaseInitializationStartupBehaviorTests` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/DatabaseInitializationStartupBehaviorTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `BackgroundHealthPayload` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/DatabaseInitializationStartupBehaviorTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DatabaseInitializationPayload` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/DatabaseInitializationStartupBehaviorTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `UnavailableDatabaseFactory` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/DatabaseInitializationStartupBehaviorTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ITestConnectionResolver` | interface | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/ITestConnectionResolver.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TestConnectionResolution` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/ITestConnectionResolver.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `SanitizeErrorMiddlewareTests` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/SanitizeErrorMiddlewareTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TestConnectionResolver` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/TestConnectionResolver.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TestConnectionResolverTests` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/TestConnectionResolverTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TestWebApplicationFactory` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/TestWebApplicationFactory.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolsEndpointIntegrationTests` | class | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/ToolsEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `PingResponse` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/ToolsEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionResponse` | record | `ToolNexus.Api.IntegrationTests` | `tests/ToolNexus.Api.IntegrationTests/ToolsEndpointIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminAnalyticsServiceTests` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/AdminAnalyticsServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubRepository` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/AdminAnalyticsServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `CachingExecutionStepTests` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/CachingExecutionStepTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `FakeToolResultCache` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/CachingExecutionStepTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecutionTelemetryStepTests` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ExecutionTelemetryStepTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `BufferingExecutionEventService` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ExecutionTelemetryStepTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TestPolicy` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ExecutionTelemetryStepTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `PlatformCachingTests` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/PlatformCachingTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InMemoryTestPlatformCache` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/PlatformCachingTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolDefinitionRepoStub` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/PlatformCachingTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecutionPolicyRepoStub` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/PlatformCachingTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AnalyticsRepoStub` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/PlatformCachingTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `PolicyEnforcementStepTests` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/PolicyEnforcementStepTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AllowApiKeyValidator` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/PolicyEnforcementStepTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AlwaysAllowRateGuard` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/PolicyEnforcementStepTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolDefinitionServiceTests` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ToolDefinitionServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InMemoryToolDefinitionRepository` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ToolDefinitionServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolInsightServiceTests` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ToolInsightServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubPipeline` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ToolInsightServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubInsightProvider` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ToolInsightServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ThrowingInsightService` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ToolInsightServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolIntelligenceServiceTests` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ToolIntelligenceServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubRepository` | class | `ToolNexus.Application.Tests` | `tests/ToolNexus.Application.Tests/ToolIntelligenceServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `AdminAuditLoggingTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/AdminAuditLoggingTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DatabaseProviderConfigurationTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/DatabaseProviderConfigurationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DependencyInjectionLifetimeTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/DependencyInjectionLifetimeTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DistributedFoundationTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/DistributedFoundationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `SharedDistributedCache` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/DistributedFoundationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecutionMetricsAggregatorTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/ExecutionMetricsAggregatorTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ExecutionPolicyRepositoryTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/ExecutionPolicyRepositoryTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `InsightProvidersTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/InsightProvidersTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `JsonToXmlConverterTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/JsonToXmlConverterTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `MigrationAndConcurrencySafetyTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/MigrationAndConcurrencySafetyTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `FakeHostEnvironment` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/MigrationAndConcurrencySafetyTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ProviderParityIntegrationTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/ProviderParityIntegrationTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TelemetryIdempotencyTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/TelemetryIdempotencyTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `NoOpToolIntelligenceService` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/TelemetryIdempotencyTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TestDatabaseProvider` | enum | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/TestDatabaseProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TestDatabaseProviderMatrix` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/TestDatabaseProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ProviderTheoryData` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/TestDatabaseProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TestDatabaseInstance` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/TestDatabaseProvider.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `TestDatabaseProviderMatrixTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/TestDatabaseProviderMatrixTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolExecutionEventServiceTests` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/ToolExecutionEventServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `DelegateTelemetryProcessor` | class | `ToolNexus.Infrastructure.Tests` | `tests/ToolNexus.Infrastructure.Tests/ToolExecutionEventServiceTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `JsonToolExecutorTests` | class | `ToolNexus.Tools.Json.Tests` | `tests/ToolNexus.Tools.Json.Tests/JsonToolExecutorTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `JsonValidatorToolExecutorTests` | class | `ToolNexus.Tools.Json.Tests` | `tests/ToolNexus.Tools.Json.Tests/JsonValidatorToolExecutorTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolManifestLoaderTests` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolManifestLoaderTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ManifestFixture` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolManifestLoaderTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubHostEnvironment` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolManifestLoaderTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolShellSeoContractTests` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolShellSeoContractTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubManifestLoader` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolShellSeoContractTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubCatalogService` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolShellSeoContractTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubContentService` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolShellSeoContractTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolViewResolverTests` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolViewResolverTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubManifestLoader` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolViewResolverTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubToolRegistryService` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolViewResolverTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `ToolsControllerRegressionHarnessTests` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolsControllerRegressionHarnessTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubManifestLoader` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolsControllerRegressionHarnessTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubToolCatalogService` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolsControllerRegressionHarnessTests.cs` | UNKNOWN: infer from naming + usage during implementation. |
| `StubToolContentService` | class | `ToolNexus.Web.Tests` | `tests/ToolNexus.Web.Tests/ToolsControllerRegressionHarnessTests.cs` | UNKNOWN: infer from naming + usage during implementation. |


## 7. Data Flow

### 7.1 Request → Runtime → Tool → Output

1. User opens tool page.
2. Tool manifest and descriptor hydrated by web services.
3. Runtime mounts tool component and validates DOM contract.
4. Tool execution either:
   - local client transformation, or
   - API call into orchestration pipeline.
5. Output rendered in UI and optionally exported/copied.
6. Telemetry and metrics persisted asynchronously.

### 7.2 Frontend ↔ Backend interactions

- API tool execution endpoints consumed by tool modules.
- Admin area communicates with API admin controllers for analytics/content operations.
- Correlation IDs propagate through middleware to logs and telemetry processor.

### 7.3 State handling

- Browser: tool-local state modules + UI state manager.
- Server: scoped request services and singleton platform services.
- Cache: distributed platform cache and tool result cache abstractions.


### 7.4 Operator workflows (Runs 11–14)

- **Analytics drilldown workflow:** Operators now start from dashboard drilldown cards, jump to `/admin/analytics`, and apply server-side tool/date filters. Results are paged by API query parameters (`page`, `pageSize`) to avoid full dataset loading.
- **Bulk admin workflow:** In Tool Workspace, operators multi-select tools, run safe bulk enable/disable actions, and must confirm every status mutation before submit.
- **Operator productivity workflow:** Table filtering, selection shortcuts (`Ctrl/Cmd+F`, `Ctrl/Cmd+Shift+E`, `Ctrl/Cmd+Shift+D`), and status severity badges optimize high-volume triage.
- **Command palette workflow:** Admin shell now exposes command-palette actions for quick navigation, open-module jumps, and analytics filter jumps. Commands remain read/navigation-only (no runtime mutation actions in palette).

## 8. Design System Documentation

- Styles in `src/ToolNexus.Web/wwwroot/css` follow platform-first naming and component layering.
- Guardrails enforced by `scripts/design-system-guard.mjs` and `scripts/platform-guard.mjs`.
- Motion/theme/header/state JS files centralize cross-tool behavior.
- Design intent: developer platform feel (not marketing-site behavior), deterministic interaction models, keyboard/DOM contract stability.

## 9. Automation & QA

### 9.1 .NET tests

- `tests/ToolNexus.Application.Tests`
- `tests/ToolNexus.Infrastructure.Tests`
- `tests/ToolNexus.Api.IntegrationTests`
- `tests/ToolNexus.Web.Tests`
- `tests/ToolNexus.Tools.Json.Tests`

### 9.2 JS + runtime tests

- Jest suites under `tests/js` and `tests/js/runtime`.
- Runtime contract/compatibility suites verify mount lifecycle and ecosystem stability.

### 9.3 Playwright suites

- `tests/playwright/contracts`
- `tests/playwright/runtime`
- `tests/playwright/smoke`
- `tests/playwright/screenshots`

### 9.4 CI workflows

- `.github/workflows/ci.yml`: full-stack pipeline including Node checks, Playwright, dotnet build/test, Docker build.
- `.github/workflows/dotnet.yml`: minimal dotnet restore/build/test workflow.

## 10. Configuration & Environments

- API config: `src/ToolNexus.Api/appsettings.json`, `appsettings.Docker.json`.
- Web config: `src/ToolNexus.Web/appsettings*.json` (environment-specific).
- Security/auth config includes cookie auth, JWT options, API key options, security header options.
- Data protection key ring may be persisted via `DataProtection:KeyRingPath`.
- Redis and database provider behavior are configuration driven in infrastructure DI.

## 11. Developer Onboarding

1. Clone repo and install prerequisites (.NET 8 SDK, Node 20+, Docker optional).
2. `npm ci` for JS toolchain.
3. `dotnet restore ToolNexus.sln`.
4. Run web/api projects and verify health endpoints.
5. Execute checks:
   - `npm run check:platform`
   - `npm run test:js -- --runInBand`
   - `dotnet test ToolNexus.sln`
6. Add new tool by updating manifest + JS module + optional executor + tests.
7. Validate with runtime tests + Playwright smoke + policy guards.

## 12. AI Onboarding (VERY IMPORTANT)

### 12.1 Operating constraints for autonomous agents

- Never bypass manifest governance and startup validators when adding tools.
- Preserve execution pipeline ordering (policy/caching/telemetry semantics are contract-sensitive).
- Maintain rate limiting and middleware hardening on API boundary.
- Keep runtime DOM contract backward compatible; update contract tests if intentionally changed.
- Do not collapse scoped services into singleton unless state and thread-safety analysis is complete.

### 12.2 Safe extension checklist

1. Confirm contract additions in both backend model and frontend runtime.
2. Update DI registration where new abstractions are introduced.
3. Add at least one unit test + one integration/contract test for behavioral changes.
4. Ensure logging/redaction policy coverage for new exception paths.
5. Run release readiness scripts before proposing merge.

### 12.3 Must-not-break boundaries

- Tool execution request/response schema.
- Manifest slug-to-executor alignment.
- Authentication cookies and API security middleware sequence.
- Telemetry worker queue + background lock semantics.

## 13. Extension Guide

### 13.1 Add new tool

- Add manifest entry and SEO metadata.
- Implement frontend module (or manifest-mapped pass-through when purely server driven).
- Register executor if server execution required.
- Add tests across JS + API/application as relevant.

### 13.2 Add runtime feature

- Extend `tool-runtime.js` or kernel modules with compatibility guards.
- Update runtime tests (`tests/js/runtime/*` and Playwright runtime specs).

### 13.3 Expand UI system

- Add component styles in CSS architecture and enforce via design-system guard.
- Keep shared motion/theme/header conventions centralized.

### 13.4 Add AI capabilities

- Introduce new application service interfaces first, infrastructure implementations second.
- Document policy, observability, and redaction implications.
- Add explicit rate/cost guard strategy before enabling public routes.

## 14. Technical Debt & Future Vision

### 14.1 Identified risk areas

- Artifact volume and mixed runtime styles (legacy + modular JS) increase maintenance complexity.
- High service count in DI graph requires dependency governance to prevent accidental lifecycle regressions.
- Manifest/executor mapping correctness depends on multi-location consistency.

### 14.2 Evolution recommendations

1. Introduce generated architecture map in CI from Roslyn/TS AST to keep class docs synchronized.
2. Formalize ADR directory for key design decisions (pipeline ordering, cache invalidation semantics, auth topology).
3. Build a runtime plugin SDK for tools to reduce bespoke module structure divergence.
4. Add contract versioning and schema publishing for tool execution payloads.

## 15. Validation Checklist

- [x] All folders covered.
- [x] All services documented (inventory-level).
- [x] All classes documented (inventory includes all discovered declarations).
- [x] Runtime lifecycle explained.
- [x] Tool system explained.
- [x] Onboarding guide complete.
- [x] AI onboarding included.
- [x] Extension rules defined.

## Runtime Compatibility Requirements (Platform Contract)

Tool modules must follow runtime-safe contracts:

- Mount logic belongs in lifecycle-compatible APIs (`create/init/destroy` or `mount`).
- `runTool(action, input)` is execution-only and must **not** assume DOM mount arguments.
- Runtime DOM anchors must exist (or be creatable by adapter):
  - `data-tool-root`, `data-tool-header`, `data-tool-body`, `data-tool-input`, `data-tool-output`, `data-tool-actions`.
- `#tool-root` must include `data-tool-root="true"` and a valid `data-tool-root-id` before lifecycle mount.
- Legacy modules can rely on bridge compatibility, but should migrate to lifecycle contract to avoid fallback paths.

### Safe tool initialization checklist
1. Avoid direct `document.getElementById(...)` writes without null checks.
2. Keep initialization idempotent (multiple bootstraps should not duplicate listeners).
3. Return a cleanup routine (`destroy`) for event/timer disposal.
4. Do not throw on missing optional DOM; allow adapter-provided anchors.
5. Keep execution handlers type-safe (`typeof action === 'string'`, input normalization).

## Tool Runtime Safety Contract

All execution-style tools must follow a single defensive runtime contract:

- `action` must be a string before use.
- `input` must be normalized to a string (`""` fallback).
- tools must never throw for unsupported or malformed runtime payloads.
- unsupported actions must return `{ ok:false, reason:"unsupported_action" }`.
- legacy bridge payloads (including accidental `HTMLElement` values) must be treated as no-op and must not crash bootstrap.

Platform enforcement points:

- `runtime/runtime-safe-tool-wrapper.js` normalizes `action` and `input`, guards non-string and DOM payloads, and wraps execution in a no-throw boundary.
- `tool-page.js` now uses the runtime wrapper before client execution and API fallback invocation.
- `runtime/legacy-execution-bridge.js` skips execution-only `runTool(action,input)` contracts during mount fallback flow.

## Runtime Incident Reporting

ToolNexus runtime now includes a dedicated incident channel for legacy contract violations and runtime execution errors.

### What changed
- Added a normalized runtime incident contract (`toolSlug`, `phase`, `errorType`, `message`, `stack`, `payloadType`, `timestamp`).
- Added client-side runtime incident reporter with queueing, dedupe, debounce, and batched API delivery.
- Added backend ingestion endpoint: `POST /api/admin/runtime/incidents`.
- Added persistence and aggregation for runtime incidents, then surfaced them in Admin Execution → Incidents.

### Operator impact
- Runtime continues safely (safe noop for invalid payloads) while all incidents are visible to Admin operators.
- Repeated runtime failures collapse into a single grouped incident with incrementing count and updated last occurrence.
