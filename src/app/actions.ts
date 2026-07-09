"use server";

import {
  Discipline,
  MonthlyStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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

function createReceiptNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `REC-${y}${m}${d}-${h}${min}${sec}-${rand}`;
}

export async function createStudentAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const fullName = normalizeString(formData.get("fullName"));
  const birthDateRaw = normalizeString(formData.get("birthDate"));

  if (!fullName) return { ok: false, error: "El nombre completo es requerido" };
  if (!birthDateRaw) return { ok: false, error: "La fecha de nacimiento es requerida" };

  try {
    await prisma.student.create({
      data: {
        fullName,
        birthDate: new Date(birthDateRaw),
        rut: normalizeString(formData.get("rut")),
        email: normalizeString(formData.get("email")),
        whatsapp: normalizeString(formData.get("whatsapp")),
        address: normalizeString(formData.get("address")),
        district: normalizeString(formData.get("district")),
        emergencyContact: normalizeString(formData.get("emergencyContact")),
        emergencyPhone: normalizeString(formData.get("emergencyPhone")),
        notes: normalizeString(formData.get("notes")),
        photoUrl: normalizeString(formData.get("photoUrl")),
        isActive: formData.get("isActive") !== "false",
      },
    });
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo guardar el alumno. Intenta nuevamente." };
  }
}

export async function createMonthlyPaymentAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const studentId = normalizeString(formData.get("studentId"));
  const discipline = normalizeString(formData.get("discipline")) as Discipline | null;
  const status = normalizeString(formData.get("status")) as MonthlyStatus | null;
  const monthCoveredRaw = normalizeString(formData.get("monthCovered"));

  if (!studentId) return { ok: false, error: "Selecciona un alumno" };
  if (!discipline || !disciplines.has(discipline)) return { ok: false, error: "Disciplina inválida" };
  if (!status || !monthlyStatuses.has(status)) return { ok: false, error: "Estado inválido" };
  if (!monthCoveredRaw) return { ok: false, error: "La mensualidad que paga es requerida" };

  const amount = normalizeInt(formData.get("amount"));
  const paidAtRaw = normalizeString(formData.get("paidAt"));
  const paymentMethodRaw = normalizeString(formData.get("paymentMethod")) as PaymentMethod | null;
  const disciplinesMulti = normalizeString(formData.get("disciplines"));

  const yearMonth = `${monthCoveredRaw}-01`;
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : status === "PAGADO" ? new Date() : null;

  const data: Prisma.MonthlyPaymentCreateInput = {
    amount,
    discipline,
    disciplines: disciplinesMulti,
    status,
    monthCovered: new Date(yearMonth),
    paidAt,
    paymentMethod: paymentMethodRaw && paymentMethods.has(paymentMethodRaw) ? paymentMethodRaw : null,
    notes: normalizeString(formData.get("notes")),
    student: { connect: { id: studentId } },
  };

  try {
    const created = await prisma.monthlyPayment.create({ data, include: { student: true } });

    if (status === "PAGADO" && paymentMethodRaw && paymentMethods.has(paymentMethodRaw)) {
      await prisma.receipt.create({
        data: {
          receiptNumber: createReceiptNumber(),
          amount: created.amount,
          description: `Mensualidad ${created.discipline}${created.disciplines ? ` (${created.disciplines})` : ""} - ${new Date(yearMonth).toLocaleDateString("es-CL", { month: "long", year: "numeric" })}`,
          paymentMethod: paymentMethodRaw,
          studentId: studentId,
          monthlyPaymentId: created.id,
          issuedAt: paidAt ?? new Date(),
        },
      });
    }

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
  const studentIdRaw = normalizeString(formData.get("studentId"));
  const disciplineRaw = normalizeString(formData.get("disciplines")) || normalizeString(formData.get("discipline"));
  const classDateRaw = normalizeString(formData.get("classDate"));
  const paymentMethodRaw = normalizeString(formData.get("paymentMethod")) as PaymentMethod | null;

  if (!disciplineRaw) return { ok: false, error: "Selecciona al menos una disciplina" };
  if (!classDateRaw) return { ok: false, error: "La fecha de clase es requerida" };
  if (!paymentMethodRaw || !paymentMethods.has(paymentMethodRaw)) return { ok: false, error: "Método de pago requerido" };

  const amount = normalizeInt(formData.get("amount"));
  const attendeeName = normalizeString(formData.get("attendeeName"));
  const studentId = studentIdRaw ?? null;

  if (!studentId && !attendeeName) {
    return { ok: false, error: "Indica el alumno o el nombre del asistente" };
  }

  try {
    const created = await prisma.dailyClassSale.create({
      data: {
        discipline: disciplineRaw,
        classDate: new Date(classDateRaw),
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
      await prisma.receipt.create({
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

    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo registrar la clase diaria. Intenta nuevamente." };
  }
}

export async function deleteStudentAction(studentId: string): Promise<ActionResult> {
  if (!studentId) return { ok: false, error: "ID de alumno requerido" };
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

  const fullName = normalizeString(formData.get("fullName"));
  const birthDateRaw = normalizeString(formData.get("birthDate"));

  if (!fullName) return { ok: false, error: "El nombre completo es requerido" };
  if (!birthDateRaw) return { ok: false, error: "La fecha de nacimiento es requerida" };

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: {
        fullName,
        birthDate: new Date(birthDateRaw),
        rut: normalizeString(formData.get("rut")),
        email: normalizeString(formData.get("email")),
        whatsapp: normalizeString(formData.get("whatsapp")),
        address: normalizeString(formData.get("address")),
        district: normalizeString(formData.get("district")),
        emergencyContact: normalizeString(formData.get("emergencyContact")),
        emergencyPhone: normalizeString(formData.get("emergencyPhone")),
        notes: normalizeString(formData.get("notes")),
        photoUrl: normalizeString(formData.get("photoUrl")),
        scheduleId: normalizeString(formData.get("scheduleId")),
        isActive: formData.get("isActive") !== "false",
      },
    });
    revalidatePath("/");
    revalidatePath("/alumnos");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo actualizar el alumno. Intenta nuevamente." };
  }
}
