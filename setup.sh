#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_FILE="$ROOT_DIR/.env"

info() {
  printf '%s\n' "[NexxCloud] $*"
}

fail() {
  printf '%s\n' "[NexxCloud] ERROR: $*" >&2
  exit 1
}

require_docker() {
  command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Install Docker with Compose and run setup again."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."
  docker info >/dev/null 2>&1 || fail "Docker is installed but the Docker engine is not running."
}

random_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi
  if [ -r /dev/urandom ] && command -v od >/dev/null 2>&1; then
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
    return
  fi
  fail "A cryptographically secure secret generator (openssl or /dev/urandom) is required."
}

get_env() {
  key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" 2>/dev/null | tail -n 1 | tr -d '\r'
}

set_env() {
  key="$1"
  value="$2"
  temp_file="${ENV_FILE}.tmp"
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ ("^" key "=") { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "$ENV_FILE" > "$temp_file"
  mv "$temp_file" "$ENV_FILE"
}

generate_if_placeholder() {
  key="$1"
  current=$(get_env "$key")
  case "$current" in
    ""|GENERATE_WITH_SETUP|replace-with-at-least-32-random-characters)
      set_env "$key" "$(random_hex)"
      info "Generated $key."
      ;;
  esac
}

detect_lan_ip() {
  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | awk '{ print $1 }'
  fi
}

check_port_if_available() {
  port="$1"
  if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -Eq "[:.]${port}[[:space:]]"; then
    fail "Port $port is already in use. Change FRONTEND_PORT/BACKEND_PORT in .env or stop the existing service."
  fi
}

require_docker
cd "$ROOT_DIR"
compose_project_name="${NEXXCLOUD_PROJECT_NAME:-nexxcloud}"
case "$compose_project_name" in
  *[!a-z0-9_-]*|""|[-_]*)
    fail "NEXXCLOUD_PROJECT_NAME may contain only lowercase letters, digits, underscores, and hyphens, and must begin with a letter or digit."
    ;;
esac
initial_frontend_port="${NEXXCLOUD_FRONTEND_PORT:-3000}"
initial_backend_port="${NEXXCLOUD_BACKEND_PORT:-4000}"
initial_data_dir="${NEXXCLOUD_DATA_DIR:-./data}"
case "$initial_frontend_port:$initial_backend_port" in
  *[!0-9:]*)
    fail "NEXXCLOUD_FRONTEND_PORT and NEXXCLOUD_BACKEND_PORT must be numeric ports."
    ;;
esac
[ "$initial_frontend_port" -ge 1 ] && [ "$initial_frontend_port" -le 65535 ] || fail "NEXXCLOUD_FRONTEND_PORT must be from 1 through 65535."
[ "$initial_backend_port" -ge 1 ] && [ "$initial_backend_port" -le 65535 ] || fail "NEXXCLOUD_BACKEND_PORT must be from 1 through 65535."

if [ ! -f "$ENV_FILE" ]; then
  lan_ip=$(detect_lan_ip || true)
  host_name=$(hostname 2>/dev/null || printf 'nexxcloud')
  umask 077
  cat > "$ENV_FILE" <<EOF
# Generated securely by setup.sh. Back this file up separately from user data.
NODE_ENV=production
COMPOSE_PROJECT_NAME=$compose_project_name
FRONTEND_PORT=$initial_frontend_port
BACKEND_PORT=$initial_backend_port
FRONTEND_BIND_ADDRESS=0.0.0.0
BACKEND_BIND_ADDRESS=0.0.0.0
NEXXCLOUD_DATA_DIR=$initial_data_dir

DB_USER=nexxcloud
DB_PASSWORD=$(random_hex)
DB_NAME=nexxcloud

JWT_SECRET=$(random_hex)
JWT_REFRESH_SECRET=$(random_hex)
MEDIA_TOKEN_SECRET=$(random_hex)
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=$(random_hex)

FRONTEND_URL=http://localhost:$initial_frontend_port
CORS_ORIGINS=
TRUST_PROXY=loopback, linklocal, uniquelocal
HOST_LAN_IP=$lan_ip
HOST_HOSTNAME=$host_name

MAX_FILE_SIZE=10995116277760
UPLOAD_CHUNK_SIZE=67108864
MAX_UPLOAD_CHUNK_SIZE=268435456
TRASH_RETENTION_DAYS=30
MAX_VERSIONS_PER_FILE=10
DEFAULT_STORAGE_QUOTA=10995116277760
CHUNK_UPLOAD_CONCURRENCY=3
MAX_FILES_PER_USER=100000
MAX_UPLOADS_PER_MINUTE=300
EOF
  chmod 600 "$ENV_FILE" 2>/dev/null || true
  info "Created .env with cryptographically random deployment secrets."
else
  info "Using existing .env; generating only missing template secrets."
  generate_if_placeholder DB_PASSWORD
  generate_if_placeholder JWT_SECRET
  generate_if_placeholder JWT_REFRESH_SECRET
  generate_if_placeholder MEDIA_TOKEN_SECRET
  generate_if_placeholder BULL_BOARD_PASSWORD
fi

configured_data_dir=$(get_env NEXXCLOUD_DATA_DIR)
[ -n "$configured_data_dir" ] || configured_data_dir="./data"
case "$configured_data_dir" in
  /*) mkdir -p "$configured_data_dir/storage"; chmod 700 "$configured_data_dir" 2>/dev/null || true ;;
  *) mkdir -p "$ROOT_DIR/$configured_data_dir/storage"; chmod 700 "$ROOT_DIR/$configured_data_dir" 2>/dev/null || true ;;
esac

if [ -z "$(docker compose --env-file "$ENV_FILE" ps -q 2>/dev/null)" ]; then
  frontend_port=$(get_env FRONTEND_PORT)
  backend_port=$(get_env BACKEND_PORT)
  [ -n "$frontend_port" ] || frontend_port=3000
  [ -n "$backend_port" ] || backend_port=4000
  check_port_if_available "$frontend_port"
  check_port_if_available "$backend_port"
fi

exec sh "$ROOT_DIR/start.sh" "$@"
