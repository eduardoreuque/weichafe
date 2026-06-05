# Auto-deploy y teardown (GitHub Actions)

Este documento explica cómo usar el workflow de GitHub Actions que automatiza:

- Encender la instancia EC2 especificada
- Desplegar la versión actual (usando `scripts/deploy-ec2.sh`)
- Ejecutar healthcheck
- Mantener la instancia activa por N minutos
- Apagar la instancia automáticamente para evitar cargos

REQUISITOS (GitHub repository secrets):

- `AWS_ACCESS_KEY_ID` — clave AWS con permisos para `ec2:StartInstances`, `ec2:StopInstances`, `ec2:DescribeInstances`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` — ejemplo: `us-east-1`
- `EC2_INSTANCE_ID` — id de la instancia que usarás para pruebas (p.ej. `i-0ee7429f...`)
- `SSH_PRIVATE_KEY` — contenido PEM de la key que permite SSH/SCP al `ec2-user` (se escribe temporalmente en el runner)

USO:

### GitHub Actions (recomendado)

1. Añade los secrets en Settings → Secrets and variables → Actions.
2. Abre la pestaña Actions → `Auto Deploy and Teardown` → `Run workflow`.
3. Ajusta `keep_alive_minutes` (por defecto 10). Si pones `0`, el workflow no apagará la instancia.

### Manual desde otro equipo

Si prefieres ejecutar desde tu propio laptop o una terminal remota:

```bash
cd weichafe
export AWS_REGION=us-east-1
export EC2_INSTANCE_ID=i-0ee7429f5b6b2d10a
export SSH_KEY=~/.ssh/weichafe-ec2
./scripts/deploy-ec2.sh
```

También puedes iniciar/detener la instancia y obtener la URL con:

```bash
./scripts/ec2-control.sh start
./scripts/ec2-control.sh url
./scripts/ec2-control.sh stop
```

FUNCIONAMIENTO:

- El workflow arranca la instancia (`start-instances`) y espera a que esté `running`.
- Obtiene la IP pública y la exporta a `EC2_IP`.
- Escribe la `SSH_PRIVATE_KEY` en `deploy_key.pem` y ejecuta `./scripts/deploy-ec2.sh` (este script usa `EC2_HOST`/`SSH_KEY` si están presentes).
- Hace un healthcheck en `http://$EC2_IP/login` y falla si no responde 200 en ~1 minuto.
- Mantiene la instancia viva por los minutos solicitados y luego la apaga (si `keep_alive_minutes != 0`).

SEGURIDAD Y COSTOS:

- Usa una cuenta/rol con permisos mínimos para EC2.
- No incluyas claves en el repo; usa secrets.
- Mantén `keep_alive_minutes` corto para evitar cargos.

LIMITACIONES Y NOTAS:

- El deploy se realiza con `scripts/deploy-ec2.sh`, que ahora puede resolver la IP pública a partir de `EC2_INSTANCE_ID` o usar `EC2_HOST` si se define.
- Para ejecutar manualmente desde otra ubicación, configura `AWS_REGION`, `EC2_INSTANCE_ID` y `SSH_KEY`.
- Si prefieres provisionar/destruir instancias (Terraform), el workflow puede extenderse para aplicar/destroy con `terraform`.

Si quieres, puedo adaptar el workflow para crear/terminar instancias dinámicamente (Terraform), en vez de usar una instancia preexistente.
