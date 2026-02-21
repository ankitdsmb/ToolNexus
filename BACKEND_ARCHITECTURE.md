# BACKEND_ARCHITECTURE

## Runtime & API Style
- .NET target: `net8.0` across runtime/test csproj files.
- API style: ASP.NET Core Controllers (`[ApiController]`, `ControllerBase`), not Minimal APIs for tool endpoints.

## Data Access
- EF Core with SQLite (`ToolNexusContentDbContext`, `UseSqlite`).
- No Dapper usage found.
- Content model is persisted through `EfToolContentRepository`; manifests are file-backed via `JsonFileToolManifestRepository`.

## Caching
- Two-level cache via `RedisToolResultCache`:
  - local `IMemoryCache` first
  - `IDistributedCache` (Redis when configured) second
- Includes circuit-breaker-like behavior for Redis failures and memory fallback.
- Distributed cache registration is optional based on Redis connection presence.

## Messaging
- No RabbitMQ/MassTransit/Kafka integration found.
- Workloads are synchronous request/response with in-process concurrency limiting.

## Config Handling
- Strongly typed options with `ValidateOnStart` used for key sections (cache, policy, JWT/security headers, API keys).
- Env fallback examples: Redis connection string from `ConnectionStrings:Redis` or `REDIS_CONNECTION_STRING`.

## Logging & Telemetry
- Serilog configured for API host.
- OpenTelemetry metrics enabled with Prometheus scraping endpoint.
- Health checks: process, app services, distributed cache.

## Root-Cause Risk Analysis
1. **Security defaults in config**: placeholder API key and static dev JWT signing key can drift into prod if config hygiene is weak.
2. **Pipeline coupling**: app-layer policy enforcement reads HTTP method/header via `IHttpContextAccessor`, reducing portability and testability.
3. **Order collision in steps**: cache and policy share order `200`; behavior can vary by registration sequence if modified later.
4. **No async queue/offload path**: heavy transformations run in request path; at scale this can produce latency spikes.
