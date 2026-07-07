import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const STUDENT_SCHEDULES_FILE = join(process.cwd(), "public", "student-schedules.json");

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesion expirada" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const discipline = searchParams.get("discipline");
  const dayOfWeek = searchParams.get("dayOfWeek");
  const startTime = searchParams.get("startTime");

  if (!discipline || !dayOfWeek || !startTime) {
    return NextResponse.json(
      { error: "Faltan parámetros: discipline, dayOfWeek, startTime" },
      { status: 400 }
    );
  }

  try {
    // Leer horarios
    const schedulesData = readFileSync(join(process.cwd(), "public", "schedules.json"), "utf-8");
    const schedules = JSON.parse(schedulesData).schedules;
    
    // Filtrar horarios que coincidan
    const matchingSchedules = schedules.filter(
      (s: any) => s.discipline === discipline && s.dayOfWeek === dayOfWeek && s.startTime === startTime
    );

    if (matchingSchedules.length === 0) {
      return NextResponse.json([]);
    }

    const scheduleId = matchingSchedules[0].id;

    // Leer horarios de estudiantes
    const data = readFileSync(STUDENT_SCHEDULES_FILE, "utf-8");
    const studentSchedules: Record<string, string[]> = JSON.parse(data);
    
    const studentIdsWithSchedule = Object.entries(studentSchedules)
      .filter(([_, schedules]) => Array.isArray(schedules) && schedules.includes(scheduleId))
      .map(([studentId]) => studentId);

    if (studentIdsWithSchedule.length === 0) {
      return NextResponse.json([]);
    }

    // Obtener información de los estudiantes
    const students = await prisma.student.findMany({
      where: { id: { in: studentIdsWithSchedule } },
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