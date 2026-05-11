#!/usr/bin/env bash
# =============================================================================
#  vps-setup.sh — one-time bootstrap for a fresh Ubuntu 22.04 / 24.04 VPS.
#
#  What it does:
#    1. Updates apt + installs basics (git, ufw, curl)
#    2. Installs Docker Engine + the compose plugin from the official repo
#    3. Opens firewall ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
#    4. Clones the repo into /opt/pos-system
#    5. Creates an empty .env stub (you fill in the secrets after)
#
#  Run as root the first time you log into the VPS:
#    curl -fsSL https://raw.githubusercontent.com/fareed-s/pos/main/scripts/vps-setup.sh | bash
#  OR after cloning:
#    bash scripts/vps-setup.sh
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/fareed-s/pos.git}"
APP_DIR="${APP_DIR:-/opt/pos-system}"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (or with sudo). Try: sudo bash $0"
  exit 1
fi

echo "==> Updating apt + installing basics"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg git ufw

echo "==> Installing Docker (official repo)"
install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

echo "==> Configuring firewall (ufw)"
ufw allow OpenSSH    >/dev/null 2>&1 || true
ufw allow 80/tcp     >/dev/null 2>&1 || true
ufw allow 443/tcp    >/dev/null 2>&1 || true
# Activate ufw only if it's inactive (avoids dropping the current SSH session).
if ! ufw status | grep -q "Status: active"; then
  ufw --force enable
fi

echo "==> Cloning repo into $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  echo "    (already cloned — pulling latest main)"
  git -C "$APP_DIR" fetch origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> Creating .env stub"
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "    .env created from .env.example"
  echo "    ⚠️  EDIT $APP_DIR/.env BEFORE STARTING THE STACK"
else
  echo "    .env already present — leaving it alone"
fi

echo "==> Pre-pulling base images (mongo, node, nginx)"
docker pull mongo:7 || true

echo
echo "==> Setup complete."
echo "    Next steps:"
echo "      1. Edit secrets:    nano $APP_DIR/.env"
echo "      2. Start the stack: cd $APP_DIR && docker compose up -d --build"
echo "      3. Tail logs:       docker compose logs -f"
echo "      4. The app will be on http://<server-ip>"
