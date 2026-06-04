import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function normalizeString(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sesion expirada. Inicia sesion nuevamente." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud invalida" }, { status: 400 });
  }

  const fullName = normalizeString(body.fullName);
  const birthDateRaw = normalizeString(body.birthDate);

  if (!fullName) {
    return NextResponse.json({ ok: false, error: "El nombre completo es requerido" }, { status: 400 });
  }

  if (!birthDateRaw) {
    return NextResponse.json({ ok: false, error: "La fecha de nacimiento es requerida" }, { status: 400 });
  }

  const birthDate = new Date(birthDateRaw);
  if (Number.isNaN(birthDate.getTime())) {
    return NextResponse.json({ ok: false, error: "La fecha de nacimiento no es valida" }, { status: 400 });
  }

  try {
    await prisma.student.create({
      data: {
        fullName,
        birthDate,
        email: normalizeString(body.email),
        whatsapp: normalizeString(body.whatsapp),
        address: normalizeString(body.address),
        district: normalizeString(body.district),
        emergencyPhone: normalizeString(body.emergencyPhone),
      },
    });

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar el alumno. Intenta nuevamente." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sesion expirada. Inicia sesion nuevamente." }, { status: 401 });
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No tienes permisos para eliminar alumnos." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = normalizeString(searchParams.get("id"));

  if (!studentId) {
    return NextResponse.json({ ok: false, error: "Falta el id del alumno." }, { status: 400 });
  }

  try {
    const exists = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json({ ok: false, error: "Alumno no encontrado." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.dailyClassSale.deleteMany({
        where: { studentId },
      });

      await tx.student.delete({
        where: { id: studentId },
      });
    });

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar el alumno. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
