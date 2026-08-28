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

interface Payment {
  id: string;
  studentId: string;
  discipline: string;
  status: string;
  monthCovered: string;
  amount: number;
  paidAt: string | null;
  student: {
    fullName: string;
    rut: string | null;
  };
}

export function PaymentSearchBySchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Evita el corrimiento de -1 día por zona horaria en fechas "YYYY-MM-DD"
  const parseDisplayDate = (value: string | null): Date => {
    if (!value) return new Date(NaN);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + "T12:00:00");
    return new Date(value);
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(data);
    } catch (error) {
      console.error("Error loading schedules:", error);
    }
  };

  const searchPayments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("scheduleId", selectedSchedule);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/payments/by-schedule?${params}`);
      const data = await res.json();
      setPayments(data);
    } catch (error) {
      console.error("Error searching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScheduleName = () => {
    const schedule = schedules.find((s) => s.id === selectedSchedule);
    if (!schedule) return "";
    return `${schedule.discipline} - ${schedule.dayOfWeek} ${schedule.startTime}-${schedule.endTime}`;
  };

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

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

        <button
          type="submit"
          disabled={!selectedSchedule || loading}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Buscando..." : "Buscar Pagos"}
        </button>
      </form>

      {payments.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{getScheduleName()}</h3>
              <p className="text-sm text-slate-600">
                {payments.length} pago(s) encontrado(s)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Total recaudado</p>
              <p className="text-2xl font-bold text-emerald-600">${totalAmount.toLocaleString()}</p>
            </div>
          </div>

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
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{payment.student.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{payment.student.rut || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {parseDisplayDate(payment.monthCovered).toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">${payment.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          payment.status === "PAGADO"
                            ? "bg-emerald-100 text-emerald-700"
                            : payment.status === "PENDIENTE"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {payment.paidAt ? parseDisplayDate(payment.paidAt).toLocaleDateString("es-CL") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}