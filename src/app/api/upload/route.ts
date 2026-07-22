import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

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

    // Validar tamaño (máximo 2MB - más pequeño para data URL)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { ok: false, error: "La imagen es muy grande. Máximo 2MB" },
        { status: 400 }
      );
    }

    // Convertir a base64 (data URL) - funciona en todos los entornos
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({ ok: true, url: dataUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { ok: false, error: "Error al subir la imagen. Intenta nuevamente." },
      { status: 500 }
    );
  }
}