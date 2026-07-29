#!/usr/bin/env bash
#
# Deploy / redeploy hk-transit-eta on this host (run ON the EC2 instance).
#
#   ./deploy/deploy.sh
#
# It pulls the latest code, rebuilds the images, restarts the stack, waits for
# the backend to answer, and prunes dangling images. Idempotent — safe to rerun.
#
# TLS/HTTPS is handled by your existing reverse proxy / load balancer, which
# should forward to this host on FRONTEND_PORT (see .env). This stack serves
# plain HTTP only.
#
# Prerequisites (see deploy/setup-ec2.sh for a fresh box):
#   - Docker + Docker Compose plugin installed
#   - A .env file in the repo root (cp .env.example .env, then edit)

set -euo pipefail

# Repo root = parent of this script's directory.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE="docker compose -f docker-compose.yaml"

echo "==> Deploying from $REPO_ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Run: cp .env.example .env  then edit it." >&2
  exit 1
fi

FRONTEND_PORT="$(grep -E '^FRONTEND_PORT=' .env | head -1 | cut -d= -f2- || true)"
: "${FRONTEND_PORT:=80}"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Building images"
$COMPOSE build

echo "==> Starting stack"
$COMPOSE up -d

echo "==> Waiting for backend to become healthy"
ok=false
for i in $(seq 1 30); do
  # Hit the backend through the frontend proxy on the internal network.
  if $COMPOSE exec -T frontend wget -q -O /dev/null http://backend:8080/api/num-routes?type=bus 2>/dev/null; then
    ok=true
    break
  fi
  sleep 2
done

if [[ "$ok" == true ]]; then
  echo "==> Backend is up."
else
  echo "WARNING: backend did not answer in time. Recent logs:" >&2
  $COMPOSE logs --tail=40 backend >&2 || true
  exit 1
fi

echo "==> Pruning dangling images"
docker image prune -f >/dev/null || true

echo "==> Done. Frontend is serving on http://localhost:${FRONTEND_PORT}"
echo "    Your TLS proxy / load balancer should forward HTTPS to that port."
