import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseLocalDate } from "@/lib/helpers";

/**
 * Pagos por horario.
 *
 * Devuelve dos grupos:
 *  - payments:   pagos vinculados al horario (por scheduleId del pago o porque
 *                el alumno tiene ese horario asignado).
 *  - unassigned: pagos de la MISMA disciplina que no tienen horario vinculado
 *                (ni el pago ni el alumno). Hoy son la gran mayoría, y antes
 *                quedaban invisibles: la vista parecía vacía aunque el pago
 *                existiera.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesion expirada" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const includeUnassigned = searchParams.get("includeUnassigned") !== "false";

  if (!scheduleId) {
    return NextResponse.json({ error: "Falta el ID del horario" }, { status: 400 });
  }

  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
    }

    // Rango de fechas sobre la fecha de pago (o de registro si no tiene paidAt)
    const range: any = {};
    if (startDate) range.gte = parseLocalDate(startDate);
    if (endDate) {
      const end = parseLocalDate(endDate);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    const hasRange = Object.keys(range).length > 0;
    const dateFilter = hasRange
      ? [{ OR: [{ paidAt: range }, { paidAt: null, createdAt: range }] }]
      : [];

    const select = {
      id: true,
      discipline: true,
      disciplines: true,
      status: true,
      monthCovered: true,
      amount: true,
      paidAt: true,
      paymentMethod: true,
      scheduleId: true,
      student: { select: { id: true, fullName: true, rut: true, scheduleId: true } },
    } as const;

    // Alumnos asignados a este horario
    const studentsFromDb = await prisma.student.findMany({
      where: { scheduleId },
      select: { id: true },
    });
    const studentIds = studentsFromDb.map((s) => s.id);

    const assignedWhere: any = {
      AND: [
        {
          OR: [
            { scheduleId },
            ...(studentIds.length > 0 ? [{ studentId: { in: studentIds } }] : []),
          ],
        },
        ...dateFilter,
      ],
    };

    const payments = await prisma.monthlyPayment.findMany({
      where: assignedWhere,
      select,
      orderBy: { createdAt: "desc" },
    });

    // Pagos de la misma disciplina sin horario vinculado
    let unassigned: typeof payments = [];
    if (includeUnassigned) {
      try {
        const unassignedWhere: any = {
          AND: [
            { scheduleId: null, student: { scheduleId: null } },
            {
              OR: [
                { discipline: schedule.discipline },
                { disciplines: { contains: schedule.discipline } },
              ],
            },
            ...dateFilter,
          ],
        };
        unassigned = await prisma.monthlyPayment.findMany({
          where: unassignedWhere,
          select,
          orderBy: { createdAt: "desc" },
        });
      } catch (error) {
        // La disciplina del horario podría no coincidir con el enum (horarios
        // creados con nombre personalizado): no se rompe la consulta principal.
        console.error("No se pudieron cargar los pagos sin horario vinculado:", error);
        unassigned = [];
      }
    }

    return NextResponse.json({
      schedule: {
        id: schedule.id,
        discipline: schedule.discipline,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        blockName: schedule.blockName,
      },
      payments,
      unassigned,
      totals: {
        assigned: payments.reduce((sum, p) => sum + p.amount, 0),
        unassigned: unassigned.reduce((sum, p) => sum + p.amount, 0),
      },
    });
  } catch (error) {
    console.error("Error fetching payments by schedule:", error);
    return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 });
  }
}
