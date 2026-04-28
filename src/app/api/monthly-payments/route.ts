import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Discipline, MonthlyStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

  const yearMonth = `${monthCoveredRaw}-01`;
  const monthCovered = new Date(yearMonth);
  if (Number.isNaN(monthCovered.getTime())) {
    return NextResponse.json({ ok: false, error: "Mes de cobertura invalido" }, { status: 400 });
  }

  const amount = normalizeInt(body.amount);
  const paidAtRaw = normalizeString(body.paidAt);
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : status === "PAGADO" ? new Date() : null;

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

  try {
    const created = await prisma.monthlyPayment.create({ data, include: { student: true } });

    if (status === "PAGADO" && paymentMethodRaw && paymentMethods.has(paymentMethodRaw)) {
      await prisma.receipt.create({
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

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo registrar la mensualidad. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
