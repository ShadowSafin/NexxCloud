#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_FILE="$ROOT_DIR/.env"
BACKUP_DIR="$ROOT_DIR/backups"

[ -f "$ENV_FILE" ] || {
  printf '%s\n' "[NexxCloud] ERROR: Run setup.sh before updating." >&2
  exit 1
}

cd "$ROOT_DIR"
mkdir -p "$BACKUP_DIR"

db_user=$(sed -n 's/^DB_USER=//p' "$ENV_FILE" | tail -n 1 | tr -d '\r')
db_name=$(sed -n 's/^DB_NAME=//p' "$ENV_FILE" | tail -n 1 | tr -d '\r')
[ -n "$db_user" ] || db_user=nexxcloud
[ -n "$db_name" ] || db_name=nexxcloud
stamp=$(date -u +%Y%m%dT%H%M%SZ)

if docker compose --env-file "$ENV_FILE" ps --status running postgres 2>/dev/null | grep -q postgres; then
  printf '%s\n' "[NexxCloud] Creating pre-update PostgreSQL backup."
  docker compose --env-file "$ENV_FILE" exec -T postgres pg_dump -U "$db_user" "$db_name" > "$BACKUP_DIR/postgres-${stamp}.sql"
fi

git pull --ff-only
exec sh "$ROOT_DIR/start.sh"
