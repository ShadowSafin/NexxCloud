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

get_env() {
  key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" 2>/dev/null | tail -n 1 | tr -d '\r'
}

validate_secret() {
  key="$1"
  value=$(get_env "$key")
  case "$value" in
    ""|GENERATE_WITH_SETUP|replace-with-*|changeme|cloudpass)
      fail "$key is missing or unsafe. Run setup.sh to create secure configuration."
      ;;
  esac
  [ "${#value}" -ge 32 ] || fail "$key must contain at least 32 characters for production startup."
}

wait_for_url() {
  label="$1"
  url="$2"
  attempts=0
  while [ "$attempts" -lt 60 ]; do
    if command -v curl >/dev/null 2>&1 && curl -fsS "$url" >/dev/null 2>&1; then
      info "$label is healthy: $url"
      return 0
    fi
    if ! command -v curl >/dev/null 2>&1 && command -v wget >/dev/null 2>&1 && wget -q -O /dev/null "$url"; then
      info "$label is healthy: $url"
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 2
  done
  fail "$label did not become healthy. Inspect logs with: docker compose logs $label"
}

wait_for_service_health() {
  service="$1"
  attempts=0
  while [ "$attempts" -lt 60 ]; do
    container_id=$(docker compose --env-file "$ENV_FILE" ps -q "$service" 2>/dev/null | head -n 1)
    if [ -n "$container_id" ]; then
      status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)
      case "$status" in
        healthy)
          info "$service is healthy."
          return 0
          ;;
        unhealthy|exited|dead)
          fail "$service entered state '$status'. Inspect logs with: docker compose logs $service"
          ;;
      esac
    fi
    attempts=$((attempts + 1))
    sleep 2
  done
  fail "$service did not become healthy. Inspect logs with: docker compose logs $service"
}

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."
docker info >/dev/null 2>&1 || fail "The Docker engine is not running."
[ -f "$ENV_FILE" ] || fail "No .env configuration found. Run setup.sh first."

if [ "$(get_env NODE_ENV)" = "production" ]; then
  validate_secret DB_PASSWORD
  validate_secret JWT_SECRET
  validate_secret JWT_REFRESH_SECRET
  validate_secret MEDIA_TOKEN_SECRET
  validate_secret BULL_BOARD_PASSWORD
fi

data_dir=$(get_env NEXXCLOUD_DATA_DIR)
[ -n "$data_dir" ] || data_dir=$(get_env NEWCLOUD_DATA_DIR)
[ -n "$data_dir" ] || data_dir="./data"
case "$data_dir" in
  /*) mkdir -p "$data_dir/storage" ;;
  *) mkdir -p "$ROOT_DIR/$data_dir/storage" ;;
esac

cd "$ROOT_DIR"
docker compose --env-file "$ENV_FILE" config --quiet
info "Building and starting the NexxCloud stack."
docker compose --env-file "$ENV_FILE" up -d --build --remove-orphans

frontend_port=$(get_env FRONTEND_PORT)
backend_port=$(get_env BACKEND_PORT)
[ -n "$frontend_port" ] || frontend_port=3000
[ -n "$backend_port" ] || backend_port=4000

wait_for_url "backend" "http://127.0.0.1:${backend_port}/health/ready"
wait_for_url "frontend" "http://127.0.0.1:${frontend_port}/health"
wait_for_service_health "worker"

info "NexxCloud is ready at http://localhost:${frontend_port}"
lan_ip=$(get_env HOST_LAN_IP)
if [ -n "$lan_ip" ]; then
  info "LAN access: http://${lan_ip}:${frontend_port}"
fi
