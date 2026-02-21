# REPO_MAP

## Solution Structure
- `ToolNexus.sln` contains 5 runtime projects (`ToolNexus.Web`, `ToolNexus.Api`, `ToolNexus.Application`, `ToolNexus.Infrastructure`, `ToolNexus.ConsoleRunner`) and 5 test projects. 
- Runtime architecture is effectively **Web + API + Application + Infrastructure**, with no `Domain` project currently present despite README and Dockerfile references.

## Project Boundaries
- `ToolNexus.Api` references `Application` + `Infrastructure`; it hosts HTTP APIs, auth, observability, and rate limiting.
- `ToolNexus.Web` references `Application` + `Infrastructure`; it serves Razor pages, SEO pages, and JS tool runtime.
- `ToolNexus.Application` contains core interfaces, policies, and execution pipeline.
- `ToolNexus.Infrastructure` contains EF Core content persistence, cache implementation, tool executors, insight providers.

## Dependency Direction & Clean Architecture Compliance
- Positive: abstraction-driven runtime via interfaces (`IToolExecutor`, `IToolExecutionPipeline`, `IToolResultCache`).
- Positive: DI composition roots in API/Web.
- Risk: both API and Web directly reference Infrastructure, which weakens strict inward dependency direction.
- Risk: some “application” logic depends on ASP.NET HTTP context concerns (`PolicyEnforcementStep`), blending app/domain and transport layers.
- Risk: repository documents a `Domain` layer that does not exist in current source tree.

## API Gateway Presence
- No dedicated external AI/API gateway service exists.
- Current "gateway-like" behavior is a tool execution pipeline inside `Application` with policies + resilience + cache.

## Orchestration Strategy
- Pipeline-driven orchestration in `ToolExecutionPipeline`.
- Steps: validation -> policy enforcement -> rate/concurrency -> caching -> execution -> metrics.
- Executor lookup is slug-based dictionary built from registered executors.

## Provider Adapter Model
- Adapter-like contracts exist (`IToolExecutor`, `IToolInsightProvider`, `IApiToolExecutionStrategy`).
- Strategy usage exists (`IApiToolExecutionStrategy`, `IClientToolExecutionStrategy`).
- AI-provider adapter/fallback scoring model is not present.

## Immediate Architectural Risks
1. Potential step-order ambiguity: both `PolicyEnforcementStep` and `CachingExecutionStep` use `Order = 200`.
2. Layer purity erosion from `IHttpContextAccessor` usage inside application pipeline.
3. Documentation drift (`README` and `dockerfile` reference missing `ToolNexus.Domain`).
