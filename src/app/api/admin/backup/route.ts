import { NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Respaldo de la base SQLite.
 *
 * Usa "VACUUM INTO" para obtener una copia consistente aunque haya escrituras
 * en paralelo (copiar el archivo a mano puede dejar la copia corrupta).
 * Solo disponible para ADMIN.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Solo administradores" }, { status: 403 });
  }

  const tmpPath = join(tmpdir(), `weichafe-backup-${randomUUID()}.db`);

  try {
    // VACUUM INTO crea un archivo nuevo con una copia coherente de la base
    await prisma.$executeRawUnsafe(`VACUUM INTO '${tmpPath.replace(/'/g, "''")}'`);
    const buffer = await readFile(tmpPath);
    await unlink(tmpPath).catch(() => {});

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="weichafe-backup-${stamp}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating backup:", error);
    await unlink(tmpPath).catch(() => {});
    return NextResponse.json(
      { ok: false, error: "No se pudo generar el respaldo de la base de datos." },
      { status: 500 }
    );
  }
}
