# ToolNexus `.NET 7` ERR_CONNECTION_REFUSED Diagnostic + Fix Prompt

Use this prompt to diagnose and remediate `ERR_CONNECTION_REFUSED` when ToolNexus.Web calls ToolNexus.Api.

## PHASE 1 — ROOT CAUSE LISTING

1. **API process is not running**  
   If the API host process is down (or crashed at startup), the browser's TCP SYN to `localhost:5163` gets no listener, so the socket handshake is refused.

2. **API listens on a different port**  
   In ASP.NET Core, `launchSettings.json`, `ASPNETCORE_URLS`, and Kestrel endpoint config can move bindings; a mismatch means requests target a closed port.

3. **HTTPS vs HTTP mismatch**  
   If the client uses `http://` but API only binds `https://` (or vice versa), the expected endpoint is absent and connection attempts to the wrong scheme/port are refused.

4. **Kestrel bind scope mismatch (`localhost`, `*`, container interface)**  
   Binding only to loopback or only to one interface can make the endpoint unreachable from another runtime context (container/reverse-proxy path), producing connection refusal.

5. **`launchSettings` vs `appsettings` misalignment**  
   Local launch profiles can advertise one URL while `Kestrel:Endpoints` config sets another; startup logs then show different ports than UI assumptions.

6. **Web app API base URL overridden by env vars**  
   `ApiSettings:BaseUrl` may be overridden by environment variables (e.g., `ApiSettings__BaseUrl`) at runtime, silently replacing expected values.

7. **Reverse proxy, firewall, or local security tooling issue**  
   If traffic is blocked before reaching Kestrel (proxy forwarding missing, host firewall rules, endpoint protection), the client sees refused sockets.

---

## PHASE 2 — CONFIG INSPECTION STEPS (ORDERED)

1. **Verify API binding sources**
   - File: `src/ToolNexus.Api/Properties/launchSettings.json`
     - Key: `profiles:ToolNexus.Api:applicationUrl`
   - File: `src/ToolNexus.Api/Program.cs`
     - Confirm `builder.WebHost.ConfigureKestrel(...)` bindings.
   - File: `src/ToolNexus.Api/appsettings.Development.json`
     - Keys: `Kestrel:Endpoints:Http:Url`, `Kestrel:Endpoints:Https:Url`
   - Validate whether HTTPS redirection is enabled (`app.UseHttpsRedirection()`) and whether API is effectively HTTPS-only.

2. **Verify Web API base URL config**
   - File: `src/ToolNexus.Web/appsettings.json`
     - Key: `ApiSettings:BaseUrl`
   - File: `src/ToolNexus.Web/appsettings.Development.json`
     - Key: `ApiSettings:BaseUrl`
   - Ensure value matches active API listener, e.g. `https://localhost:7163`.

3. **Verify Web configuration wiring and override behavior**
   - File: `src/ToolNexus.Web/Program.cs`
     - Confirm `builder.Services.Configure<ApiSettings>(builder.Configuration.GetSection(ApiSettings.SectionName));`
   - Confirm no hardcoded API URL in server startup and verify env override path (`ApiSettings__BaseUrl`) for staging/prod.

4. **Verify JS uses runtime-injected base URL**
   - File: `src/ToolNexus.Web/Views/Tools/Tool.cshtml`
     - Confirm server injects `window.ToolNexusConfig.apiBaseUrl`.
   - File: `src/ToolNexus.Web/wwwroot/js/tool-page.js`
     - Confirm usage of `window.ToolNexusConfig?.apiBaseUrl` and no static `http://localhost:5163`.

5. **Confirm active listeners at runtime**
   - Use startup logs from:
     - `dotnet run --project src/ToolNexus.Api/ToolNexus.Api.csproj`
     - or `dotnet watch run --project src/ToolNexus.Api/ToolNexus.Api.csproj`
   - Cross-check with:
     - `netstat -ano | findstr 5163`
     - `netstat -ano | findstr 7163`

---

## PHASE 3 — AUTOMATED FIXES VIA CODEX

### Unified Diff Patch

```diff
--- a/src/ToolNexus.Api/Program.cs
+++ b/src/ToolNexus.Api/Program.cs
@@
 var builder = WebApplication.CreateBuilder(args);
+
+builder.WebHost.ConfigureKestrel(options =>
+{
+    options.ListenLocalhost(5163);
+    options.ListenLocalhost(7163, listenOptions => listenOptions.UseHttps());
+});
@@
-builder.Services.AddCors(options =>
-{
-    options.AddPolicy("WebAppPolicy", policy =>
-    {
-        policy.WithOrigins("https://localhost:5173")
-              .AllowAnyHeader()
-              .AllowAnyMethod();
-    });
-});
+builder.Services.AddCors(options =>
+{
+    options.AddPolicy("ToolNexusWeb", policy =>
+    {
+        policy.WithOrigins("https://localhost:5173")
+              .AllowAnyHeader()
+              .AllowAnyMethod();
+    });
+});
@@
-app.UseCors("WebAppPolicy");
+app.UseCors("ToolNexusWeb");
```

```diff
--- a/src/ToolNexus.Api/Properties/launchSettings.json
+++ b/src/ToolNexus.Api/Properties/launchSettings.json
@@
-      "applicationUrl": "https://localhost:7001;http://localhost:5001"
+      "applicationUrl": "https://localhost:7163;http://localhost:5163"
```

```diff
--- a/src/ToolNexus.Api/appsettings.Development.json
+++ b/src/ToolNexus.Api/appsettings.Development.json
@@
-        "Url": "http://localhost:5001"
+        "Url": "http://localhost:5163"
@@
-        "Url": "https://localhost:7001"
+        "Url": "https://localhost:7163"
```

```diff
--- a/src/ToolNexus.Web/appsettings.Development.json
+++ b/src/ToolNexus.Web/appsettings.Development.json
@@
-    "BaseUrl": "https://localhost:7001"
+    "BaseUrl": "https://localhost:7163"
```

### C# snippets (expected state)

```csharp
// src/ToolNexus.Web/Options/ApiSettings.cs
namespace ToolNexus.Web.Options;

public sealed class ApiSettings
{
    public const string SectionName = "ApiSettings";
    public string BaseUrl { get; set; } = string.Empty;
}
```

```csharp
// src/ToolNexus.Web/Program.cs
builder.Services.Configure<ApiSettings>(
    builder.Configuration.GetSection(ApiSettings.SectionName));
```

### JS snippet (dynamic base URL, no hardcoding)

```js
const apiBase = window.ToolNexusConfig?.apiBaseUrl ?? '';

async function executeServerTool(slug, action, input) {
  const response = await fetch(`${apiBase}/api/v1/tools/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, input })
  });

  if (!response.ok) {
    throw new Error(`Tool execution failed: ${response.status}`);
  }

  return response.json();
}
```

### CORS guidance

Use CORS when browser origin differs from API origin (`scheme + host + port`).
If Web and API are same origin behind one reverse proxy, CORS may be unnecessary.

```csharp
builder.Services.AddCors(options =>
    options.AddPolicy("ToolNexusWeb", policy =>
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .WithOrigins("https://localhost:5173")));

app.UseCors("ToolNexusWeb");
```

---

## PHASE 4 — ENVIRONMENT-SAFE SOLUTION

- **Development**
  - Keep local ports stable in launch profile and dev appsettings.
  - Log active listeners at startup and validate Web `ApiSettings:BaseUrl` matches HTTPS listener.

- **Staging**
  - Set `ApiSettings__BaseUrl` and `ASPNETCORE_URLS` via deployment environment, not source edits.
  - Keep certificates and hostnames environment-specific.

- **Production**
  - Prefer reverse proxy public endpoint (Nginx/IIS/App Gateway) and internal Kestrel private binds.
  - Avoid exposing multiple ad-hoc ports publicly.

### Precedence and override safety

1. `ASPNETCORE_URLS` and command-line args can override local launch profile expectations.
2. `appsettings.{Environment}.json` can override base settings.
3. Environment variables (`ApiSettings__BaseUrl`) can override both appsettings files.

Use explicit deployment variables and document intended values per environment to prevent accidental drift.

---

## PHASE 5 — VALIDATION CHECKLIST (SCRIPT)

```bash
# 1) Start API and verify listeners
 dotnet run --project src/ToolNexus.Api/ToolNexus.Api.csproj
 # Expect log lines:
 # [before] Now listening on: https://localhost:7001
 # [after]  Now listening on: https://localhost:7163
 # [after]  Now listening on: http://localhost:5163

# 2) Probe health endpoint directly
 curl -k https://localhost:7163/health
 curl http://localhost:5163/health

# 3) Start web app and inspect browser network (no refused sockets)
 dotnet run --project src/ToolNexus.Web/ToolNexus.Web.csproj

# 4) Test tool endpoint via API base URL used by web config
 curl -k -X POST "https://localhost:7163/api/v1/tools/json-to-xml" \
   -H "Content-Type: application/json" \
   -d '{"action":"convert","input":"{\"a\":1}"}'
```

### Simulated log screenshots (comment-style)

```text
// BEFORE:
// fail: fetch POST http://localhost:5163/api/v1/tools/json-to-xml -> ERR_CONNECTION_REFUSED

// AFTER:
// info: Now listening on: http://localhost:5163
// info: Now listening on: https://localhost:7163
// info: POST https://localhost:7163/api/v1/tools/json-to-xml 200 OK
```
