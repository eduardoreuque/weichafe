import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

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

    // Validar tipo
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

    // Guardar en disco: usar UPLOAD_DIR o crear directorio local
    const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Devolver URL pública
    const publicUrl = process.env.UPLOAD_DIR
      ? `/uploads/${filename}`
      : `/uploads/${filename}`;

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { ok: false, error: "Error al subir la imagen. Intenta nuevamente." },
      { status: 500 }
    );
  }
}