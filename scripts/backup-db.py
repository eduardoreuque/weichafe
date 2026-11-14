#!/usr/bin/env python3
"""Respaldo consistente de la base SQLite de Weichafe.

Usa la API de respaldo de SQLite: se puede ejecutar con el servicio en marcha
(a diferencia de copiar el archivo con cp, que puede dejar una copia corrupta).
Verifica la integridad de la copia antes de darla por buena y conserva solo las
más recientes.

Uso:
    python3 scripts/backup-db.py

Variables opcionales:
    WEICHAFE_DB           ruta de la base (por defecto la de producción)
    WEICHAFE_BACKUP_DIR   carpeta de respaldos
    WEICHAFE_BACKUP_KEEP  cuántos respaldos conservar (30)
"""
import os
import sqlite3
import sys
import time

SRC = os.environ.get("WEICHAFE_DB", "/home/ec2-user/weichafe-standalone/prisma/dev.db")
DST_DIR = os.environ.get("WEICHAFE_BACKUP_DIR", "/var/weichafe/backups")
KEEP = int(os.environ.get("WEICHAFE_BACKUP_KEEP", "30"))


def main():
    if not os.path.isfile(SRC):
        print("No existe la base a respaldar: " + SRC)
        return 1

    os.makedirs(DST_DIR, exist_ok=True)
    name = "dev-" + time.strftime("%Y%m%d-%H%M%S", time.gmtime()) + ".db"
    dst = os.path.join(DST_DIR, name)
    tmp = dst + ".tmp"

    source = sqlite3.connect("file:" + SRC + "?mode=ro", uri=True)
    try:
        target = sqlite3.connect(tmp)
        try:
            source.backup(target)
        finally:
            target.close()
    finally:
        source.close()

    check = sqlite3.connect("file:" + tmp + "?mode=ro", uri=True)
    try:
        result = check.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        check.close()

    if result != "ok":
        os.remove(tmp)
        print("El respaldo no paso la verificacion de integridad: " + str(result))
        return 1

    os.chmod(tmp, 0o600)
    os.replace(tmp, dst)
    print("Respaldo creado: %s (%d bytes)" % (dst, os.path.getsize(dst)))

    # Los nombres llevan fecha y hora: el orden alfabético es el cronológico.
    backups = sorted(f for f in os.listdir(DST_DIR) if f.startswith("dev-") and f.endswith(".db"))
    for old in backups[:-KEEP] if KEEP > 0 else []:
        os.remove(os.path.join(DST_DIR, old))
        print("Respaldo antiguo eliminado: " + old)
    return 0


if __name__ == "__main__":
    sys.exit(main())
