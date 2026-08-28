import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Discipline, MonthlyStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createReceiptNumber } from "@/lib/receipts";
import { parseLocalDate } from "@/lib/helpers";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const PAYMENT_SCHEDULES_FILE = join(process.cwd(), "public", "payment-schedules.json");

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

function normalizeString(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  return value.length > 0 ? value : null;
}

function normalizeInt(raw: unknown, fallback = 0): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sesion expirada. Inicia sesion nuevamente." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud invalida" }, { status: 400 });
  }

  const studentId = normalizeString(body.studentId);
  const discipline = normalizeString(body.discipline) as Discipline | null;
  const status = normalizeString(body.status) as MonthlyStatus | null;
  const monthCoveredRaw = normalizeString(body.monthCovered);
  const paymentMethodRaw = normalizeString(body.paymentMethod) as PaymentMethod | null;

  if (!studentId) return NextResponse.json({ ok: false, error: "Selecciona un alumno" }, { status: 400 });
  if (!discipline || !disciplines.has(discipline)) {
    return NextResponse.json({ ok: false, error: "Disciplina invalida" }, { status: 400 });
  }
  if (!status || !monthlyStatuses.has(status)) {
    return NextResponse.json({ ok: false, error: "Estado invalido" }, { status: 400 });
  }
  if (!monthCoveredRaw) {
    return NextResponse.json({ ok: false, error: "La mensualidad que paga es requerida" }, { status: 400 });
  }

  // Fecha LOCAL para evitar el corrimiento de -1 día por zona horaria
  const monthCovered = parseLocalDate(monthCoveredRaw, "month");
  if (Number.isNaN(monthCovered.getTime())) {
    return NextResponse.json({ ok: false, error: "Mes de cobertura invalido" }, { status: 400 });
  }

  const amount = normalizeInt(body.amount);
  if (amount <= 0) {
    return NextResponse.json({ ok: false, error: "El monto debe ser mayor a 0" }, { status: 400 });
  }

  const paidAtRaw = normalizeString(body.paidAt);
  const paidAt = paidAtRaw ? parseLocalDate(paidAtRaw) : status === "PAGADO" ? new Date() : null;

  if (paidAt && Number.isNaN(paidAt.getTime())) {
    return NextResponse.json({ ok: false, error: "Fecha de pago invalida" }, { status: 400 });
  }

  const data: Prisma.MonthlyPaymentCreateInput = {
    amount,
    discipline,
    status,
    monthCovered,
    paidAt,
    paymentMethod: paymentMethodRaw && paymentMethods.has(paymentMethodRaw) ? paymentMethodRaw : null,
    notes: normalizeString(body.notes),
    student: { connect: { id: studentId } },
  };

  const scheduleId = normalizeString(body.scheduleId);

  try {
    // Evitar cobro duplicado del mismo mes/disciplina (nivel código)
    const duplicate = await prisma.monthlyPayment.findFirst({
      where: { studentId, discipline, monthCovered, status: "PAGADO" },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { ok: false, error: "Ya existe un pago registrado para este alumno, mes y disciplina." },
        { status: 400 }
      );
    }

    // Pago + comprobante en una sola transacción: si falla el comprobante,
    // no queda un pago huérfano ni duplicados por reintentos.
    const created = await prisma.$transaction(async (tx) => {
      const created = await tx.monthlyPayment.create({ data, include: { student: true } });

      if (status === "PAGADO" && paymentMethodRaw && paymentMethods.has(paymentMethodRaw)) {
        await tx.receipt.create({
          data: {
            receiptNumber: createReceiptNumber(),
            amount: created.amount,
            description: `Mensualidad ${created.discipline} - ${monthCovered.toLocaleDateString("es-CL", {
              month: "long",
              year: "numeric",
            })}`,
            paymentMethod: paymentMethodRaw,
            studentId,
            monthlyPaymentId: created.id,
            issuedAt: paidAt ?? new Date(),
          },
        });
      }

      return created;
    });

    // Guardar relación con horario si existe
    if (scheduleId) {
      try {
        const fileData = readFileSync(PAYMENT_SCHEDULES_FILE, "utf-8");
        const paymentSchedules = JSON.parse(fileData);
        paymentSchedules[created.id] = scheduleId;
        writeFileSync(PAYMENT_SCHEDULES_FILE, JSON.stringify(paymentSchedules, null, 2));
      } catch (error) {
        console.error("Error saving payment schedule:", error);
      }
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo registrar la mensualidad. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
