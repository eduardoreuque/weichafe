import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Alumnos por horario.
 *
 * El bloque se identifica por su id. La búsqueda por disciplina/día/hora se
 * mantiene por compatibilidad, pero se rechaza si coincide con más de un
 * bloque (ej. "MMA lunes 19:00" existe como Adultos y como Kids): antes se
 * tomaba el primero que apareciera.
 *
 * Los alumnos salen de StudentSchedule (un alumno puede estar en varios bloques).
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
      { error: "Falta el horario (scheduleId) o discipline, dayOfWeek y startTime" },
      { status: 400 }
    );
  }

  try {
    let schedule: { id: string } | null = null;
    if (scheduleIdParam) {
      schedule = await prisma.schedule.findUnique({ where: { id: scheduleIdParam }, select: { id: true } });
    } else {
      const matches = await prisma.schedule.findMany({
        where: { discipline: discipline!, dayOfWeek: dayOfWeek!, startTime: startTime! },
        select: { id: true },
        take: 2,
      });
      if (matches.length > 1) {
        return NextResponse.json(
          { error: "Hay más de un bloque con esa disciplina, día y hora. Indica el horario exacto (scheduleId)." },
          { status: 400 }
        );
      }
      schedule = matches[0] ?? null;
    }

    if (!schedule) {
      return NextResponse.json([]);
    }

    const students = await prisma.student.findMany({
      where: { schedules: { some: { scheduleId: schedule.id } } },
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
