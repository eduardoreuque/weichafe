"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseLocalDate } from "@/lib/helpers";

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

  const scheduleId = normalizeString(formData.get("scheduleId"));

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: {
        fullName,
        birthDate: parseLocalDate(birthDateRaw),
        rut: normalizeString(formData.get("rut")),
        email: normalizeString(formData.get("email")),
        whatsapp: normalizeString(formData.get("whatsapp")),
        address: normalizeString(formData.get("address")),
        district: normalizeString(formData.get("district")),
        emergencyContact: normalizeString(formData.get("emergencyContact")),
        emergencyPhone: normalizeString(formData.get("emergencyPhone")),
        notes: normalizeString(formData.get("notes")),
        photoUrl: normalizeString(formData.get("photoUrl")),
        scheduleId,
        isActive: formData.get("isActive") !== "false",
      },
    });

    revalidatePath("/");
    revalidatePath("/alumnos");
    revalidatePath(`/alumnos/${studentId}`);
    revalidatePath("/admin/alumnos-por-horario");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo actualizar el alumno. Intenta nuevamente." };
  }
}
