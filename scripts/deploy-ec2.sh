#!/usr/bin/env bash
set -Eeuo pipefail

EC2_HOST="${EC2_HOST:-54.172.208.119}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/weichafe-ec2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
REMOTE_TAR="/home/ec2-user/weichafe-standalone.tar.gz"
REMOTE_DIR="/home/ec2-user/weichafe-standalone"
LOCAL_TAR="/tmp/weichafe-standalone.tar.gz"

retry() {
  local attempts="$1"
  shift
  local n=1
  while true; do
    if "$@"; then
      return 0
    fi
    if [[ "$n" -ge "$attempts" ]]; then
      return 1
    fi
    n=$((n + 1))
    sleep 2
  done
}

log() {
  printf "\n[%s] %s\n" "$(date +"%Y-%m-%d %H:%M:%S")" "$*"
}

if [[ ! -f "$SSH_KEY" ]]; then
  echo "No existe la llave SSH: $SSH_KEY"
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "No existe el proyecto: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

log "Build de produccion"
npm run build

log "Preparar standalone"
node scripts/prepare-standalone.cjs

log "Empaquetar"
if tar --help 2>/dev/null | grep -q -- "--disable-copyfile"; then
  COPYFILE_DISABLE=1 tar --disable-copyfile -czf "$LOCAL_TAR" -C .next/standalone .
else
  COPYFILE_DISABLE=1 tar -czf "$LOCAL_TAR" -C .next/standalone .
fi

log "Subir paquete a EC2"
retry 3 scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$LOCAL_TAR" "ec2-user@$EC2_HOST:$REMOTE_TAR"

log "Desplegar y reiniciar servicio"
retry 3 ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "ec2-user@$EC2_HOST" '
  set -Eeuo pipefail
  mkdir -p /home/ec2-user/weichafe-standalone
  tar xzf /home/ec2-user/weichafe-standalone.tar.gz -C /home/ec2-user/weichafe-standalone
  if ! command -v node >/dev/null 2>&1; then
    sudo dnf install -y nodejs
  fi
  if ! systemctl list-unit-files | grep -q "^weichafe.service"; then
    cat <<"SERVICE" | sudo tee /etc/systemd/system/weichafe.service >/dev/null
[Unit]
Description=Weichafe Next Standalone
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/weichafe-standalone
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000
Environment=DATABASE_URL=file:/home/ec2-user/weichafe-standalone/dev.db
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE
    sudo systemctl daemon-reload
    sudo systemctl enable weichafe.service
  fi
  sudo systemctl restart weichafe.service
  sleep 2
  sudo systemctl is-active weichafe.service
'

log "Healthcheck"
if ! retry 8 curl -fsS -o /dev/null "http://$EC2_HOST:3000/login"; then
  echo "Healthcheck fallo. Logs del servicio:"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "ec2-user@$EC2_HOST" 'sudo journalctl -u weichafe.service -n 80 --no-pager || true'
  exit 1
fi

log "Deploy OK"
printf "URL: http://%s:3000/login\n" "$EC2_HOST"
