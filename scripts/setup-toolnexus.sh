#!/usr/bin/env bash
set -euo pipefail

echo "=== ToolNexus Setup (PostgreSQL + .NET8 + Node) ==="

# ---------------------------------------------------------
# 1. SYSTEM PACKAGES
# ---------------------------------------------------------
apt-get update
apt-get install -y dotnet-sdk-8.0 nodejs npm postgresql-client

# ---------------------------------------------------------
# 2. DOTNET RESTORE
# ---------------------------------------------------------
if compgen -G "*.sln" >/dev/null || compgen -G "*.csproj" >/dev/null; then
  echo "[Setup] Restoring .NET solution..."
  dotnet restore ToolNexus.sln
else
  echo "[Setup] No .NET solution found."
fi

# ---------------------------------------------------------
# 3. DOTNET TOOL MANIFEST
# ---------------------------------------------------------
if [ -f ".config/dotnet-tools.json" ]; then
  echo "[Setup] Restoring dotnet tools..."
  dotnet tool restore
else
  echo "[Setup] WARNING: missing .config/dotnet-tools.json"
fi

# ---------------------------------------------------------
# 4. NODE PACKAGES
# ---------------------------------------------------------
if [ -f "package.json" ]; then
  echo "[Setup] Installing npm dependencies..."
  npm ci
fi

# ---------------------------------------------------------
# 5. DATABASE SAFETY VALIDATION (POSTGRES ONLY)
# ---------------------------------------------------------
echo "[Setup] Validating PostgreSQL connection..."

if [ -z "${TOOLNEXUS_DB_CONNECTION:-}" ]; then
  echo "ERROR: TOOLNEXUS_DB_CONNECTION not defined."
  echo "Set PostgreSQL connection before setup."
  exit 1
fi

# ---------------------------------------------------------
# 6. SAFE MIGRATION CHECK
# Prevents startup crash later
# ---------------------------------------------------------
echo "[Setup] Running EF migration check..."

dotnet ef database update \
  --project src/ToolNexus.Infrastructure \
  --startup-project src/ToolNexus.Api \
  || {
    echo "ERROR: Migration failed during setup."
    echo "Fix migration BEFORE running application."
    exit 1
  }

# ---------------------------------------------------------
# 7. BUILD VALIDATION
# ---------------------------------------------------------
echo "[Setup] Building solution..."
dotnet build ToolNexus.sln -c Debug --no-restore

echo "=== ToolNexus Setup Completed Successfully ==="