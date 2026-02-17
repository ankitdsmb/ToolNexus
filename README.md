MODE=B (backend + tool services)

# ToolNexus

[![Build & Test](https://github.com/<org>/ToolNexus/actions/workflows/ci.yml/badge.svg)](https://github.com/<org>/ToolNexus/actions/workflows/ci.yml)
[![Code Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)](https://github.com/<org>/ToolNexus/actions/workflows/ci.yml)
[![Docker Tag](https://img.shields.io/docker/v/<org>/toolnexus?label=docker)](https://hub.docker.com/r/<org>/toolnexus)

ToolNexus is a .NET 8 developer tools platform inspired by CodeBeautify, with a cinematic dark UI, manifest-driven routes, and pluggable tool executors.

## Updated Clean Architecture Solution Structure

```text
ToolNexus.sln
├─ src/
│  ├─ ToolNexus.Domain/
│  │  ├─ IToolExecutor.cs
│  │  ├─ ToolRequest.cs
│  │  └─ ToolResult.cs
│  ├─ ToolNexus.Application/
│  │  ├─ DependencyInjection.cs
│  │  ├─ Models/
│  │  │  ├─ ToolExecutionRequest.cs
│  │  │  └─ ToolExecutionResponse.cs
│  │  └─ Services/
│  │     ├─ IToolService.cs
│  │     └─ ToolService.cs
│  ├─ ToolNexus.Infrastructure/
│  │  └─ Executors/
│  │     ├─ Base64ToolExecutor.cs
│  │     ├─ CsvToolExecutor.cs
│  │     ├─ HtmlToolExecutor.cs
│  │     ├─ JsonToolExecutor.cs
│  │     ├─ MinifierToolExecutor.cs
│  │     └─ XmlToolExecutor.cs
│  ├─ ToolNexus.Api/
│  │  ├─ Controllers/
│  │  │  └─ ToolsController.cs
│  │  └─ Program.cs
│  ├─ ToolNexus.Web/
│  │  ├─ Controllers/
│  │  ├─ Models/
│  │  ├─ Services/
│  │  ├─ Views/
│  │  └─ wwwroot/
│  └─ ToolNexus.ConsoleRunner/
└─ tests/
   └─ ToolNexus.Tools.Json.Tests/
```

## Layer Responsibilities

- **ToolNexus.Domain**
  - Core abstractions and contracts.
  - Contains `IToolExecutor` and `ToolResult`.
- **ToolNexus.Application**
  - Use-case orchestration and DTOs.
  - `ToolService` coordinates tool execution.
- **ToolNexus.Infrastructure**
  - Technical implementation details.
  - All executor implementations live here.
- **ToolNexus.Api**
  - HTTP API endpoints (controllers).
  - Depends on `ToolNexus.Application` only.
- **ToolNexus.Web**
  - Razor MVC UI and static client assets.
  - Does not reference `ToolNexus.Infrastructure`.

## Dependency Rules

- `Domain` has no dependency on other solution layers.
- `Application` depends on `Domain`.
- `Infrastructure` depends on `Domain`.
- `Api` depends only on `Application` (in project references).
- `Web` does not reference `Infrastructure`.

## DI Setup

### Application DI (`ToolNexus.Application/DependencyInjection.cs`)

- `AddApplication()`
  - Registers `IToolService` as scoped to `ToolService`.
- `AddToolExecutorsFromAssembly(Assembly assembly)`
  - Scans a provided assembly for concrete `IToolExecutor` implementations.
  - Registers each executor as scoped `IToolExecutor`.

### API Composition Root (`ToolNexus.Api/Program.cs`)

- Calls `builder.Services.AddApplication()`.
- Loads `ToolNexus.Infrastructure` assembly at runtime.
- Calls `builder.Services.AddToolExecutorsFromAssembly(infrastructureAssembly)`.
- Keeps API compile-time dependency constrained to `Application` while still wiring infrastructure executors in DI.

## Routes

Web:
- `/`
- `/tools`
- `/tools/{category}`
- `/tools/{slug}`

API:
- `GET /api/tools/{slug}/{action}?input=...`
- `POST /api/v1/tools/{slug}`
- `GET /health`
- `GET /ready`

Request body:
```json
{
  "action": "format",
  "input": "...",
  "options": {}
}
```

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

> By default, the web app resolves `/api/v1/tools/*` from the same origin in non-development hosting (IIS/Kestrel reverse-proxy friendly). For split local runs, keep Development mode and/or set `ApiBaseUrl` (for example `http://localhost:5163`).

Terminal 3 (tests):
```bash
dotnet test tests/ToolNexus.Tools.Json.Tests
```

## Client-Side Execution Classification

ToolNexus keeps server-side execution as the default path and enables optional client-side execution only for explicitly classified safe actions.

- A tool declares safe actions through `clientSafeActions` in `tools.manifest.json`.
- The tool page reads that metadata and only attempts local execution for those actions.
- Any non-safe action (or local execution failure) falls back to the existing API execution path.

Current classification:

| Tool slug | Client-safe actions | Server fallback |
| --- | --- | --- |
| `json-formatter` | `format`, `minify`, `validate` | `to-csv` and any unsupported action |
| `base64-encode` | `encode` | any unsupported action |
| `base64-decode` | `decode` | any unsupported action |

Security controls for client execution:
- No `eval()` usage.
- Input sanitization is applied before local processing (null-byte stripping, Base64 format checks, JSON parse validation).
- Unsafe or malformed input raises a controlled error and the UI can fall back to API execution when applicable.
