MODE=B (backend + tool services)

# ToolNexus

ToolNexus is a .NET 8 developer tools platform inspired by CodeBeautify, with a cinematic dark UI, manifest-driven routes, and pluggable tool executors.

## Clean Architecture Solution Layout

- `src/ToolNexus.Domain`
  - Core contracts and entities (`IToolExecutor`, `ToolRequest`, `ToolResult`)
- `src/ToolNexus.Application`
  - Use-case orchestration (`IToolService`, `ToolService`)
  - Application DTOs (`ToolExecutionRequest`, `ToolExecutionResponse`)
  - `AddApplication()` DI extension
- `src/ToolNexus.Infrastructure`
  - Tool executor implementations (`JsonToolExecutor`, `XmlToolExecutor`, `CsvToolExecutor`, `Base64ToolExecutor`, `HtmlToolExecutor`, `MinifierToolExecutor`)
- `src/ToolNexus.Api`
  - API controllers (`ToolsController`)
  - Composition root for API + runtime executor registration
  - Depends only on `ToolNexus.Application`
- `src/ToolNexus.Web`
  - Razor MVC UI, manifest services, static assets
  - No dependency on `ToolNexus.Infrastructure`
- `src/ToolNexus.ConsoleRunner`
  - Console demo of executor usage
- `tests/ToolNexus.Tools.Json.Tests`
  - xUnit tests for JSON executor behavior

## Dependency Rules

- `Domain` has no dependencies on other solution layers.
- `Application` depends on `Domain`.
- `Infrastructure` depends on `Domain`.
- `Api` depends on `Application` only.
- `Web` does not depend on `Infrastructure`.

## DI Setup

### Application registration

`ToolNexus.Application` exposes:

- `services.AddApplication()`
  - Registers `IToolService -> ToolService`

### API registration

`ToolNexus.Api/Program.cs`:

- calls `AddApplication()`
- loads `ToolNexus.Infrastructure` assembly at runtime
- scans for `IToolExecutor` implementations
- registers all executors as scoped services

This keeps API compile-time dependency focused on Application while still composing Infrastructure at runtime.

## Routes

Web:
- `/`
- `/tools`
- `/tools/{category}`
- `/tools/{slug}`

API:
- `POST /api/tools/{slug}/{action}`

## Local Run

> Prerequisites: .NET SDK 8.0+

```bash
dotnet restore ToolNexus.sln
dotnet build ToolNexus.sln
```

Terminal 1 (API):
```bash
dotnet run --project src/ToolNexus.Api
```

Terminal 2 (Web):
```bash
dotnet run --project src/ToolNexus.Web
```

Terminal 3 (tests):
```bash
dotnet test tests/ToolNexus.Tools.Json.Tests
```
