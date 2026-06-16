import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Discipline, PaymentMethod } from "@prisma/client";
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

  const studentIdRaw = normalizeString(body.studentId);
  const disciplineRaw = normalizeString(body.disciplines) || normalizeString(body.discipline);
  const classDateRaw = normalizeString(body.classDate);
  const paymentMethodRaw = normalizeString(body.paymentMethod) as PaymentMethod | null;
  const attendeeName = normalizeString(body.attendeeName);

  if (!disciplineRaw) {
    return NextResponse.json({ ok: false, error: "Selecciona al menos una disciplina" }, { status: 400 });
  }
  if (!classDateRaw) {
    return NextResponse.json({ ok: false, error: "La fecha de clase es requerida" }, { status: 400 });
  }
  if (!paymentMethodRaw || !paymentMethods.has(paymentMethodRaw)) {
    return NextResponse.json({ ok: false, error: "Metodo de pago requerido" }, { status: 400 });
  }
  if (!studentIdRaw && !attendeeName) {
    return NextResponse.json(
      { ok: false, error: "Indica el alumno o el nombre del asistente" },
      { status: 400 }
    );
  }

  const classDate = new Date(classDateRaw);
  if (Number.isNaN(classDate.getTime())) {
    return NextResponse.json({ ok: false, error: "Fecha de clase invalida" }, { status: 400 });
  }

  const amount = normalizeInt(body.amount);

  try {
    const created = await prisma.dailyClassSale.create({
      data: {
        discipline: disciplineRaw,
        classDate,
        amount,
        paymentMethod: paymentMethodRaw,
        notes: normalizeString(body.notes),
        attendeeName,
        student: studentIdRaw ? { connect: { id: studentIdRaw } } : undefined,
      },
      include: { student: true },
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
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo registrar la clase diaria. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
