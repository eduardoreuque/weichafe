export function toDateLabel(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function toMonthLabel(date: Date): string {
  return date.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

import { Discipline, MonthlyStatus, PaymentMethod } from "@prisma/client";

export function disciplineLabel(d: string): string {
  const map: Record<string, string> = {
    MMA: "MMA",
    KICK: "Kickboxing",
    BOXEO: "Boxeo",
    JIU_JITSU: "Jiu Jitsu",
    MUAY_THAI: "Muay Thai",
    FUNCIONAL: "Funcional",
    OTRO: "Otra",
  };
  return map[d] ?? d;
}

export function statusLabel(s: MonthlyStatus): string {
  const map: Record<MonthlyStatus, string> = {
    PAGADO: "Pagado",
    PENDIENTE: "Pendiente",
    SALTADO: "Saltado",
  };
  return map[s];
}

export function paymentMethodLabel(m: string): string {
  const map: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    TARJETA_DEBITO: "Tarjeta Débito",
    TARJETA_CREDITO: "Tarjeta Crédito",
  };
  return map[m] ?? m;
}

export function statusClass(status: MonthlyStatus): string {
  switch (status) {
    case "PAGADO":
      return "bg-emerald-100 text-emerald-800";
    case "PENDIENTE":
      return "bg-amber-100 text-amber-800";
    case "SALTADO":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export interface MonthGap {
  year: number;
  month: number;
}

export function detectSkippedMonthsByDiscipline(
  payments: { discipline: Discipline; monthCovered: Date; status: MonthlyStatus }[]
): Record<string, string[]> {
  const groups: Record<string, Date[]> = {};

  for (const p of payments) {
    if (p.status === "SALTADO") continue;
    const key = p.discipline;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p.monthCovered);
  }

  const result: Record<string, string[]> = {};
  for (const [discipline, dates] of Object.entries(groups)) {
    dates.sort((a, b) => a.getTime() - b.getTime());
    const gaps: string[] = [];
    const minDate = new Date(dates[0]);
    const maxDate = new Date();
    const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

    while (cursor <= maxDate) {
      const found = dates.some(
        (d) => d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth()
      );
      if (!found) {
        gaps.push(
          cursor.toLocaleDateString("es-CL", { month: "short", year: "numeric" })
        );
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    result[discipline] = gaps;
  }
  return result;
}

export function parseDisciplines(d: string | undefined | null): string[] {
  if (!d || d.trim() === "") return [];
  return d.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Parsea una fecha en formato "YYYY-MM-DD" (o "YYYY-MM") como fecha LOCAL.
 * Evita el corrimiento de -1 día que causa `new Date("2026-08-01")`
 * (parseado como medianoche UTC) en zonas horarias como Chile (UTC-4).
 */
export function parseLocalDate(
  value: string | null | undefined,
  kind: "day" | "month" = "day"
): Date {
  if (!value || value.trim() === "") return new Date(NaN);
  const parts = value.split("-").map((n) => parseInt(n, 10));
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    return new Date(NaN);
  }
  const year = parts[0];
  const month = parts[1] - 1; // 0-indexed
  const day = kind === "month" ? 1 : parts.length >= 3 && !Number.isNaN(parts[2]) ? parts[2] : 1;
  return new Date(year, month, day);
}

/** Convierte un Date a "YYYY-MM-DD" usando la zona horaria local. */
export function toLocalInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}