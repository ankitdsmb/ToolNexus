# ToolNexus Logging Architecture

## Folder structure

```text
logs/
  runtime/
    runtime-YYYY-MM-DD.log
  admin/
    admin-YYYY-MM-DD.log
  api/
    api-YYYY-MM-DD.log
    tool-sync-YYYY-MM-DD.log
  startup/
    startup-YYYY-MM-DD.log
  errors/
    error-YYYY-MM-DD.log
```

## Log flow diagram

```text
Runtime JS (runtime-migration-logger / runtime-incident-reporter)
  -> POST /api/admin/runtime/logs
  -> RuntimeIncidentsController
  -> RuntimeClientLoggerService
  -> logs/runtime/runtime-YYYY-MM-DD.log

Admin/API requests
  -> AdminApiLoggingMiddleware / ToolExecutionLoggingMiddleware
  -> Serilog async file sinks
  -> logs/admin and logs/api

Startup and endpoint sync
  -> Program startup lifecycle log + EndpointDiagnosticsHostedService
  -> logs/startup and logs/api/tool-sync

Unhandled exceptions
  -> ASP.NET + Serilog error channel
  -> logs/errors/error-YYYY-MM-DD.log
```

## Runtime → API → File pipeline

1. Browser runtime sends structured events to `/api/admin/runtime/logs`.
2. API accepts batched `logs` payload with `toolSlug`, `level`, `message`, `stack`, `timestamp`, `metadata`.
3. `RuntimeClientLoggerService` truncates unsafe/large values and appends JSON lines to daily runtime files.
4. If file write fails, logger emits one console warning and continues execution.

## Config (`appsettings.json`)

```json
"LoggingOptions": {
  "EnableFileLogging": true,
  "EnableRuntimeLogCapture": true,
  "MinimumLevel": "Information",
  "RetentionDays": 14
}
```

## Example entries

Runtime entry:

```json
{"type":"client-runtime-log","source":"runtime.lifecycle","level":"error","message":"Tool mount failed","stack":"TypeError: ...","toolSlug":"json-formatter","timestamp":"2026-02-24T11:30:14.493Z","metadata":"{\"phase\":\"mount\"}"}
```

Admin entry:

```text
2026-02-24T11:30:14.4930000Z [INF] (AdminApiLogger) Admin API request completed POST /api/admin/runtime/logs -> 202 in 11ms
```

Error entry:

```text
2026-02-24T11:30:14.4930000Z [ERR] (ToolNexus.Api.Middleware.SanitizeErrorMiddleware) Unhandled exception while processing /api/v1/tools/json-formatter
```
