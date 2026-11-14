import { NextResponse } from "next/server";
import { Discipline } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isPlausibleDate, parseLocalDate } from "@/lib/helpers";

/**
 * Pagos por horario.
 *
 * Devuelve dos grupos que nunca se mezclan:
 *  - payments:   pagos vinculados a ESTE bloque (scheduleId del pago). Antes se
 *                sumaban además todos los pagos de los alumnos asignados al
 *                bloque, aunque fueran de otra disciplina u otro horario.
 *  - unassigned: pagos de la misma disciplina sin horario vinculado. No se puede
 *                saber a qué bloque pertenecen, así que se muestran aparte.
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
    const range: { gte?: Date; lte?: Date } = {};
    if (startDate) range.gte = parseLocalDate(startDate);
    if (endDate) {
      const end = parseLocalDate(endDate);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    if ((range.gte && !isPlausibleDate(range.gte)) || (range.lte && !isPlausibleDate(range.lte))) {
      return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
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
      student: {
        select: {
          id: true,
          fullName: true,
          rut: true,
          // Solo para indicar si el alumno está asignado a este bloque
          schedules: { where: { scheduleId }, select: { scheduleId: true } },
        },
      },
    } as const;

    const rawPayments = await prisma.monthlyPayment.findMany({
      where: { AND: [{ scheduleId }, ...dateFilter] },
      select,
      orderBy: { createdAt: "desc" },
    });

    // Pagos de la misma disciplina sin horario vinculado
    let rawUnassigned: typeof rawPayments = [];
    if (includeUnassigned) {
      try {
        rawUnassigned = await prisma.monthlyPayment.findMany({
          where: {
            AND: [
              { scheduleId: null },
              {
                OR: [
                  { discipline: schedule.discipline as Discipline },
                  { disciplines: { contains: schedule.discipline } },
                ],
              },
              ...dateFilter,
            ],
          },
          select,
          orderBy: { createdAt: "desc" },
        });
      } catch (error) {
        // La disciplina del horario podría no coincidir con el enum (horarios
        // creados con nombre personalizado): no se rompe la consulta principal.
        console.error("No se pudieron cargar los pagos sin horario vinculado:", error);
        rawUnassigned = [];
      }
    }

    const toRow = (payment: (typeof rawPayments)[number]) => ({
      ...payment,
      student: {
        id: payment.student.id,
        fullName: payment.student.fullName,
        rut: payment.student.rut,
        enrolledHere: payment.student.schedules.length > 0,
      },
    });
    const payments = rawPayments.map(toRow);
    const unassigned = rawUnassigned.map(toRow);

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
