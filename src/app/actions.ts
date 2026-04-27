"use server";

import {
  Discipline,
  MonthlyStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const disciplines = new Set<Discipline>([
  "MMA",
  "KICK",
  "BOXEO",
  "JIU_JITSU",
  "MUAY_THAI",
  "FUNCIONAL",
  "OTRO",
]);

const paymentMethods = new Set<PaymentMethod>([
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA_DEBITO",
  "TARJETA_CREDITO",
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

export async function createStudent(formData: FormData): Promise<void> {
  const fullName = normalizeString(formData.get("fullName"));
  const birthDateRaw = normalizeString(formData.get("birthDate"));

  if (!fullName || !birthDateRaw) {
    return;
  }

  await prisma.student.create({
    data: {
      fullName,
      birthDate: new Date(birthDateRaw),
      email: normalizeString(formData.get("email")),
      whatsapp: normalizeString(formData.get("whatsapp")),
      address: normalizeString(formData.get("address")),
      district: normalizeString(formData.get("district")),
      emergencyPhone: normalizeString(formData.get("emergencyPhone")),
    },
  });

  revalidatePath("/");
}

export async function createMonthlyPayment(formData: FormData): Promise<void> {
  const studentId = normalizeString(formData.get("studentId"));
  const discipline = normalizeString(formData.get("discipline")) as Discipline | null;
  const status = normalizeString(formData.get("status")) as MonthlyStatus | null;
  const monthCoveredRaw = normalizeString(formData.get("monthCovered"));

  if (!studentId || !discipline || !status || !monthCoveredRaw) {
    return;
  }

  if (!disciplines.has(discipline) || !monthlyStatuses.has(status)) {
    return;
  }

  const amount = normalizeInt(formData.get("amount"));
  const paidAtRaw = normalizeString(formData.get("paidAt"));
  const paymentMethodRaw = normalizeString(formData.get("paymentMethod")) as PaymentMethod | null;

  const yearMonth = `${monthCoveredRaw}-01`;
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : status === "PAGADO" ? new Date() : null;

  const data: Prisma.MonthlyPaymentCreateInput = {
    amount,
    discipline,
    monthCovered: new Date(yearMonth),
    notes: normalizeString(formData.get("notes")),
    status,
    paidAt,
    student: {
      connect: {
        id: studentId,
      },
    },
    paymentMethod: paymentMethodRaw && paymentMethods.has(paymentMethodRaw) ? paymentMethodRaw : null,
  };

  const created = await prisma.monthlyPayment.create({
    data,
    include: {
      student: true,
    },
  });

  if (created.status === "PAGADO" && created.paymentMethod) {
    await prisma.receipt.create({
      data: {
        receiptNumber: createReceiptNumber(),
        amount: created.amount,
        description: `Mensualidad ${created.discipline} - ${created.monthCovered.toISOString().slice(0, 7)}`,
        paymentMethod: created.paymentMethod,
        studentId: created.studentId,
        monthlyPaymentId: created.id,
        issuedAt: created.paidAt ?? new Date(),
      },
    });
  }

  revalidatePath("/");
}

export async function createDailyClassSale(formData: FormData): Promise<void> {
  const discipline = normalizeString(formData.get("discipline")) as Discipline | null;
  const classDateRaw = normalizeString(formData.get("classDate"));
  const paymentMethod = normalizeString(formData.get("paymentMethod")) as PaymentMethod | null;

  if (!discipline || !classDateRaw || !paymentMethod) {
    return;
  }

  if (!disciplines.has(discipline) || !paymentMethods.has(paymentMethod)) {
    return;
  }

  const studentId = normalizeString(formData.get("studentId"));
  const amount = normalizeInt(formData.get("amount"));

  const created = await prisma.dailyClassSale.create({
    data: {
      discipline,
      classDate: new Date(classDateRaw),
      paymentMethod,
      amount,
      notes: normalizeString(formData.get("notes")),
      attendeeName: normalizeString(formData.get("attendeeName")),
      student: studentId
        ? {
            connect: {
              id: studentId,
            },
          }
        : undefined,
    },
    include: {
      student: true,
    },
  });

  if (created.studentId) {
    await prisma.receipt.create({
      data: {
        receiptNumber: createReceiptNumber(),
        amount: created.amount,
        description: `Clase diaria ${created.discipline}`,
        paymentMethod: created.paymentMethod,
        studentId: created.studentId,
        dailyClassSaleId: created.id,
        issuedAt: created.classDate,
      },
    });
  }

  revalidatePath("/");
}
