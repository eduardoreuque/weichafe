"use client";

import { useState, useEffect } from "react";

interface Schedule {
  id: string;
  discipline: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  blockName: string;
}

interface PaymentRow {
  id: string;
  discipline: string;
  disciplines: string | null;
  status: string;
  monthCovered: string;
  amount: number;
  paidAt: string | null;
  paymentMethod: string | null;
  scheduleId: string | null;
  student: {
    id: string;
    fullName: string;
    rut: string | null;
    scheduleId: string | null;
  };
}

interface SearchResult {
  schedule: {
    id: string;
    discipline: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    blockName: string;
  };
  payments: PaymentRow[];
  unassigned: PaymentRow[];
  totals: { assigned: number; unassigned: number };
}

// Evita el corrimiento de -1 día por zona horaria en fechas "YYYY-MM-DD"
function parseDisplayDate(value: string | null): Date {
  if (!value) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + "T12:00:00");
  return new Date(value);
}

function money(value: number): string {
  return "$" + value.toLocaleString("es-CL");
}

function statusClass(status: string): string {
  if (status === "PAGADO") return "bg-emerald-100 text-emerald-700";
  if (status === "PENDIENTE") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export function PaymentSearchBySchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeUnassigned, setIncludeUnassigned] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error("Error loading schedules:", loadError);
    }
  };

  const searchPayments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams();
      params.append("scheduleId", selectedSchedule);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (!includeUnassigned) params.append("includeUnassigned", "false");

      const res = await fetch(`/api/payments/by-schedule?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "No se pudieron obtener los pagos.");
        return;
      }
      setResult(data);
    } catch {
      setError("No se pudieron obtener los pagos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (rows: PaymentRow[], emptyMessage: string) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-4 py-2 text-left font-semibold text-slate-700">Alumno</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-700">RUT</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-700">Mes</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-700">Monto</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-700">Estado</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-700">Fecha Pago</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-700">Origen</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-4 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((payment) => (
              <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{payment.student.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{payment.student.rut || "-"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {parseDisplayDate(payment.monthCovered).toLocaleDateString("es-CL", {
                    month: "long",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">{money(payment.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(payment.status)}`}>
                    {payment.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {payment.paidAt ? parseDisplayDate(payment.paidAt).toLocaleDateString("es-CL") : "-"}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {payment.scheduleId
                    ? "Pago vinculado al bloque"
                    : payment.student.scheduleId
                    ? "Por horario del alumno"
                    : "Sin horario vinculado"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );


  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Pagos por Horario</h2>

      <form onSubmit={searchPayments} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Horario</label>
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Selecciona un horario</option>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.discipline} - {schedule.dayOfWeek} {schedule.startTime}-{schedule.endTime} ({schedule.blockName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Fecha Inicio (opcional)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Fecha Fin (opcional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={includeUnassigned}
            onChange={(e) => setIncludeUnassigned(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Incluir pagos de la misma disciplina sin horario vinculado
        </label>

        <button
          type="submit"
          disabled={!selectedSchedule || loading}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Buscando..." : "Buscar Pagos"}
        </button>
      </form>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
      )}

      {result && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {result.schedule.discipline} - {result.schedule.dayOfWeek}{" "}
                  {result.schedule.startTime}-{result.schedule.endTime}
                </h3>
                <p className="text-sm text-slate-600">
                  {result.schedule.blockName} · {result.payments.length} pago(s) vinculado(s) al horario
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Total vinculado</p>
                <p className="text-2xl font-bold text-emerald-600">{money(result.totals.assigned)}</p>
              </div>
            </div>
            {renderTable(result.payments, "No hay pagos vinculados a este horario en el período.")}
          </div>

          {includeUnassigned && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Misma disciplina ({result.schedule.discipline}) sin horario vinculado
                  </h3>
                  <p className="text-sm text-slate-600">
                    {result.unassigned.length} pago(s). Corresponden a fichas sin bloque asignado, por
                    eso no se pueden clasificar en un horario exacto (antes quedaban invisibles).
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Total</p>
                  <p className="text-2xl font-bold text-amber-700">{money(result.totals.unassigned)}</p>
                </div>
              </div>
              {renderTable(result.unassigned, "No hay pagos sin horario para esta disciplina.")}
            </div>
          )}
        </>
      )}
    </div>
  );
}

