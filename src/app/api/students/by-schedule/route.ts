import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Alumnos por horario.
 *
 * Antes leía public/schedules.json + public/student-schedules.json, archivos que
 * se resetean en cada deploy, por lo que la búsqueda devolvía vacío en producción.
 * Ahora se resuelve todo contra la base de datos: el horario (por id o por
 * disciplina/día/hora) y los alumnos con ese scheduleId asignado.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesion expirada" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const discipline = searchParams.get("discipline");
  const dayOfWeek = searchParams.get("dayOfWeek");
  const startTime = searchParams.get("startTime");
  const scheduleIdParam = searchParams.get("scheduleId");

  if (!scheduleIdParam && (!discipline || !dayOfWeek || !startTime)) {
    return NextResponse.json(
      { error: "Faltan parámetros: discipline, dayOfWeek, startTime" },
      { status: 400 }
    );
  }

  try {
    const schedule = scheduleIdParam
      ? await prisma.schedule.findUnique({ where: { id: scheduleIdParam } })
      : await prisma.schedule.findFirst({
          where: {
            discipline: discipline ?? undefined,
            dayOfWeek: dayOfWeek ?? undefined,
            startTime: startTime ?? undefined,
          },
        });

    if (!schedule) {
      return NextResponse.json([]);
    }

    const students = await prisma.student.findMany({
      where: { scheduleId: schedule.id },
      select: {
        id: true,
        fullName: true,
        rut: true,
        email: true,
        whatsapp: true,
        isActive: true,
        birthDate: true,
        address: true,
        district: true,
        emergencyContact: true,
        emergencyPhone: true,
        notes: true,
        photoUrl: true,
        createdAt: true,
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("Error fetching students by schedule:", error);
    return NextResponse.json({ error: "Error al obtener estudiantes" }, { status: 500 });
  }
}
