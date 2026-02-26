#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== ToolNexus Bootstrap Validation ==="

CONNECTION_STRING="${TOOLNEXUS_DB_CONNECTION:-${ConnectionStrings__DefaultConnection:-}}"
if [ -z "$CONNECTION_STRING" ]; then
  echo "ERROR: TOOLNEXUS_DB_CONNECTION or ConnectionStrings__DefaultConnection must be set."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required (install postgresql-client)."
  exit 1
fi

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "ERROR: pg_isready is required (install postgresql-client)."
  exit 1
fi

echo "[Bootstrap] Waiting for PostgreSQL readiness..."
for attempt in {1..20}; do
  if pg_isready -d "$CONNECTION_STRING" >/dev/null 2>&1; then
    break
  fi

  if [ "$attempt" -eq 20 ]; then
    echo "ERROR: PostgreSQL did not become ready after ${attempt} attempts."
    exit 1
  fi

  sleep 2
done

echo "[Bootstrap] Applying EF migrations (safe startup preflight)..."
dotnet ef database update \
  --project src/ToolNexus.Infrastructure \
  --startup-project src/ToolNexus.Api \
  -- --ConnectionStrings:DefaultConnection="$CONNECTION_STRING"

echo "[Bootstrap] Validating required schema tables..."
missing_tables="$(psql "$CONNECTION_STRING" -v ON_ERROR_STOP=1 -At -c "
WITH required(table_name) AS (
  VALUES ('audit_outbox'), ('audit_events'), ('execution_runs')
)
SELECT required.table_name
FROM required
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public'
 AND t.table_name = required.table_name
WHERE t.table_name IS NULL;
")"

if [ -n "$missing_tables" ]; then
  echo "ERROR: required tables are missing before API startup:"
  echo "$missing_tables"
  exit 1
fi

echo "=== Bootstrap validation passed ==="
