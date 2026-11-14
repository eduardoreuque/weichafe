"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isPlausibleDate, parseLocalDate } from "@/lib/helpers";
import { scheduleIdsExist } from "@/lib/schedules";

export type ActionResult = { ok: true } | { ok: false; error: string };

function normalizeString(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return value.length > 0 ? value : null;
}

/**
 * Actualiza la ficha de un alumno.
 *
 * Nota: aquí vivían createStudentAction, createMonthlyPaymentAction,
 * createDailyClassSaleAction y deleteStudentAction, que ya no se usaban (la UI
 * registra por las API routes) y además escribían archivos JSON en public/ que
 * se resetean en cada deploy. Se eliminaron para no duplicar lógica ni perder datos.
 */
export async function updateStudentAction(
  studentId: string,
  formData: FormData
): Promise<ActionResult> {
  if (!studentId) return { ok: false, error: "ID de alumno requerido" };

  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const fullName = normalizeString(formData.get("fullName"));
  const birthDateRaw = normalizeString(formData.get("birthDate"));

  if (!fullName) return { ok: false, error: "El nombre completo es requerido" };
  if (!birthDateRaw) return { ok: false, error: "La fecha de nacimiento es requerida" };

  const birthDate = parseLocalDate(birthDateRaw);
  if (!isPlausibleDate(birthDate, 1900, new Date().getFullYear())) {
    return { ok: false, error: "La fecha de nacimiento no es válida" };
  }

  // Horarios marcados en el formulario (puede ser más de una disciplina y bloque)
  const scheduleIds: string[] = [];
  for (const entry of formData.getAll("scheduleIds")) {
    const id = normalizeString(entry);
    if (id && !scheduleIds.includes(id)) scheduleIds.push(id);
  }

  try {
    const current = await prisma.student.findUnique({
      where: { id: studentId },
      select: { scheduleId: true, schedules: { select: { scheduleId: true } } },
    });
    if (!current) return { ok: false, error: "Alumno no encontrado" };

    if (!(await scheduleIdsExist(scheduleIds))) {
      return { ok: false, error: "Uno de los horarios seleccionados ya no existe. Recarga la página." };
    }

    // El horario principal se conserva si sigue marcado; si no, pasa a ser el primero.
    const primaryScheduleId =
      current.scheduleId && scheduleIds.includes(current.scheduleId)
        ? current.scheduleId
        : scheduleIds[0] ?? null;
    const alreadyLinked = new Set(current.schedules.map((link) => link.scheduleId));

    await prisma.$transaction([
      prisma.student.update({
        where: { id: studentId },
        data: {
          fullName,
          birthDate,
          rut: normalizeString(formData.get("rut")),
          email: normalizeString(formData.get("email")),
          whatsapp: normalizeString(formData.get("whatsapp")),
          address: normalizeString(formData.get("address")),
          district: normalizeString(formData.get("district")),
          emergencyContact: normalizeString(formData.get("emergencyContact")),
          emergencyPhone: normalizeString(formData.get("emergencyPhone")),
          notes: normalizeString(formData.get("notes")),
          photoUrl: normalizeString(formData.get("photoUrl")),
          scheduleId: primaryScheduleId,
          // Una casilla desmarcada no se envía. Antes se comparaba con "false" y
          // el alumno quedaba siempre activo: no se podía marcar como inactivo y
          // editar a un inactivo lo reactivaba.
          isActive: formData.get("isActive") === "on",
        },
      }),
      prisma.studentSchedule.deleteMany({
        where: { studentId, scheduleId: { notIn: scheduleIds } },
      }),
      ...scheduleIds
        .filter((scheduleId) => !alreadyLinked.has(scheduleId))
        .map((scheduleId) => prisma.studentSchedule.create({ data: { studentId, scheduleId } })),
    ]);

    revalidatePath("/");
    revalidatePath("/alumnos");
    revalidatePath(`/alumnos/${studentId}`);
    revalidatePath("/admin/alumnos-por-horario");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo actualizar el alumno. Intenta nuevamente." };
  }
}
