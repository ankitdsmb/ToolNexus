MODE=B (backend + tool services)

# ToolNexus

ToolNexus is a .NET 8 developer tools platform inspired by CodeBeautify, with a new cinematic dark UI, manifest-driven routes, and pluggable tool executors.

## Architecture

- `src/ToolNexus.Web` — ASP.NET Core MVC web front-end with:
  - `/` home page (featured tools + search)
  - `/tools` tools index
  - `/tools/{category}` category listing
  - `/tools/{slug}` tool page with CodeMirror editor, sample panel, copy/download, and privacy banner
- `src/ToolNexus.Api` — ASP.NET Core Web API exposing:
  - `POST /api/v1/tools/{slug}`
- `src/ToolNexus.Tools.Common` — shared contracts (`IToolExecutor`, `ToolRequest`, `ToolResult`)
- `src/ToolNexus.Tools.Json` — complete JSON implementation (`format`, `minify`, `validate`, `to-csv`)
- `src/ToolNexus.Tools.Xml`, `src/ToolNexus.Tools.Csv`, `src/ToolNexus.Tools.Base64`, `src/ToolNexus.Tools.Html`, `src/ToolNexus.Tools.Minifier` — starter executors with TODO hooks
- `src/ToolNexus.ConsoleRunner` — plugin runner demo that calls `ExecuteAsync`
- `tests/ToolNexus.Tools.Json.Tests` — xUnit sample tests for JSON tool behavior
- `tools.manifest.json` — 25 initial tools and metadata

## Routes

Web:
- `/`
- `/tools`
- `/tools/{category}`
- `/tools/{slug}`

API:
- `POST /api/v1/tools/{slug}`

## Tool Manifest

All tool pages and metadata are generated from `tools.manifest.json`. Slugs are referenced by:
- MVC route resolution
- Client tool modules under `wwwroot/js/tools/{slug}.js`
- API execution requests

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

Terminal 4 (console runner):
```bash
dotnet run --project src/ToolNexus.ConsoleRunner
```

## Production Deployment

### Azure App Service (MODE=B)

1. Create two App Services:
   - `toolnexus-web`
   - `toolnexus-api`
2. Configure `ApiBaseUrl` in `ToolNexus.Web` settings to the API URL.
3. Publish:

```bash
dotnet publish src/ToolNexus.Api -c Release -o ./artifacts/api
dotnet publish src/ToolNexus.Web -c Release -o ./artifacts/web
```

4. Deploy `./artifacts/api` and `./artifacts/web` to their matching services.

### Static Host Option

If you need a static-only deployment, switch to MODE=A in a follow-up branch. Current scaffold is MODE=B and requires ASP.NET hosting.

## Add a New Tool

1. Add entry to `tools.manifest.json`.
2. Add module `src/ToolNexus.Web/wwwroot/js/tools/{slug}.js`.
3. Implement backend executor (recommended) in `src/ToolNexus.Tools.*`:
   - implement `IToolExecutor`
   - set `Slug`
   - support actions in `ExecuteAsync`
4. Register executor in `src/ToolNexus.Api/Program.cs`.
5. Add unit tests.

## NuGet Packaging for tools.*

Each tool library can be packed and published independently.

```bash
dotnet pack src/ToolNexus.Tools.Json -c Release -o ./artifacts/nuget
# repeat for other ToolNexus.Tools.* projects
```

Publish to nuget.org:

```bash
dotnet nuget push ./artifacts/nuget/ToolNexus.Tools.Json.*.nupkg \
  --api-key <NUGET_API_KEY> \
  --source https://api.nuget.org/v3/index.json
```

## ZIP-Friendly File List

```
ToolNexus.sln
.editorconfig
.gitattributes
tools.manifest.json
README.md
src/ToolNexus.Web/**
src/ToolNexus.Api/**
src/ToolNexus.Tools.Common/**
src/ToolNexus.Tools.Json/**
src/ToolNexus.Tools.Xml/**
src/ToolNexus.Tools.Csv/**
src/ToolNexus.Tools.Base64/**
src/ToolNexus.Tools.Html/**
src/ToolNexus.Tools.Minifier/**
src/ToolNexus.ConsoleRunner/**
tests/ToolNexus.Tools.Json.Tests/**
```

## Notes

- TODO markers are intentionally included where advanced AI-assisted transforms should be attached.
- Current setup prioritizes clean separation and DI extensibility for future tool packages.
