#!/usr/bin/env bash
set -Eeuo pipefail

EC2_HOST="${EC2_HOST:-}"
EC2_INSTANCE_ID="${EC2_INSTANCE_ID:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
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
resolve_ec2_host() {
  if [[ -n "$EC2_HOST" ]]; then
    echo "$EC2_HOST"
    return 0
  fi
  if [[ -n "$EC2_INSTANCE_ID" ]]; then
    if ! command -v aws >/dev/null 2>&1; then
      echo "aws CLI no disponible para resolver EC2_INSTANCE_ID" >&2
      return 1
    fi
    local ip
    ip=$(aws ec2 describe-instances --region "$AWS_REGION" --instance-ids "$EC2_INSTANCE_ID" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
    if [[ -z "$ip" || "$ip" == "None" ]]; then
      echo "No se pudo resolver la IP pública para INSTANCE_ID=$EC2_INSTANCE_ID" >&2
      return 1
    fi
    echo "$ip"
    return 0
  fi
  echo "No se ha definido EC2_HOST ni EC2_INSTANCE_ID" >&2
  return 1
}
if [[ ! -d "$APP_DIR" ]]; then
  echo "No existe el proyecto: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

log "Resolviendo host de EC2"
EC2_HOST="$(resolve_ec2_host)"
log "EC2_HOST=$EC2_HOST"

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

# Excluir dev.db del paquete para no sobrescribir la BD en producción
tar -tzf "$LOCAL_TAR" | grep -q "dev.db" && tar -tzf "$LOCAL_TAR" | grep "dev.db" | while read -r file; do
  tar --delete -f "$LOCAL_TAR" "$file"
done || true

log "Subir paquete a EC2"
retry 3 scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$LOCAL_TAR" "ec2-user@$EC2_HOST:$REMOTE_TAR"

log "Desplegar y reiniciar servicio"
retry 3 ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "ec2-user@$EC2_HOST" '
  set -Eeuo pipefail
  mkdir -p /home/ec2-user/weichafe-standalone
  
  # Preservar solo uploads antes de descomprimir
  if [ -d /var/weichafe/uploads ]; then
    cp -r /var/weichafe/uploads /tmp/uploads.backup
  fi
  
  # Descomprimir nuevo deploy
  tar xzf /home/ec2-user/weichafe-standalone.tar.gz -C /home/ec2-user/weichafe-standalone
  
  # NOTA: No preservamos BD entre deploys - siempre se recrea desde CSV
  
  # Restaurar uploads
  if [ -d /tmp/uploads.backup ]; then
    sudo mkdir -p /var/weichafe
    sudo rm -rf /var/weichafe/uploads
    sudo mv /tmp/uploads.backup /var/weichafe/uploads
    sudo chown -R ec2-user:ec2-user /var/weichafe
  fi
  
  if ! command -v node >/dev/null 2>&1; then
    sudo dnf install -y nodejs
  fi
  
  # Generar cliente Prisma nativo para Linux (los binarios del bundle son de Windows)
  cd /home/ec2-user/weichafe-standalone
  npx prisma generate --schema=./prisma/schema.prisma || true
  
  # Aplicar migraciones de Prisma
  npx prisma migrate deploy --schema=./prisma/schema.prisma || true
  
  # Recrear BD desde CSV (importacion directa SQLite) y crear admin
  rm -f prisma/dev.db
  npx prisma migrate deploy --schema=./prisma/schema.prisma
  chmod 666 prisma/dev.db
  DATABASE_URL=file:/home/ec2-user/weichafe-standalone/prisma/dev.db npx tsx scripts/import-csv-direct.ts 2>/dev/null || true
  DATABASE_URL=file:/home/ec2-user/weichafe-standalone/prisma/dev.db npx tsx scripts/create-admin-standalone.ts 2>/dev/null || true
  
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
Environment=DATABASE_URL=file:/home/ec2-user/weichafe-standalone/prisma/dev.db
Environment=UPLOAD_DIR=/var/weichafe/uploads
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
if ! retry 8 curl -fsS -o /dev/null "http://$EC2_HOST/login"; then
  echo "Healthcheck fallo. Logs del servicio:"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "ec2-user@$EC2_HOST" 'sudo journalctl -u weichafe.service -n 80 --no-pager || true'
  exit 1
fi

log "Deploy OK"
printf "URL: http://%s/login\n" "$EC2_HOST"
