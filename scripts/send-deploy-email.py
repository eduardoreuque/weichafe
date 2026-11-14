#!/usr/bin/env python3
"""Aviso por correo de un despliegue exitoso.

Lo ejecuta el job "notify" de .github/workflows/deploy.yml, que solo corre si el
job de despliegue terminó sin errores.

El correo incluye:
  - los cambios (commits) que llegaron a producción en este despliegue;
  - los informes pendientes que existan en el servidor, en
    /var/weichafe/informes/pendientes/*.md. Después de enviarlos se mueven a
    /var/weichafe/informes/enviados/.

Los informes viven en el servidor y no en el repositorio porque el repositorio
es público y pueden contener detalles internos. Este script nunca imprime su
contenido ni los destinatarios en el log.

Secretos necesarios en GitHub (Settings > Secrets and variables > Actions):
  SMTP_USERNAME   cuenta que envía (ej. una cuenta de Gmail)
  SMTP_PASSWORD   contraseña de aplicación de esa cuenta (no la contraseña normal)
  DEPLOY_MAIL_TO  destinatarios separados por coma
Opcionales: SMTP_HOST (smtp.gmail.com) y SMTP_PORT (465).

Si faltan los secretos, el script avisa y termina sin error: el despliegue ya
está hecho y no debe marcarse como fallido por el correo.
"""
import os
import smtplib
import subprocess
import sys
import time
from email.message import EmailMessage

PENDING_DIR = "/var/weichafe/informes/pendientes"
SENT_DIR = "/var/weichafe/informes/enviados"
SSH_KEY = os.path.expanduser("~/.ssh/weichafe-ec2")


def run(cmd):
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True, timeout=60)
    except (OSError, subprocess.SubprocessError):
        return 1, ""
    return result.returncode, result.stdout


def ssh(remote_command):
    host = os.environ.get("EC2_HOST", "")
    if not host or not os.path.isfile(SSH_KEY):
        return 1, ""
    return run([
        "ssh", "-i", SSH_KEY, "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15",
        "ec2-user@" + host, remote_command,
    ])


def commit_lines():
    before = os.environ.get("BEFORE_SHA", "")
    after = os.environ.get("AFTER_SHA", "HEAD")
    code, out = 1, ""
    if before and set(before) != {"0"}:
        code, out = run(["git", "log", "--no-merges", "--format=- %s (%h)", before + ".." + after])
    if code != 0 or not out.strip():
        code, out = run(["git", "log", "-1", "--format=- %s (%h)", after])
    return out.strip() or "- (sin detalle de cambios)"


def pending_reports():
    code, out = ssh("for f in %s/*.md; do [ -f \"$f\" ] && echo \"$f\"; done; true" % PENDING_DIR)
    if code != 0:
        return []
    reports = []
    for path in [line.strip() for line in out.splitlines() if line.strip()]:
        code, content = ssh("cat '%s'" % path.replace("'", ""))
        if code == 0 and content.strip():
            reports.append((path, content))
    return reports


def main():
    username = os.environ.get("SMTP_USERNAME", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    recipients = [r.strip() for r in os.environ.get("DEPLOY_MAIL_TO", "").split(",") if r.strip()]
    if not (username and password and recipients):
        print("::warning::Correo de aviso no enviado: faltan los secretos SMTP_USERNAME, SMTP_PASSWORD o DEPLOY_MAIL_TO.")
        return 0

    sha = os.environ.get("AFTER_SHA", "")[:7]
    reports = pending_reports()

    body = [
        "El despliegue de Weichafe termino correctamente y la aplicacion respondio a la verificacion.",
        "",
        "Fecha: " + time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
        "Version desplegada: " + (sha or "(desconocida)"),
        "",
        "CAMBIOS INCLUIDOS",
        commit_lines(),
        "",
        "Detalle de la ejecucion: " + os.environ.get("RUN_URL", "(no disponible)"),
    ]
    for _path, content in reports:
        body += ["", "=" * 60, "", content.strip()]

    message = EmailMessage()
    message["Subject"] = "Weichafe: despliegue exitoso" + (" (" + sha + ")" if sha else "")
    message["From"] = username
    message["To"] = ", ".join(recipients)
    message.set_content("\n".join(body))

    host = os.environ.get("SMTP_HOST") or "smtp.gmail.com"
    port = int(os.environ.get("SMTP_PORT") or "465")
    with smtplib.SMTP_SSL(host, port, timeout=30) as smtp:
        smtp.login(username, password)
        smtp.send_message(message)
    print("Correo enviado a %d destinatario(s), con %d informe(s)." % (len(recipients), len(reports)))

    # Los informes enviados se archivan para que no se repitan en el siguiente despliegue.
    if reports:
        stamp = time.strftime("%Y%m%d-%H%M%S", time.gmtime())
        moves = "; ".join(
            "mv '%s' '%s/%s-%s'" % (p.replace("'", ""), SENT_DIR, stamp, os.path.basename(p).replace("'", ""))
            for p, _content in reports
        )
        code, _out = ssh("mkdir -p '%s' && %s" % (SENT_DIR, moves))
        if code != 0:
            print("::warning::El correo se envio, pero no se pudieron archivar los informes en el servidor.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
