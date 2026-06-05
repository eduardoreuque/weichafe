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

1. Añade los secrets en Settings → Secrets and variables → Actions.
2. Abre la pestaña Actions → `Auto Deploy and Teardown` → `Run workflow`.
3. Ajusta `keep_alive_minutes` (por defecto 10). Si pones `0`, el workflow no apagará la instancia.

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

- El deploy se realiza con `scripts/deploy-ec2.sh`, que espera poder hacer `scp`/`ssh` al host; el workflow escribe la clave en el runner y la usa durante el job.
- Si prefieres provisionar/destruir instancias (terraform), el workflow puede extenderse para aplicar/destroy con `terraform`.

Si quieres, puedo adaptar el workflow para crear/terminar instancias dinámicamente (Terraform), en vez de usar una instancia preexistente.
