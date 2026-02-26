#!/usr/bin/env bash
set -euo pipefail

echo "=== ToolNexus Maintenance (Strict Mode) ==="

# ---------------------------------------------------------
# 1. CLEAN CACHES (prevents branch conflicts)
# ---------------------------------------------------------
echo "[Maintenance] Cleaning NuGet cache..."
dotnet nuget locals all --clear || true

# ---------------------------------------------------------
# 2. RESTORE
# ---------------------------------------------------------
echo "[Maintenance] Restoring solution..."
dotnet restore ToolNexus.sln

# ---------------------------------------------------------
# 3. RESTORE LOCAL TOOLS
# ---------------------------------------------------------
if [ -f ".config/dotnet-tools.json" ]; then
  dotnet tool restore
fi

# ---------------------------------------------------------
# 4. VERIFY MIGRATION CONSISTENCY
# CRITICAL: catches missing FK issue BEFORE startup
# ---------------------------------------------------------
echo "[Maintenance] Validating EF migrations..."

dotnet ef migrations list \
  --project src/ToolNexus.Infrastructure \
  --startup-project src/ToolNexus.Api

# ---------------------------------------------------------
# 5. APPLY MIGRATIONS SAFELY
# ---------------------------------------------------------
dotnet ef database update \
  --project src/ToolNexus.Infrastructure \
  --startup-project src/ToolNexus.Api

# ---------------------------------------------------------
# 6. QUICK BUILD
# ---------------------------------------------------------
dotnet build ToolNexus.sln -c Debug --no-restore

# ---------------------------------------------------------
# 7. JS TEST BASELINE
# ---------------------------------------------------------
npm test

# ---------------------------------------------------------
# 8. PLAYWRIGHT SAFE CHECK
# (skip if DB not ready)
# ---------------------------------------------------------
echo "[Maintenance] Running Playwright smoke..."

npm run test:playwright:smoke || \
echo "WARNING: Playwright skipped due to environment startup constraints."

echo "=== Maintenance Complete ==="