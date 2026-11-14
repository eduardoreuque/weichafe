import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function pickString(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  return value.length > 0 ? value : null;
}

async function countScheduleUsage(scheduleId: string) {
  const [students, payments, classes] = await Promise.all([
    prisma.student.count({
      where: { OR: [{ scheduleId }, { schedules: { some: { scheduleId } } }] },
    }),
    prisma.monthlyPayment.count({ where: { scheduleId } }),
    prisma.dailyClassSale.count({ where: { scheduleId } }),
  ]);
  return { students, payments, classes };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesion expirada" }, { status: 401 });
  }

  try {
    const schedules = await prisma.schedule.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error reading schedules:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesion expirada" }, { status: 401 });
  }
  // Solo administradores pueden crear/editar/eliminar horarios
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, schedule } = body;

    if (action === "create") {
      const newSchedule = await prisma.schedule.create({
        data: {
          discipline: schedule.discipline,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          blockName: schedule.blockName,
          // location e isActive existían en el formulario pero no se guardaban
          location: pickString(schedule.location),
          isActive: schedule.isActive !== false,
        },
      });
      return NextResponse.json({ success: true, schedule: newSchedule });
    } else if (action === "update") {
      const current = await prisma.schedule.findUnique({
        where: { id: schedule.id },
        select: { discipline: true },
      });
      if (!current) {
        return NextResponse.json({ success: false, error: "Horario no encontrado" }, { status: 404 });
      }
      // Cambiar la disciplina de un bloque con registros dejaría pagos y clases
      // de una disciplina vinculados a un horario de otra.
      if (current.discipline !== schedule.discipline) {
        const usage = await countScheduleUsage(schedule.id);
        if (usage.payments + usage.classes > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `No se puede cambiar la disciplina: este horario tiene ${usage.payments} pago(s) y ${usage.classes} clase(s) vinculados. Crea un horario nuevo para la otra disciplina.`,
            },
            { status: 409 }
          );
        }
      }
      const updated = await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          discipline: schedule.discipline,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          blockName: schedule.blockName,
          location: pickString(schedule.location),
          isActive: schedule.isActive !== false,
        },
      });
      return NextResponse.json({ success: true, schedule: updated });
    } else if (action === "delete") {
      // Borrar un horario desvinculaba en silencio sus pagos y clases (quedaban
      // "sin horario") y dejaba alumnos apuntando a un horario inexistente.
      const usage = await countScheduleUsage(schedule.id);
      if (usage.students + usage.payments + usage.classes > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Este horario tiene ${usage.students} alumno(s), ${usage.payments} pago(s) y ${usage.classes} clase(s) vinculados. Para no perder esos vínculos, edítalo y desmarca "Horario activo" en lugar de eliminarlo.`,
          },
          { status: 409 }
        );
      }
      await prisma.schedule.delete({
        where: { id: schedule.id },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error updating schedules:", error);
    return NextResponse.json({ success: false, error: "Error al guardar" }, { status: 500 });
  }
}
