#!/usr/bin/env bash
# =============================================================================
#  deploy.sh — pull latest main + rebuild + restart, with health check.
#
#  Use cases:
#    • Manual redeploy when you SSH in: `cd /opt/pos-system && ./scripts/deploy.sh`
#    • Triggered remotely by the GitHub Actions workflow (.github/workflows/deploy.yml)
#
#  The script is idempotent — safe to re-run on a healthy system.
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/pos-system}"
COMPOSE="docker compose"

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "❌ $APP_DIR/.env not found. Copy .env.example and fill it in first."
  exit 1
fi

echo "==> [1/4] Pulling latest main"
git fetch origin main
git reset --hard origin/main

echo "==> [2/4] Pulling / building images"
# Two modes:
#   - CI deploy: BACKEND_IMAGE / FRONTEND_IMAGE in .env point at a remote
#     registry (e.g. ghcr.io/owner/pos-backend:sha). Just pull — no local
#     rebuild, since the image is already authoritative.
#   - Local deploy: env vars default to `pos-{backend,frontend}:local`.
#     Need to actually build from the freshly-pulled source.
#
# Heuristic: if BOTH override vars contain a slash, this is a registry
# deploy. Anything else falls through to a full local build.
BE_IMG=$(grep -E '^BACKEND_IMAGE=' .env 2>/dev/null | cut -d= -f2- || echo "")
FE_IMG=$(grep -E '^FRONTEND_IMAGE=' .env 2>/dev/null | cut -d= -f2- || echo "")
if [[ "$BE_IMG" == *"/"* && "$FE_IMG" == *"/"* ]]; then
  echo "    (registry deploy — pulling $BE_IMG and $FE_IMG)"
  $COMPOSE pull
else
  echo "    (local deploy — building from source)"
  $COMPOSE pull --ignore-pull-failures || true
  DOCKER_BUILDKIT=1 $COMPOSE build --pull
fi

echo "==> [3/4] Starting stack (zero-downtime where possible)"
# `up -d` recreates only services whose config/image actually changed.
$COMPOSE up -d --remove-orphans

echo "==> [4/4] Waiting for backend health"
# Wait up to 60s for the backend's HEALTHCHECK to report healthy.
for i in $(seq 1 30); do
  status=$($COMPOSE ps --format json backend 2>/dev/null | grep -oE '"Health":"[a-z]+"' | head -1 | cut -d'"' -f4 || echo "")
  if [ "$status" = "healthy" ]; then
    echo "    ✅ backend healthy"
    break
  fi
  if [ "$i" = "30" ]; then
    echo "    ⚠️  backend did not become healthy in 60s — recent logs:"
    $COMPOSE logs --tail=40 backend
    exit 1
  fi
  sleep 2
done

# Quick smoke test against the public URL.
echo "==> Smoke test: GET /api/health"
if curl -fsS http://localhost/api/health | grep -q '"success":true'; then
  echo "    ✅ /api/health OK"
else
  echo "    ⚠️  /api/health did not return success — check logs"
  $COMPOSE logs --tail=40 backend
  exit 1
fi

# Prune dangling images so disk doesn't bloat over many deploys.
docker image prune -f >/dev/null

echo
echo "==> ✅ Deploy completed at $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
$COMPOSE ps
