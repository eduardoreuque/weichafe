"use server";

import {
  Discipline,
  MonthlyStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createReceiptNumber } from "@/lib/receipts";
import { parseLocalDate } from "@/lib/helpers";

export type ActionResult = { ok: true } | { ok: false; error: string };

const disciplines = new Set<Discipline>([
  "MMA", "KICK", "BOXEO", "JIU_JITSU", "MUAY_THAI", "FUNCIONAL", "OTRO",
]);

const paymentMethods = new Set<PaymentMethod>([
  "EFECTIVO", "TRANSFERENCIA", "TARJETA_DEBITO", "TARJETA_CREDITO",
]);

const monthlyStatuses = new Set<MonthlyStatus>(["PAGADO", "PENDIENTE", "SALTADO"]);

function normalizeInt(raw: FormDataEntryValue | null, fallback = 0): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}

function normalizeString(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function createStudentAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const fullName = normalizeString(formData.get("fullName"));
  const birthDateRaw = normalizeString(formData.get("birthDate"));

  if (!fullName) return { ok: false, error: "El nombre completo es requerido" };
  if (!birthDateRaw) return { ok: false, error: "La fecha de nacimiento es requerida" };

  const scheduleId = normalizeString(formData.get("scheduleId"));

  try {
    const student = await prisma.student.create({
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

    // Sincronizar JSON de horarios del alumno
    const { readFileSync, writeFileSync } = await import("fs");
    const { join } = await import("path");
    const STUDENT_SCHEDULES_FILE = join(process.cwd(), "public", "student-schedules.json");
    try {
      const data = readFileSync(STUDENT_SCHEDULES_FILE, "utf-8");
      const studentSchedules = JSON.parse(data);
      if (scheduleId) {
        studentSchedules[student.id] = [scheduleId];
      }
      writeFileSync(STUDENT_SCHEDULES_FILE, JSON.stringify(studentSchedules, null, 2));
    } catch (error) {
      console.error("Error updating student schedules JSON:", error);
    }

    revalidatePath("/");
    revalidatePath("/alumnos");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo guardar el alumno. Intenta nuevamente." };
  }
}

export async function createMonthlyPaymentAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const studentId = normalizeString(formData.get("studentId"));
  const discipline = normalizeString(formData.get("discipline")) as Discipline | null;
  const status = normalizeString(formData.get("status")) as MonthlyStatus | null;
  const monthCoveredRaw = normalizeString(formData.get("monthCovered"));

  if (!studentId) return { ok: false, error: "Selecciona un alumno" };
  if (!discipline || !disciplines.has(discipline)) return { ok: false, error: "Disciplina inválida" };
  if (!status || !monthlyStatuses.has(status)) return { ok: false, error: "Estado inválido" };
  if (!monthCoveredRaw) return { ok: false, error: "La mensualidad que paga es requerida" };

  const amount = normalizeInt(formData.get("amount"));
  if (amount <= 0) return { ok: false, error: "El monto debe ser mayor a 0" };

  const paidAtRaw = normalizeString(formData.get("paidAt"));
  const paymentMethodRaw = normalizeString(formData.get("paymentMethod")) as PaymentMethod | null;
  const disciplinesMulti = normalizeString(formData.get("disciplines"));
  const notes = normalizeString(formData.get("notes"));

  // Fecha LOCAL para evitar el corrimiento de -1 día por zona horaria
  const monthCovered = parseLocalDate(monthCoveredRaw, "month");
  if (Number.isNaN(monthCovered.getTime())) {
    return { ok: false, error: "Mes de cobertura inválido" };
  }

  const paidAt = paidAtRaw ? parseLocalDate(paidAtRaw) : status === "PAGADO" ? new Date() : null;

  const data: Prisma.MonthlyPaymentCreateInput = {
    amount,
    discipline,
    disciplines: disciplinesMulti,
    status,
    monthCovered,
    paidAt,
    paymentMethod: paymentMethodRaw && paymentMethods.has(paymentMethodRaw) ? paymentMethodRaw : null,
    notes,
    student: { connect: { id: studentId } },
  };

  try {
    // Evitar cobro duplicado del mismo mes/disciplina
    const duplicate = await prisma.monthlyPayment.findFirst({
      where: { studentId, discipline, monthCovered, status: "PAGADO" },
      select: { id: true },
    });
    if (duplicate) {
      return { ok: false, error: "Ya existe un pago registrado para este alumno, mes y disciplina." };
    }

    // Pago + comprobante atómicos (si falla el comprobante, no queda el pago)
    await prisma.$transaction(async (tx) => {
      const created = await tx.monthlyPayment.create({ data, include: { student: true } });

      if (status === "PAGADO" && paymentMethodRaw && paymentMethods.has(paymentMethodRaw)) {
        await tx.receipt.create({
          data: {
            receiptNumber: createReceiptNumber(),
            amount: created.amount,
            description: `Mensualidad ${created.discipline}${created.disciplines ? ` (${created.disciplines})` : ""} - ${monthCovered.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}`,
            paymentMethod: paymentMethodRaw,
            studentId: studentId,
            monthlyPaymentId: created.id,
            issuedAt: paidAt ?? new Date(),
          },
        });
      }
    });

    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo registrar la mensualidad. Intenta nuevamente." };
  }
}

export async function createDailyClassSaleAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const studentIdRaw = normalizeString(formData.get("studentId"));
  const disciplineRaw = normalizeString(formData.get("disciplines")) || normalizeString(formData.get("discipline"));
  const classDateRaw = normalizeString(formData.get("classDate"));
  const paymentMethodRaw = normalizeString(formData.get("paymentMethod")) as PaymentMethod | null;

  if (!disciplineRaw) return { ok: false, error: "Selecciona al menos una disciplina" };
  if (!classDateRaw) return { ok: false, error: "La fecha de clase es requerida" };
  if (!paymentMethodRaw || !paymentMethods.has(paymentMethodRaw)) return { ok: false, error: "Método de pago requerido" };

  const amount = normalizeInt(formData.get("amount"));
  if (amount <= 0) return { ok: false, error: "El monto debe ser mayor a 0" };

  const attendeeName = normalizeString(formData.get("attendeeName"));
  const studentId = studentIdRaw ?? null;

  if (!studentId && !attendeeName) {
    return { ok: false, error: "Indica el alumno o el nombre del asistente" };
  }

  // Fecha LOCAL para evitar el corrimiento de -1 día por zona horaria
  const classDate = parseLocalDate(classDateRaw);
  if (Number.isNaN(classDate.getTime())) {
    return { ok: false, error: "Fecha de clase inválida" };
  }

  try {
    // Venta + comprobante atómicos (si falla el comprobante, no queda la venta)
    await prisma.$transaction(async (tx) => {
      const created = await tx.dailyClassSale.create({
        data: {
          discipline: disciplineRaw,
          classDate,
          amount,
          paymentMethod: paymentMethodRaw,
          notes: normalizeString(formData.get("notes")),
          attendeeName,
          student: studentId ? { connect: { id: studentId } } : undefined,
        },
        include: { student: true },
      });

      const receiptStudentId = created.studentId;
      if (receiptStudentId) {
        await tx.receipt.create({
          data: {
            receiptNumber: createReceiptNumber(),
            amount: created.amount,
            description: `Clase diaria ${created.discipline}`,
            paymentMethod: created.paymentMethod,
            studentId: receiptStudentId,
            dailyClassSaleId: created.id,
            issuedAt: created.classDate,
          },
        });
      }
    });

    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo registrar la clase diaria. Intenta nuevamente." };
  }
}

export async function deleteStudentAction(studentId: string): Promise<ActionResult> {
  if (!studentId) return { ok: false, error: "ID de alumno requerido" };

  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado" };
  if (session.role !== "ADMIN") {
    return { ok: false, error: "No tienes permisos para eliminar alumnos." };
  }

  try {
    await prisma.student.delete({ where: { id: studentId } });
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo eliminar el alumno." };
  }
}

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

    // Sincronizar JSON de horarios del alumno (solo en desarrollo)
    if (process.env.NODE_ENV !== "production") {
      const { readFileSync, writeFileSync } = await import("fs");
      const { join } = await import("path");
      const STUDENT_SCHEDULES_FILE = join(process.cwd(), "public", "student-schedules.json");
      try {
        const data = readFileSync(STUDENT_SCHEDULES_FILE, "utf-8");
        const studentSchedules = JSON.parse(data);
        if (scheduleId) {
          // Si tiene horario, asegurar que esté en el array
          const current = studentSchedules[studentId] || [];
          if (!current.includes(scheduleId)) {
            studentSchedules[studentId] = [scheduleId];
          }
        } else {
          // Si no tiene horario, limpiar
          delete studentSchedules[studentId];
        }
        writeFileSync(STUDENT_SCHEDULES_FILE, JSON.stringify(studentSchedules, null, 2));
      } catch (error) {
        console.error("Error updating student schedules JSON:", error);
      }
    }

    revalidatePath("/");
    revalidatePath("/alumnos");
    revalidatePath(`/alumnos/${studentId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo actualizar el alumno. Intenta nuevamente." };
  }
}
