#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== ToolNexus Maintenance (Strict Stabilization Mode) ==="

CONNECTION_STRING="${TOOLNEXUS_DB_CONNECTION:-${ConnectionStrings__DefaultConnection:-}}"
MAINTENANCE_MODE="${1:-full}"

if [ "$MAINTENANCE_MODE" != "full" ] && [ "$MAINTENANCE_MODE" != "quick" ]; then
  echo "ERROR: invalid maintenance mode '$MAINTENANCE_MODE'. Use 'full' or 'quick'."
  exit 1
fi

if [ -z "$CONNECTION_STRING" ]; then
  echo "ERROR: TOOLNEXUS_DB_CONNECTION or ConnectionStrings__DefaultConnection must be set."
  exit 1
fi

echo "[Maintenance] Mode: $MAINTENANCE_MODE"

echo "[Maintenance] Deterministic .NET package restore..."
dotnet restore ToolNexus.sln --nologo /p:RestoreUseStaticGraphEvaluation=true /p:ContinuousIntegrationBuild=true

if [ -f ".config/dotnet-tools.json" ]; then
  echo "[Maintenance] Restoring local dotnet tools..."
  dotnet tool restore
fi

if [ -f "package-lock.json" ]; then
  echo "[Maintenance] Deterministic npm restore..."
  npm ci
fi

echo "[Maintenance] Lightweight build validation..."
dotnet build ToolNexus.sln -c Debug --no-restore --nologo /p:ContinuousIntegrationBuild=true /p:Deterministic=true

echo "[Maintenance] EF migration safety validation..."
dotnet ef migrations list \
  --project src/ToolNexus.Infrastructure \
  --startup-project src/ToolNexus.Api \
  -- --ConnectionStrings:DefaultConnection="$CONNECTION_STRING"

echo "[Maintenance] EF migration drift check..."
dotnet ef migrations has-pending-model-changes \
  --project src/ToolNexus.Infrastructure \
  --startup-project src/ToolNexus.Api

echo "[Maintenance] Bootstrap gate (must pass before tests)..."
./scripts/bootstrap-validation.sh

if [ "$MAINTENANCE_MODE" = "quick" ]; then
  echo "[Maintenance] Quick mode: running core regression suite."
  dotnet test ToolNexus.sln -c Debug --no-build --verbosity minimal
  npm test
  echo "=== ToolNexus maintenance (quick) completed successfully ==="
  exit 0
fi

echo "[Maintenance] Full mode: running ordered test pipeline..."
dotnet test ToolNexus.sln -c Debug --no-build --verbosity minimal
npm test
npm run test:playwright:smoke

echo "=== ToolNexus maintenance completed successfully ==="
