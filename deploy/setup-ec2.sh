#!/usr/bin/env bash
#
# One-time bootstrap for a fresh EC2 instance (Amazon Linux 2023 or Ubuntu).
# Installs Docker + the Compose plugin, enables the service, and clones the repo.
#
#   curl -fsSL https://raw.githubusercontent.com/codekaburra/hk-transit-eta/main/deploy/setup-ec2.sh | bash
#   # or copy this file over and run:  bash setup-ec2.sh
#
# After it finishes:
#   cd ~/hk-transit-eta
#   cp .env.example .env      # then edit: POSTGRES_PASSWORD, CORS_ORIGINS, ADMIN_TOKEN, FRONTEND_PORT
#   ./deploy/deploy.sh
#
# TLS is handled by your existing reverse proxy / load balancer (not this stack).
# Make sure the security group allows SSH (22) and whatever port your proxy
# forwards to the app on (FRONTEND_PORT, default 80).

set -euo pipefail

REPO_URL="https://github.com/codekaburra/hk-transit-eta.git"
CLONE_DIR="${HOME}/hk-transit-eta"

echo "==> Detecting package manager"
if command -v dnf >/dev/null 2>&1; then
  # Amazon Linux 2023 / Fedora
  sudo dnf -y install docker git
elif command -v yum >/dev/null 2>&1; then
  # Amazon Linux 2
  sudo yum -y install docker git
elif command -v apt-get >/dev/null 2>&1; then
  # Ubuntu / Debian
  sudo apt-get update
  sudo apt-get -y install docker.io docker-compose-plugin git
else
  echo "ERROR: no supported package manager (dnf/yum/apt-get) found." >&2
  exit 1
fi

echo "==> Enabling and starting Docker"
sudo systemctl enable --now docker

# The Compose plugin ships with Docker on apt; on Amazon Linux install it manually.
if ! docker compose version >/dev/null 2>&1; then
  echo "==> Installing Docker Compose plugin"
  DOCKER_CONFIG="${DOCKER_CONFIG:-$HOME/.docker}"
  mkdir -p "$DOCKER_CONFIG/cli-plugins"
  ARCH="$(uname -m)"
  curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
    -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
  chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"
fi

echo "==> Adding $USER to the docker group (log out/in for it to take effect)"
sudo usermod -aG docker "$USER" || true

echo "==> Cloning repo into $CLONE_DIR"
if [[ -d "$CLONE_DIR/.git" ]]; then
  git -C "$CLONE_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$CLONE_DIR"
fi

cat <<EOF

==> Bootstrap complete.

Next:
  cd $CLONE_DIR
  cp .env.example .env
  \$EDITOR .env          # set POSTGRES_PASSWORD, CORS_ORIGINS, ADMIN_TOKEN, FRONTEND_PORT
  ./deploy/deploy.sh

If you just got added to the docker group, log out and back in first
(or run: newgrp docker).
EOF
