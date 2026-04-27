import { Discipline, MonthlyPayment, MonthlyStatus, PaymentMethod } from "@prisma/client";

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

export function toMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function toDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
  }).format(date);
}

export function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "EFECTIVO":
      return "Efectivo";
    case "TRANSFERENCIA":
      return "Transferencia";
    case "TARJETA_DEBITO":
      return "Tarjeta débito";
    case "TARJETA_CREDITO":
      return "Tarjeta crédito";
    default:
      return method;
  }
}

export function disciplineLabel(discipline: Discipline): string {
  switch (discipline) {
    case "KICK":
      return "Kick";
    case "JIU_JITSU":
      return "Jiu Jitsu";
    case "MUAY_THAI":
      return "Muay Thai";
    case "BOXEO":
      return "Boxeo";
    case "MMA":
      return "MMA";
    case "FUNCIONAL":
      return "Funcional";
    case "OTRO":
      return "Otro";
    default:
      return discipline;
  }
}

export function statusLabel(status: MonthlyStatus): string {
  switch (status) {
    case "PAGADO":
      return "Pagado";
    case "PENDIENTE":
      return "Pendiente";
    case "SALTADO":
      return "Saltado";
    default:
      return status;
  }
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(key: string): Date {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export function detectSkippedMonthsByDiscipline(
  payments: Pick<MonthlyPayment, "discipline" | "monthCovered" | "status">[],
): Record<string, string[]> {
  const now = new Date();
  const limit = new Date(now.getFullYear(), now.getMonth(), 1);
  const byDiscipline = new Map<Discipline, Pick<MonthlyPayment, "discipline" | "monthCovered" | "status">[]>();

  for (const payment of payments) {
    const list = byDiscipline.get(payment.discipline) ?? [];
    list.push(payment);
    byDiscipline.set(payment.discipline, list);
  }

  const result: Record<string, string[]> = {};

  for (const [discipline, list] of byDiscipline.entries()) {
    const covered = new Set<string>(
      list
        .filter((item) => item.status === "PAGADO" || item.status === "SALTADO")
        .map((item) => monthKey(item.monthCovered)),
    );

    const sortedMonths = list.map((item) => item.monthCovered).sort((a, b) => a.getTime() - b.getTime());
    const start = sortedMonths[0];

    if (!start) {
      result[discipline] = [];
      continue;
    }

    const gaps: string[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cursor <= limit) {
      const key = monthKey(cursor);
      if (!covered.has(key)) {
        gaps.push(toMonthLabel(parseMonthKey(key)));
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    result[discipline] = gaps;
  }

  return result;
}
