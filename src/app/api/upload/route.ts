import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

/**
 * En desarrollo local: guarda en public/uploads/
 * En producción (EC2): guarda en UPLOAD_DIR (/var/weichafe/uploads/)
 * Se sirve con symlink o reverse proxy desde /uploads/
 */
function getUploadDir(): string {
  // Si está configurado UPLOAD_DIR, usarlo (producción en EC2)
  const envDir = process.env.UPLOAD_DIR;
  if (envDir) return envDir;
  // Por defecto (desarrollo local)
  return path.join(process.cwd(), "public", "uploads");
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sesion expirada" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No se recibió ningún archivo" }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Formato no permitido. Usa JPG, PNG, WebP o GIF" },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { ok: false, error: "La imagen es muy grande. Máximo 5MB" },
        { status: 400 }
      );
    }

    // Generar nombre único
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const fileName = `student-${timestamp}-${random}.${ext}`;

    // Asegurar que el directorio existe
    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    // Guardar archivo
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Devolver la URL pública
    const url = `/uploads/${fileName}`;

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { ok: false, error: "Error al subir la imagen. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
