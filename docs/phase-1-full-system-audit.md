# Phase 1: Full System Audit (ToolNexus)

## Audit Scope
This audit covers the current state of the Clean Architecture solution (`Application`, `Infrastructure`, `Api`, `Web`) against the enterprise restart objectives before making any implementation changes.

## Environment Validation
- `dotnet` CLI is not available in this environment, so build/test/runtime verification could not be executed.
- Audit findings are based on static code/configuration inspection.

## Findings by Objective

### 1) DI, service wiring, and port configuration

#### DI / service wiring
- `IToolResultCache` is implemented by `RedisToolResultCache` and registered (`Scoped`) in Infrastructure.
- Caching services are registered more than once (`AddMemoryCache` and `AddDistributedMemoryCache` in both Infrastructure and API composition), increasing ambiguity and configuration drift risk.
- `IToolContentService` is registered in both Application and Infrastructure. This is redundant and should be owned by one composition boundary.
- API key validation middleware exists but is never added to the API pipeline.

#### Port configuration
- API has stable Kestrel endpoints (`5163`/`7163`) in `appsettings.json`.
- Web app does not define explicit Kestrel endpoints in `appsettings.json`.
- Both API and Web `launchSettings.json` still use random high development ports (`6455x`) instead of stable coordinated ports.

### 2) SQLite database integration
- SQLite provider and connection string are present in both API and Web configs under `Database`.
- Infrastructure registers EF Core with SQLite via `ToolNexusContentDbContext`.
- A design-time DbContext factory exists for migrations tooling.
- No committed EF migrations were found in Infrastructure, so schema evolution is not yet source-controlled.
- Startup seeding calls `Database.MigrateAsync`, which is correct once migrations are present.

### 3) Dynamic CMS content model and architecture boundaries
- Required content models are present in Application (`ToolContent`, `ToolFaq`, `ToolCategory`, `ToolRelated`).
- Required abstractions exist (`IToolContentRepository`, `IToolContentService`).
- Infrastructure implements repository via EF (`EfToolContentRepository`).
- Web consumes content through `IToolContentService`; no direct `DbContext` usage detected.

### 4) Tool execution audit (validation, cancellation, UX/security hooks)
- Execution uses an ordered pipeline with validation, policy enforcement, concurrency limit, cache lookup/write, execution, and metrics.
- Cancellation tokens are propagated through pipeline and executor calls.
- Input/payload constraints exist through policy enforcement.
- Gap: executor coverage does not appear to match full manifest surface (many manifest tools may not have server executors), increasing runtime `not found` risk for API execution paths.
- Gap: Base64 executor slug/action modeling appears misaligned with manifest split (`base64-encode` and `base64-decode`).

### 5) Caching (Redis + memory)
- `RedisToolResultCache` includes a failure-threshold circuit breaker and memory fallback.
- Gap: cache key currently hashes only `input` at pipeline level; request `options` are not part of key, risking incorrect cached responses.
- Gap: memory cache size is configured globally, but per-entry cache size is not assigned in cache writes, so hard size enforcement is ineffective.
- Gap: no explicit stampede/single-flight protection.
- Positive: TTL is already policy-driven per tool (`CacheTtlSeconds`).

### 6) Security hardening
- Global exception middleware sanitizes 500 errors.
- Structured request logging middleware currently logs method/path/status/duration only (low leakage risk in current implementation).
- CSP/security header middleware is present.
- Rate limiting is configured and applied.
- Gap: API key security is defined in Swagger, but middleware enforcement is not actually in pipeline; enforcement currently depends on tool policy step, which leaves non-tool API surfaces unauthenticated.

### 7) UI redesign readiness
- UI already includes a modernized two-panel tool layout and dark mode toggle.
- Styling is custom CSS-based; Tailwind is not in use.
- Further premium redesign can proceed without major architectural blockers.

### 8) SEO optimization
- Tool pages set dynamic title/description/keywords/canonical and emit JSON-LD.
- JSON-LD includes `WebApplication`, `BreadcrumbList`, and conditional `FAQPage`.
- Dynamic sitemap endpoint (`/sitemap.xml`) is implemented and pulls tool slugs from content service.

### 9) Observability
- OpenTelemetry metrics and Prometheus exporter are configured in API.
- Tool pipeline metrics step exists.
- Health checks include process, app services, and distributed cache check.

### 10) Code organization
- Full feature-folder refactor (`/Features/*`) is not yet applied.
- Existing structure is still predominantly project/layer based.

## Priority Risk List (for Phase 2 implementation)
1. **P0**: Stabilize API/Web port strategy across `appsettings` + `launchSettings` + environment overrides.
2. **P0**: Ensure consistent API key enforcement at pipeline/middleware level for intended protected endpoints.
3. **P0**: Fix cache key correctness by including normalized options and schema version.
4. **P1**: Remove duplicate DI registrations and define single ownership for caching/content service registration.
5. **P1**: Add EF migrations and establish migration workflow in repo.
6. **P1**: Resolve manifest-to-executor coverage mismatches (especially Base64 modeling).
7. **P2**: Introduce stampede protection and stronger cache observability.
8. **P2**: Plan feature-based folder organization incrementally after runtime hardening.

## Recommended Phase 2 Start Sequence
1. Composition root and DI cleanup.
2. Port normalization and environment config matrix.
3. Cache correctness + stampede guard.
4. API key/security alignment.
5. SQLite migrations baseline.
6. Tool coverage alignment.
