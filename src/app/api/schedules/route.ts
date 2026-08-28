import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
        },
      });
      return NextResponse.json({ success: true, schedule: newSchedule });
    } else if (action === "update") {
      const updated = await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          discipline: schedule.discipline,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          blockName: schedule.blockName,
        },
      });
      return NextResponse.json({ success: true, schedule: updated });
    } else if (action === "delete") {
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
