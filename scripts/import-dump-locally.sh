#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../"

DUMP_FILE="$1"

if [ ! -f "$DUMP_FILE" ]; then
    echo "Error: file not found: $DUMP_FILE"
    exit 1
fi

if ! podman compose ps 2>/dev/null | grep -q 'postgres.*Up'; then
    echo "Error: postgres service is not running (run 'mise up' first)"
    exit 1
fi

echo "Cleaning database..."
podman compose exec -T postgres sh -c '
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
' < sqls/clean.sql

echo "Importing $(basename "$DUMP_FILE") into local PostgreSQL..."
podman compose exec -T postgres sh -c '
  pg_restore -Fc --no-owner --clean --if-exists \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB"
' < "$DUMP_FILE"

echo "Import complete."
