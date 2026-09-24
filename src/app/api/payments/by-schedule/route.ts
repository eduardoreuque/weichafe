import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseLocalDate } from "@/lib/helpers";

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
    // Alumnos asignados a este horario (BD)
    const studentsFromDb = await prisma.student.findMany({
      where: { scheduleId },
      select: { id: true },
    });
    const studentIds = studentsFromDb.map((s) => s.id);

    // Un pago puede pertenecer al horario por dos vías:
    //  1) el pago quedó vinculado explícitamente al horario (scheduleId)
    //  2) el alumno que paga tiene ese horario asignado
    const where: any = {
      OR: [
        { scheduleId },
        ...(studentIds.length > 0 ? [{ studentId: { in: studentIds } }] : []),
      ],
    };

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
      where.AND = [{ OR: [{ paidAt: range }, { paidAt: null, createdAt: range }] }];
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