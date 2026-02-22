# Playwright Start Command Decision

## Selected startup command

`ASPNETCORE_ENVIRONMENT=Development dotnet run --no-launch-profile --project src/ToolNexus.Web --urls http://127.0.0.1:5081`

## Why this is the safest deterministic option

- Uses the project entrypoint directly (`src/ToolNexus.Web`) instead of relying on an external shell script.
- Disables launch-profile port indirection (`--no-launch-profile`) so CI and local runs use the same bind URL.
- Forces an explicit loopback bind (`127.0.0.1:5081`) to avoid localhost/IPv6 mismatch races.
- Works as a long-running foreground process for Playwright `webServer` orchestration lifecycle.
