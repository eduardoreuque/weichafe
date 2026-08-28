import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseLocalDate } from "@/lib/helpers";
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
    // Fuente principal: alumnos con este horario en la BD (scheduleId)
    const studentsFromDb = await prisma.student.findMany({
      where: { scheduleId },
      select: { id: true },
    });
    let studentIds = studentsFromDb.map((s) => s.id);

    // Adicional: horarios legacy en JSON (multi-horario, solo si existe y es legible)
    try {
      const data = readFileSync(STUDENT_SCHEDULES_FILE, "utf-8");
      const studentSchedules: Record<string, string[]> = JSON.parse(data);
      const extra = Object.entries(studentSchedules)
        .filter(([, schedules]) => Array.isArray(schedules) && schedules.includes(scheduleId))
        .map(([studentId]) => studentId);
      studentIds = Array.from(new Set([...studentIds, ...extra]));
    } catch {}

    if (studentIds.length === 0) return NextResponse.json([]);

    const where: any = { studentId: { in: studentIds } };

    // Filtrar por fecha de pago/registro (consistente con reportes y pagos por fecha)
    if (startDate || endDate) {
      const start = startDate ? parseLocalDate(startDate) : undefined;
      const end = endDate
        ? (() => {
            const d = parseLocalDate(endDate);
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : undefined;
      const range: any = {};
      if (start) range.gte = start;
      if (end) range.lte = end;
      where.OR = [{ paidAt: range }, { paidAt: null, createdAt: range }];
    }

    const payments = await prisma.monthlyPayment.findMany({
      where,
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
        createdAt: "desc",
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments by schedule:", error);
    return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 });
  }
}