#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== ToolNexus Setup (PostgreSQL + .NET 8 + Node) ==="

CONNECTION_STRING="${TOOLNEXUS_DB_CONNECTION:-${ConnectionStrings__DefaultConnection:-}}"
SKIP_INSTALL="${TOOLNEXUS_SKIP_PACKAGE_INSTALL:-false}"

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

install_prerequisites() {
  if [ "$SKIP_INSTALL" = "true" ]; then
    echo "[Setup] TOOLNEXUS_SKIP_PACKAGE_INSTALL=true set; skipping system package installation."
    return
  fi

  if [ "$(id -u)" -ne 0 ]; then
    echo "[Setup] WARNING: not running as root; skipping apt package installation."
    echo "        Install prerequisites manually: dotnet-sdk-8.0, postgresql-client, nodejs, npm"
    return
  fi

  if ! has_cmd apt-get; then
    echo "[Setup] WARNING: apt-get unavailable; skipping package installation."
    echo "        Install prerequisites manually: dotnet-sdk-8.0, postgresql-client, nodejs, npm"
    return
  fi

  echo "[Setup] Installing platform prerequisites..."
  apt-get update
  apt-get install -y dotnet-sdk-8.0 postgresql-client nodejs npm
}

install_prerequisites

for required_command in dotnet npm psql pg_isready; do
  if ! has_cmd "$required_command"; then
    echo "ERROR: required command '$required_command' is not available on PATH."
    exit 1
  fi
done

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
