#!/usr/bin/env bash
# Deploy en el servidor EC2.
#
# Lo invoca .github/workflows/deploy.yml después de descomprimir el paquete nuevo
# en ~/weichafe-standalone.new. El workflow lo copia a ~/deploy-remote.sh y lo
# ejecuta desde ahí, porque este script mueve la carpeta que lo contiene. La
# versión en producción no se toca hasta que el respaldo de la base está verificado.
#
# Qué garantiza:
#   - El servicio se detiene ANTES de respaldar y reemplazar archivos: no se
#     pierden registros hechos durante el deploy.
#   - La base nunca queda solo en /tmp (que en este servidor es memoria RAM).
#   - Si falla el respaldo, la migración o la verificación final, se restaura la
#     versión anterior con su base intacta y se vuelve a levantar el servicio.
set -Eeuo pipefail

# Rutas del servidor. Solo se cambian para ensayar el script fuera de producción.
BASE=${WEICHAFE_HOME:-/home/ec2-user}
VAR=${WEICHAFE_VAR:-/var/weichafe}
APP=$BASE/weichafe-standalone
NEW=$BASE/weichafe-standalone.new
PREV=$BASE/weichafe-standalone.prev
FAILED=$BASE/weichafe-standalone.failed
DB_URL="file:$APP/prisma/dev.db"
SERVICE=weichafe.service
HEALTH_URL=http://127.0.0.1:3000/login
# 0 = la version anterior sigue en su lugar; 1 = se movio a $PREV; 2 = la nueva esta en $APP
STAGE=0

log() { echo "--- $* ---"; }

health_ok() {
  for _ in $(seq 1 20); do
    if curl -sf -o /dev/null "$HEALTH_URL"; then return 0; fi
    sleep 2
  done
  return 1
}

# Prisma CLI para las migraciones. Se usa la que ya esta instalada en el servidor;
# si no existe se instala una version fija. Nunca "npx prisma" a secas: eso baja
# la ultima version publicada, que puede ser incompatible con este proyecto.
PRISMA_VERSION=6.19.3
prisma_cli() {
  local cached
  cached=$(ls "$HOME"/.npm/_npx/*/node_modules/.bin/prisma 2>/dev/null | head -n 1 || true)
  if [ -n "$cached" ]; then
    "$cached" "$@"
  else
    npx --yes "prisma@$PRISMA_VERSION" "$@"
  fi
}

on_error() {
  local code=$?
  trap - ERR
  set +e
  log "FALLO (codigo $code): restaurando la version anterior"
  sudo systemctl stop "$SERVICE" 2>/dev/null
  if [ "$STAGE" -ge 1 ] && [ -d "$PREV" ]; then
    if [ -d "$APP" ]; then
      rm -rf "$FAILED"
      mv "$APP" "$FAILED"
      echo "El paquete fallido quedo en $FAILED para revisarlo."
    fi
    mv "$PREV" "$APP"
    echo "Version anterior restaurada con su base intacta."
  fi
  sudo systemctl start "$SERVICE"
  if health_ok; then
    echo "La version anterior esta respondiendo."
  else
    echo "ATENCION: la version anterior tampoco responde. Revisar: sudo journalctl -u $SERVICE -n 50"
  fi
  exit "$code"
}
trap on_error ERR

[ -f "$NEW/server.js" ] || { echo "Paquete incompleto: falta server.js"; exit 1; }

sudo mkdir -p "$VAR/uploads" "$VAR/backups"
sudo chown -R ec2-user:ec2-user "$VAR"

# Secretos persistentes generados en el servidor (nunca en el repositorio).
if [ ! -f "$VAR/auth.env" ]; then
  printf "AUTH_SECRET=%s\n" "$(head -c 48 /dev/urandom | base64 | tr -d "\n=")" | sudo tee "$VAR/auth.env" >/dev/null
  sudo chmod 600 "$VAR/auth.env"
fi
# Codigo maestro para /recovery (recuperar acceso sin soporte externo)
if [ ! -f "$VAR/recovery.env" ]; then
  printf "RECOVERY_CODE=%s\n" "$(head -c 200 /dev/urandom | tr -dc "A-Za-z0-9" | head -c 24)" | sudo tee "$VAR/recovery.env" >/dev/null
  sudo chmod 600 "$VAR/recovery.env"
fi

log "Deteniendo el servicio"
sudo systemctl stop "$SERVICE" 2>/dev/null || true

# El paquete nunca debe traer una base propia.
rm -f "$NEW"/prisma/dev.db*

if [ -f "$APP/prisma/dev.db" ]; then
  log "Respaldando la base (con verificacion de integridad)"
  WEICHAFE_DB="$APP/prisma/dev.db" WEICHAFE_BACKUP_DIR="$VAR/backups" python3 "$NEW/scripts/backup-db.py"

  log "Copiando la base al paquete nuevo"
  mkdir -p "$NEW/prisma"
  cp -p "$APP"/prisma/dev.db* "$NEW/prisma/"
  cmp -s "$APP/prisma/dev.db" "$NEW/prisma/dev.db"
fi

log "Activando la version nueva"
rm -rf "$PREV"
if [ -d "$APP" ]; then
  mv "$APP" "$PREV"
  STAGE=1
fi
mv "$NEW" "$APP"
STAGE=2

cd "$APP"

log "Aplicando migraciones"
# Si migrate deploy falla por una migracion que quedo marcada como fallida, se
# marca como rolled-back y se reintenta (ver scripts/list-failed-migrations.cjs).
if ! DATABASE_URL="$DB_URL" prisma_cli migrate deploy --schema=./prisma/schema.prisma; then
  echo "migrate deploy fallo: reparando migraciones fallidas"
  if [ -f scripts/list-failed-migrations.cjs ]; then
    for MIG in $(DATABASE_URL="$DB_URL" node scripts/list-failed-migrations.cjs); do
      echo "Marcando como rolled-back: $MIG"
      DATABASE_URL="$DB_URL" prisma_cli migrate resolve --rolled-back "$MIG" --schema=./prisma/schema.prisma || true
    done
  fi
  echo "Reintentando migrate deploy"
  DATABASE_URL="$DB_URL" prisma_cli migrate deploy --schema=./prisma/schema.prisma
fi

# Regularizar ventas de clase diaria sin alumno (vincular por nombre exacto y unico)
if [ -f scripts/regularize-orphan-class-sales.cjs ]; then
  log "Regularizando ventas sin alumno"
  DATABASE_URL="$DB_URL" node scripts/regularize-orphan-class-sales.cjs || echo "Regularizacion no critica, continuando"
fi

# Cargar horarios base en la BD si la tabla esta vacia
if [ -f scripts/import-schedules.cjs ]; then
  log "Importando horarios base"
  DATABASE_URL="$DB_URL" node scripts/import-schedules.cjs || echo "Import de horarios no critico, continuando"
fi

# Nota: el backfill de horarios (scripts/backfill-schedules.cjs) ya no se ejecuta
# en cada deploy. Asignaba horarios a pagos por suposicion; ahora los registros
# sin horario se muestran aparte y el script queda para uso manual.

log "Configurando servicios"
printf "%s\n" \
  "[Unit]" \
  "Description=Weichafe Next Standalone" \
  "After=network.target" \
  "" \
  "[Service]" \
  "Type=simple" \
  "User=ec2-user" \
  "WorkingDirectory=$APP" \
  "Environment=HOSTNAME=0.0.0.0" \
  "Environment=PORT=3000" \
  "Environment=DATABASE_URL=$DB_URL" \
  "Environment=UPLOAD_DIR=$VAR/uploads" \
  "EnvironmentFile=-$VAR/auth.env" \
  "EnvironmentFile=-$VAR/recovery.env" \
  "ExecStart=/usr/bin/node server.js" \
  "Restart=always" \
  "RestartSec=5" \
  "" \
  "[Install]" \
  "WantedBy=multi-user.target" \
  | sudo tee /etc/systemd/system/weichafe.service >/dev/null

# Respaldo diario automatico (sin costo: queda en el mismo disco).
# Persistent=true: si la instancia estaba apagada a esa hora, corre al encender.
printf "%s\n" \
  "[Unit]" \
  "Description=Respaldo diario de la base Weichafe" \
  "" \
  "[Service]" \
  "Type=oneshot" \
  "User=ec2-user" \
  "ExecStart=/usr/bin/python3 $APP/scripts/backup-db.py" \
  | sudo tee /etc/systemd/system/weichafe-backup.service >/dev/null
printf "%s\n" \
  "[Unit]" \
  "Description=Respaldo diario de la base Weichafe" \
  "" \
  "[Timer]" \
  "OnCalendar=*-*-* 08:00:00" \
  "Persistent=true" \
  "" \
  "[Install]" \
  "WantedBy=timers.target" \
  | sudo tee /etc/systemd/system/weichafe-backup.timer >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable weichafe.service
sudo systemctl enable --now weichafe-backup.timer

log "Iniciando el servicio"
sudo systemctl start "$SERVICE"

log "Verificando que la aplicacion responde"
if ! health_ok; then
  echo "La aplicacion nueva no responde en $HEALTH_URL"
  false
fi

rm -rf "$FAILED"
log "Deploy completado. La version anterior queda en $PREV por si hay que volver atras"
