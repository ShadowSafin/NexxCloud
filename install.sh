#!/usr/bin/env sh
set -eu

REPOSITORY_URL="${NEXXCLOUD_REPOSITORY_URL:-https://github.com/ShadowSafin/NewCloud.git}"
INSTALL_DIR="${NEXXCLOUD_INSTALL_DIR:-${HOME:?HOME is required unless NEXXCLOUD_INSTALL_DIR is set}/NexxCloud}"
REPOSITORY_REF="${NEXXCLOUD_REPOSITORY_REF:-main}"

if [ -f "./setup.sh" ] && [ -f "./docker-compose.yml" ]; then
  exec sh ./setup.sh "$@"
fi

command -v git >/dev/null 2>&1 || {
  printf '%s\n' "[NexxCloud] ERROR: Git is required to install from the repository." >&2
  exit 1
}

if [ -d "$INSTALL_DIR/.git" ] && [ -f "$INSTALL_DIR/setup.sh" ] && [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
  printf '%s\n' "[NexxCloud] Existing installation found in $INSTALL_DIR; launching it without changing its checked-out source."
  cd "$INSTALL_DIR"
  exec sh ./setup.sh "$@"
fi

if [ -e "$INSTALL_DIR" ]; then
  printf '%s\n' "[NexxCloud] ERROR: $INSTALL_DIR exists but is not a NexxCloud checkout. Choose NEXXCLOUD_INSTALL_DIR." >&2
  exit 1
fi

printf '%s\n' "[NexxCloud] Cloning $REPOSITORY_URL ($REPOSITORY_REF) into $INSTALL_DIR"
git clone --branch "$REPOSITORY_REF" --single-branch "$REPOSITORY_URL" "$INSTALL_DIR"
cd "$INSTALL_DIR"
exec sh ./setup.sh "$@"
