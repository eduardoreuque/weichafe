/**
 * Reglas de filtrado de reportes por horario, disciplina y fechas.
 *
 * Principio: un registro pertenece a un bloque solo si está vinculado a ese
 * bloque (scheduleId). No se infiere el horario por disciplina ni por día de la
 * semana: `Schedule.dayOfWeek` guarda solo el primer día del bloque
 * (LUNES = lun-mié-vie), así que comparar por día excluía clases válidas y
 * mezclaba bloques distintos.
 */

export interface ScopeFilters {
  /** Horario filtrado ("" = todos). */
  scheduleId: string;
  /** Disciplina del horario filtrado ("" si no hay filtro de horario). */
  scheduleDiscipline: string;
  /** Disciplina filtrada ("" = todas). */
  discipline: string;
  start: Date | null;
  end: Date | null;
}

export interface ScopedRecord {
  scheduleId: string | null;
  /** Una disciplina o varias separadas por coma (clases diarias). */
  discipline: string;
  /** Disciplinas adicionales separadas por coma (mensualidades). */
  disciplines?: string | null;
}

export type PaymentState = "SIN_PAGOS" | "CON_DEUDA" | "AL_DIA";

export function disciplinesOf(record: Pick<ScopedRecord, "discipline" | "disciplines">): string[] {
  return `${record.discipline},${record.disciplines ?? ""}`
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function matchesDiscipline(
  record: Pick<ScopedRecord, "discipline" | "disciplines">,
  discipline: string
): boolean {
  return !discipline || disciplinesOf(record).includes(discipline);
}

/** El registro pertenece al horario y disciplina filtrados (sin mirar fechas). */
export function recordInScope(record: ScopedRecord, filters: ScopeFilters): boolean {
  if (filters.scheduleId && record.scheduleId !== filters.scheduleId) return false;
  return matchesDiscipline(record, filters.discipline);
}

/**
 * Registro sin horario que coincide con la disciplina del bloque filtrado.
 * No se muestra dentro del bloque: se informa aparte como "sin horario".
 */
export function recordIsUnlinkedForSchedule(record: ScopedRecord, filters: ScopeFilters): boolean {
  if (!filters.scheduleId || record.scheduleId) return false;
  return (
    matchesDiscipline(record, filters.scheduleDiscipline) && matchesDiscipline(record, filters.discipline)
  );
}

export function dateInRange(date: Date, filters: Pick<ScopeFilters, "start" | "end">): boolean {
  if (filters.start && date < filters.start) return false;
  if (filters.end && date > filters.end) return false;
  return true;
}

/** Fecha de un pago para efectos de rango: la de pago o, si no tiene, la de registro. */
export function paymentReferenceDate(payment: { paidAt: Date | null; createdAt: Date }): Date {
  return payment.paidAt ?? payment.createdAt;
}

/**
 * El alumno está asignado al horario filtrado o, si solo se filtra por
 * disciplina, a algún horario de esa disciplina.
 */
export function enrolledInScope(
  enrolledScheduleIds: Iterable<string>,
  disciplineBySchedule: ReadonlyMap<string, string>,
  filters: ScopeFilters
): boolean {
  for (const id of enrolledScheduleIds) {
    const discipline = disciplineBySchedule.get(id);
    if (discipline === undefined) continue;
    if (filters.scheduleId && id !== filters.scheduleId) continue;
    if (filters.discipline && discipline !== filters.discipline) continue;
    return true;
  }
  return false;
}

export function paymentStateOf(payments: { status: string }[]): PaymentState {
  if (payments.length === 0) return "SIN_PAGOS";
  const hasDebt = payments.some((p) => p.status === "PENDIENTE" || p.status === "SALTADO");
  return hasDebt ? "CON_DEUDA" : "AL_DIA";
}

/** Filtro "Estado de pago" evaluado sobre los pagos que el reporte muestra. */
export function matchesPaymentStatus(payments: { status: string }[], filter: string): boolean {
  switch (filter) {
    case "":
      return true;
    case "PAGADO":
    case "PENDIENTE":
    case "SALTADO":
      return payments.some((p) => p.status === filter);
    case "SIN_PAGO":
      return payments.length === 0;
    case "CON_DEUDA":
      return paymentStateOf(payments) === "CON_DEUDA";
    case "AL_DIA":
      return paymentStateOf(payments) === "AL_DIA";
    default:
      return true;
  }
}
