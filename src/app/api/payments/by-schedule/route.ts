import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { readFileSync } from "fs";
import { join } from "path";

const STUDENT_SCHEDULES_FILE = join(process.cwd(), "public", "student-schedules.json");

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesion expirada" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!scheduleId) {
    return NextResponse.json({ error: "Falta el ID del horario" }, { status: 400 });
  }

  try {
    // Obtener todos los estudiantes que tienen este horario
    const data = readFileSync(STUDENT_SCHEDULES_FILE, "utf-8");
    const studentSchedules: Record<string, string[]> = JSON.parse(data);
    
    const studentIdsWithSchedule = Object.entries(studentSchedules)
      .filter(([_, schedules]) => Array.isArray(schedules) && schedules.includes(scheduleId))
      .map(([studentId]) => studentId);

    // Obtener pagos mensuales de estos estudiantes
    const whereClause: any = {
      studentId: { in: studentIdsWithSchedule },
    };

    if (startDate || endDate) {
      whereClause.monthCovered = {};
      if (startDate) whereClause.monthCovered.gte = new Date(startDate);
      if (endDate) whereClause.monthCovered.lte = new Date(endDate);
    }

    const payments = await prisma.monthlyPayment.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            rut: true,
            email: true,
            whatsapp: true,
          },
        },
      },
      orderBy: {
        monthCovered: "desc",
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments by schedule:", error);
    return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 });
  }
}