# ToolNexus Architecture Summary (Current-State Audit)

## System Design
- **Primary stack:** .NET 8 API + Razor Web app + JS runtime tooling + SQLite-backed tests.
- **Projects:** `ToolNexus.Api`, `ToolNexus.Web`, `ToolNexus.Application`, `ToolNexus.Infrastructure`, plus test projects.
- **Composition root:** API startup in `src/ToolNexus.Api/Program.cs` wires application, infrastructure, security, observability, rate limiting, and API middleware chain.

## Runtime Flow (Tool Execution)
1. Browser runtime initializes tool shell and validates/adapts DOM contracts.
2. Tool execution requests hit API routes under `/api/v1/tools/{slug}/{action}`.
3. Policy checks and execution handlers resolve tool definitions + execution policies from infrastructure stores.
4. Response normalization and execution logging middleware produce telemetry and incident data.

## Authentication / Authorization Flow
- API supports **Bearer JWT** and **cookie auth** in Swagger + middleware pipeline.
- ASP.NET Identity Core + roles are registered via EF stores.
- Authorization runs after routing and before rate limiter endpoint execution.

## Tool Execution Flow (Server)
- Request logging + correlation middleware enriches request context.
- Admin/tool execution logging middlewares emit structured logs.
- `SanitizeErrorMiddleware` converts uncaught exceptions into stable API error contracts before response starts.
- Controllers execute application services with policy and action-level checks.

## Startup Orchestration
1. Build host configuration and file logging bootstrap.
2. Register MVC/controllers + OpenAPI security definitions.
3. Register app/infrastructure/security/observability services.
4. Build app and install middleware in this order: security headers → correlation → request logging → admin/tool logging → sanitize errors → routing/authz/rate limiting/cache headers.
5. Map health/ready/metrics/controllers and log startup completion.

## Architecture Notes from Audit
- Existing tests indicate runtime + API execution paths are generally stable.
- A resilience gap existed in error sanitization when exceptions happened **after** response start (fixed in this audit iteration).
