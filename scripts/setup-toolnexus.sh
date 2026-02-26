#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== ToolNexus Setup (PostgreSQL + .NET 8 + Node) ==="

CONNECTION_STRING="${TOOLNEXUS_DB_CONNECTION:-${ConnectionStrings__DefaultConnection:-}}"

echo "[Setup] Installing platform prerequisites..."
apt-get update
apt-get install -y dotnet-sdk-8.0 postgresql-client nodejs npm

echo "[Setup] Restoring .NET solution dependencies..."
dotnet restore ToolNexus.sln --nologo

if [ -f ".config/dotnet-tools.json" ]; then
  echo "[Setup] Restoring local dotnet tools..."
  dotnet tool restore
else
  echo "[Setup] WARNING: .config/dotnet-tools.json not found; skipping tool restore."
fi

if [ -f "package-lock.json" ]; then
  echo "[Setup] Restoring npm dependencies with lockfile..."
  npm ci
elif [ -f "package.json" ]; then
  echo "[Setup] WARNING: package-lock.json not found; running npm install."
  npm install
fi

if [ -z "$CONNECTION_STRING" ]; then
  echo "ERROR: TOOLNEXUS_DB_CONNECTION or ConnectionStrings__DefaultConnection must be set."
  exit 1
fi

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "ERROR: pg_isready not found after postgresql-client install."
  exit 1
fi

echo "[Setup] Verifying PostgreSQL connectivity..."
if ! pg_isready -d "$CONNECTION_STRING" >/dev/null 2>&1; then
  echo "ERROR: PostgreSQL connection is not ready using provided connection string."
  exit 1
fi

echo "[Setup] Running safe migration pre-check..."
./scripts/bootstrap-validation.sh

echo "[Setup] Building solution baseline..."
dotnet build ToolNexus.sln -c Debug --no-restore --nologo

echo "=== ToolNexus setup completed successfully ==="
