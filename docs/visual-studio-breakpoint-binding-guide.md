# Visual Studio Breakpoint Binding Mismatch Guide (.NET 8)

## 1) Root cause analysis

### 1. Stale DLL loaded from a different output folder
- **Why binding fails:** The debugger compares the loaded module + PDB checksums and source checksums. If Visual Studio loaded `ToolNexus.Web.dll` from a previous build path (for example another `bin` directory), its embedded document checksums do not match your current `ToolsController.cs`.
- **How to verify:** In **Debug > Windows > Modules**, inspect `Path` for `ToolNexus.Web.dll`. Compare it to your intended startup project output folder.
- **Permanent fix:** Enforce a single startup path, clean old outputs, and avoid launching binaries manually from alternate folders.

### 2. Debug/Release mismatch
- **Why binding fails:** Release builds can optimize/trim/debug info differently. If source was edited after Release build, or if Release DLL/PDB is loaded while current code is Debug, symbol/source mapping diverges.
- **How to verify:** Check solution configuration (toolbar), module `Optimized` flag, and module path in Modules window.
- **Permanent fix:** Standardize debugging on `Debug` configuration and ensure startup profile always launches Debug output.

### 3. Multiple projects producing the same assembly name
- **Why binding fails:** If two projects emit `ToolNexus.Web.dll`, debugger may attach to the wrong one. File name matches, but source checksum/PDB identity differs.
- **How to verify:** Search repository for duplicate `<AssemblyName>` values or duplicate output artifact names.
- **Permanent fix:** Make assembly names unique per project, or enforce isolated output directories.

### 4. Hot Reload changed runtime without rebuild
- **Why binding fails:** Runtime IL patches can diverge from disk source/PDB state, especially after multiple edit-and-continue cycles or partial rebuilds.
- **How to verify:** Reproduce issue after long Hot Reload session; restart debug session and compare behavior.
- **Permanent fix:** For unstable sessions, disable Hot Reload and require full rebuilds before debugging critical breakpoints.

### 5. PDB mismatch
- **Why binding fails:** Debugger requires matching DLL and PDB (same build identity). Old PDB + new DLL (or vice versa) blocks precise source mapping.
- **How to verify:** In Modules, check `Symbol Status`; ensure PDB path/version aligns with loaded DLL.
- **Permanent fix:** Always rebuild from clean state; keep `<DebugType>portable</DebugType>` and `<DebugSymbols>true</DebugSymbols>` for Debug.

### 6. Shadow-copied binaries
- **Why binding fails:** Host/runtime can copy assemblies to temp locations (or alternative app host dirs). Debugger binds to copied binary, not active source build output.
- **How to verify:** Modules window path points to temp/shadow directory rather than project `bin/Debug/net8.0`.
- **Permanent fix:** Disable/avoid shadow-copy style hosting modes where possible and debug directly from project output.

### 7. Old `bin/obj` artifacts
- **Why binding fails:** Incremental build may reuse stale intermediates; resulting DLL/PDB may embed old checksum metadata.
- **How to verify:** Timestamps in `bin/obj`, inconsistent behavior after source edits, and disappearance after full clean.
- **Permanent fix:** Periodic hard clean of `bin`, `obj`, `.vs`; CI should run clean build and detect stale artifact issues.

### 8. Docker container running old build
- **Why binding fails:** Container may run cached image/layer with earlier DLL/PDB while local source has changed.
- **How to verify:** Inspect container image build timestamp/hash and running assembly inside container.
- **Permanent fix:** Rebuild image with no cache for debug scenarios and mount/launch correct build output.

### 9. IIS Express using different output path
- **Why binding fails:** IIS Express profile can point to alternate physical path or prebuilt app folder, loading unexpected module.
- **How to verify:** Check launch profile + Modules path during debug.
- **Permanent fix:** Align launch settings with startup project output and remove stale IIS Express config entries.

### 10. Debugging self-contained publish output instead of project output
- **Why binding fails:** `dotnet publish` output can differ from active source build (trimmed, ready-to-run, optimized artifacts), causing checksum/symbol mismatch.
- **How to verify:** Modules window shows publish folder path (`publish/`) instead of `bin/Debug/net8.0`.
- **Permanent fix:** Use `dotnet run` / Visual Studio project debugging for development; reserve publish output for deployment validation only.

## 2) Force clean rebuild strategy (safe baseline)

> Run from repository root after closing Visual Studio/debug sessions.

```bash
# 1) Stop running .NET / IIS Express processes (Windows)
taskkill /F /IM dotnet.exe /T
taskkill /F /IM iisexpress.exe /T

# 2) Clean solution
dotnet clean ToolNexus.sln -c Debug

# 3) Delete stale local artifacts
# PowerShell
Get-ChildItem -Path . -Include bin,obj -Recurse -Directory | Remove-Item -Recurse -Force
Remove-Item -Recurse -Force .vs -ErrorAction SilentlyContinue

# 4) Optional: clear NuGet caches (only if package corruption suspected)
dotnet nuget locals all --clear

# 5) Rebuild startup project only
# Example (adjust to actual startup .csproj)
dotnet build src/ToolNexus.Web/ToolNexus.Web.csproj -c Debug

# 6) Detect duplicate ToolNexus.Web.dll artifacts
# PowerShell
Get-ChildItem -Path . -Filter ToolNexus.Web.dll -Recurse | Select-Object FullName, LastWriteTime
```

## 3) Visual Studio module/symbol verification

1. Start debugging using the intended **Web startup project**.
2. Open **Debug > Windows > Modules**.
3. Find `ToolNexus.Web.dll` and validate:
   - `Path` = expected project Debug output.
   - `Symbol Status` = symbols loaded.
   - `Optimized` = `No`.
   - `User Code` = `Yes`.
4. If symbols are not loaded:
   - Right-click module -> **Load Symbols**.
   - Point to matching `.pdb` in the same output folder.
5. Re-open breakpoint file; verify breakpoint no longer shows mismatch warning.

## 4) `.csproj` hardening

Use explicit debug symbol settings:

```xml
<PropertyGroup Condition="'$(Configuration)' == 'Debug'">
  <DebugType>portable</DebugType>
  <DebugSymbols>true</DebugSymbols>
</PropertyGroup>
```

Enable deterministic build identity (helps reproducibility and symbol consistency):

```xml
<PropertyGroup>
  <Deterministic>true</Deterministic>
</PropertyGroup>
```

## 5) Build configuration consistency checklist

- Solution configuration is **Debug**.
- Correct single startup project (the Web app).
- Platform target consistent across startup + referenced projects (`AnyCPU`/`x64`).
- No lingering process running a previous Release build.

### Why Debug/Release mismatch is destructive
Release compilation may produce different IL layout/optimization and different symbol granularity. Even when type names match, sequence points can shift so breakpoint mapping fails strict source-checksum validation.

## 6) Temporary workaround (not permanent)

Visual Studio option:
- **Debug > Options > General > uncheck "Require source files to exactly match the original version"**

This only relaxes safety checks. It can allow stepping through non-identical source, which risks misleading diagnostics and incorrect root-cause conclusions. Use only briefly to unblock investigation, then restore strict matching.

## Final operational checklist

1. Kill all running hosts (`dotnet`, `iisexpress`).
2. Hard clean (`bin`, `obj`, `.vs`) and `dotnet clean`.
3. Rebuild startup project in Debug only.
4. Verify loaded module path + PDB in Modules window.
5. Remove duplicate assembly outputs / duplicate assembly names.
6. Rebuild containers/publish artifacts when relevant.
7. Keep strict source matching enabled after issue is fixed.
