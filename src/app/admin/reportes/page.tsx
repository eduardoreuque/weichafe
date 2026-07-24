"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDebounce } from "use-debounce";

interface Schedule {
  id: string;
  discipline: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  blockName: string;
  location?: string;
}

interface PaymentInfo {
  id: string;
  discipline: string;
  disciplines: string;
  month: string;
  amount: number;
  status: string;
  paidAt: string | null;
  paymentMethod: string;
  notes: string;
  receiptId: string | null;
  receiptNumber: string | null;
}

interface ClassSaleInfo {
  id: string;
  discipline: string;
  classDate: string;
  amount: number;
  paymentMethod: string;
  notes: string;
}

interface ScheduleInfo {
  discipline: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  blockName: string;
}

interface StudentReport {
  id: string;
  fullName: string;
  rut: string;
  email: string;
  whatsapp: string;
  isActive: boolean;
  birthDate: string;
  edad: number;
  district: string;
  schedules: ScheduleInfo[];
  disciplines: string;
  totalPagado: number;
  totalPendiente: number;
  ultimoPagoMes: string;
  ultimoPagoMonto: number;
  paymentCount: number;
  classSalesCount: number;
  estadoPago: string;
  monthlyPayments: PaymentInfo[];
  dailyClassSales: ClassSaleInfo[];
}

interface Resumen {
  totalAlumnos: number;
  totalPagadoTotal: number;
  totalPendienteTotal: number;
  totalClasesDiarias: number;
  alumnosAlDia: number;
  alumnosConDeuda: number;
  alumnosSinPagos: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "AL_DIA", label: "Al día" },
  { value: "CON_DEUDA", label: "Con deuda" },
  { value: "SIN_PAGO", label: "Sin pagos" },
  { value: "PAGADO", label: "Pagados" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "SALTADO", label: "Saltados" },
];

const VIEW_OPTIONS = [
  { value: "resumen", label: "Resumen General" },
  { value: "alumnos", label: "Alumnos" },
  { value: "pagos", label: "Pagos Detallados" },
  { value: "clases", label: "Clases Diarias" },
];

function formatCurrency(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ReportesPage() {
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [data, setData] = useState<StudentReport[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [pagosDetallados, setPagosDetallados] = useState<any[]>([]);

  // Filtros
  const [filterSchedule, setFilterSchedule] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeView, setActiveView] = useState("resumen");

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSchedule) params.set("scheduleId", filterSchedule);
      if (filterDiscipline) params.set("discipline", filterDiscipline);
      if (filterPayment) params.set("paymentStatus", filterPayment);
      if (!onlyActive) params.set("onlyActive", "false");
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const result = await res.json();

      if (result.ok) {
        setData(result.data);
        setResumen(result.resumen);
        setSchedules(result.schedules || []);
        setDisciplines(result.disciplines || []);
        // Armar pagos detallados desde la data
        const detallados: any[] = [];
        result.data.forEach((student: StudentReport) => {
          student.monthlyPayments.forEach((payment: PaymentInfo) => {
            detallados.push({
              studentName: student.fullName,
              rut: student.rut,
              whatsapp: student.whatsapp,
              district: student.district,
              discipline: payment.discipline,
              disciplines: payment.disciplines,
              month: payment.month,
              amount: payment.amount,
              status: payment.status,
              paidAt: payment.paidAt,
              paymentMethod: payment.paymentMethod || "-",
              notes: payment.notes,
              receiptNumber: payment.receiptNumber || "-",
            });
          });
        });
        setPagosDetallados(detallados);
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  }, [filterSchedule, filterDiscipline, filterPayment, onlyActive, debouncedSearch, startDate, endDate]);

  // Cargar al inicio y cuando cambien filtros
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const estadoLabel = (status: string) => {
    const labels: Record<string, string> = {
      AL_DIA: "Al día",
      CON_DEUDA: "Con deuda",
      SIN_PAGOS: "Sin pagos",
    };
    return labels[status] || status;
  };

  const estadoClass = (status: string) => {
    const classes: Record<string, string> = {
      AL_DIA: "bg-emerald-100 text-emerald-700",
      CON_DEUDA: "bg-rose-100 text-rose-700",
      SIN_PAGOS: "bg-slate-100 text-slate-700",
    };
    return classes[status] || "bg-slate-100 text-slate-700";
  };

  const exportToCSV = (type: string) => {
    let csv = "\uFEFF";
    let headers: string[] = [];
    let rows: string[][] = [];

    if (type === "alumnos") {
      headers = ["Nombre", "RUT", "Email", "WhatsApp", "Edad", "Comuna", "Disciplinas", "Horario", "Total Pagado", "Total Pendiente", "Último Pago", "Estado", "Activo"];
      data.forEach((s) => {
        rows.push([
          s.fullName, s.rut, s.email, s.whatsapp, s.edad.toString(),
          s.district, s.disciplines,
          s.schedules.map((sc) => `${sc.discipline} ${sc.dayOfWeek} ${sc.startTime}-${sc.endTime}`).join("; "),
          s.totalPagado.toString(), s.totalPendiente.toString(), s.ultimoPagoMes,
          estadoLabel(s.estadoPago), s.isActive ? "Sí" : "No",
        ]);
      });
    } else if (type === "pagos") {
      headers = ["Alumno", "RUT", "WhatsApp", "Comuna", "Disciplina", "Disciplinas", "Mes", "Monto", "Estado", "Fecha Pago", "Forma Pago", "Nota", "Comprobante"];
      pagosDetallados.forEach((p) => {
        rows.push([
          p.studentName, p.rut, p.whatsapp, p.district, p.discipline, p.disciplines,
          p.month, p.amount.toString(), p.status, p.paidAt || "-", p.paymentMethod, p.notes, p.receiptNumber,
        ]);
      });
    } else if (type === "clases") {
      headers = ["Alumno", "RUT", "Disciplina", "Fecha Clase", "Monto", "Forma Pago", "Nota"];
      data.forEach((s) => {
        s.dailyClassSales.forEach((c) => {
          rows.push([
            s.fullName, s.rut, c.discipline, formatDate(c.classDate),
            c.amount.toString(), c.paymentMethod, c.notes,
          ]);
        });
      });
    } else {
      headers = ["Nombre", "RUT", "WhatsApp", "Edad", "Comuna", "Disciplinas", "Total Pagado", "Total Pendiente", "Estado"];
      data.forEach((s) => {
        rows.push([
          s.fullName, s.rut, s.whatsapp, s.edad.toString(), s.district,
          s.disciplines, s.totalPagado.toString(), s.totalPendiente.toString(), estadoLabel(s.estadoPago),
        ]);
      });
    }

    csv += headers.join(";") + "\n";
    rows.forEach((row) => {
      csv += row.map((cell) => `"${cell}"`).join(";") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;bom" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    a.download = `weichafe-${type}-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="relative min-h-screen px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="fixed left-0 top-0 h-screen w-1/3 opacity-30 pointer-events-none z-0">
        <img src="/1.png" alt="" className="h-full w-full object-contain" />
      </div>
      <div className="fixed right-0 top-0 h-screen w-1/3 opacity-30 pointer-events-none z-0">
        <img src="/2.png" alt="" className="h-full w-full object-contain" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        {/* Header */}
        <header className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/weichafe.jpg" alt="Logo" width={72} height={72} className="rounded-full border border-emerald-500/40 bg-slate-900 p-1" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Academia Weichafe</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Reportes y Estadísticas</h1>
                <p className="text-sm text-slate-600 mt-1">Filtros combinados: disciplina, horario, pagos, rango de fecha, búsqueda</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100">
                Dashboard
              </Link>
              <Link href="/admin" className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100">
                Admin
              </Link>
            </div>
          </div>
        </header>

        {/* Filtros */}
        <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Filtros</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Buscar alumno</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre o RUT..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Horario</label>
              <select
                value={filterSchedule}
                onChange={(e) => setFilterSchedule(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">Todos los horarios</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.discipline} - {s.dayOfWeek} {s.startTime}-{s.endTime} ({s.blockName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Disciplina</label>
              <select
                value={filterDiscipline}
                onChange={(e) => setFilterDiscipline(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">Todas las disciplinas</option>
                {disciplines.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Estado de pago</label>
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Fecha inicio (pago)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Fecha fin (pago)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Solo activos
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActiveView(opt.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    activeView === opt.value
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {data.length > 0 && (
                <>
                  <button onClick={() => exportToCSV("resumen")} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                    📥 Exportar
                  </button>
                  <button onClick={() => exportToCSV("alumnos")} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                    📥 Alumnos
                  </button>
                  <button onClick={() => exportToCSV("pagos")} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700">
                    📥 Pagos
                  </button>
                  <button onClick={() => exportToCSV("clases")} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700">
                    📥 Clases
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Resumen */}
        {activeView === "resumen" && resumen && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-600">Total Alumnos</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{resumen.totalAlumnos}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">Alumnos al día</p>
                <p className="mt-1 text-3xl font-bold text-emerald-900">{resumen.alumnosAlDia}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-700">Con deuda</p>
                <p className="mt-1 text-3xl font-bold text-rose-900">{resumen.alumnosConDeuda}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-700">Sin pagos</p>
                <p className="mt-1 text-3xl font-bold text-amber-900">{resumen.alumnosSinPagos}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">Total Recaudado</p>
                <p className="mt-1 text-3xl font-bold text-emerald-900">{formatCurrency(resumen.totalPagadoTotal)}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-700">Total Pendiente</p>
                <p className="mt-1 text-3xl font-bold text-rose-900">{formatCurrency(resumen.totalPendienteTotal)}</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-700">Clases Diarias</p>
                <p className="mt-1 text-3xl font-bold text-blue-900">{resumen.totalClasesDiarias}</p>
              </div>
            </section>

            {/* Gráfico simple de barras de estado */}
            <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-900">Distribución de estado de pagos</h2>
              <div className="flex h-8 w-full overflow-hidden rounded-xl">
                {resumen.totalAlumnos > 0 && (
                  <>
                    <div
                      style={{ width: `${(resumen.alumnosAlDia / resumen.totalAlumnos) * 100}%` }}
                      className="flex items-center justify-center bg-emerald-500 text-xs font-bold text-white transition-all"
                      title={`Al día: ${resumen.alumnosAlDia}`}
                    >
                      {resumen.alumnosAlDia > 0 && `${Math.round((resumen.alumnosAlDia / resumen.totalAlumnos) * 100)}%`}
                    </div>
                    <div
                      style={{ width: `${(resumen.alumnosConDeuda / resumen.totalAlumnos) * 100}%` }}
                      className="flex items-center justify-center bg-rose-500 text-xs font-bold text-white transition-all"
                      title={`Con deuda: ${resumen.alumnosConDeuda}`}
                    >
                      {resumen.alumnosConDeuda > 0 && `${Math.round((resumen.alumnosConDeuda / resumen.totalAlumnos) * 100)}%`}
                    </div>
                    <div
                      style={{ width: `${(resumen.alumnosSinPagos / resumen.totalAlumnos) * 100}%` }}
                      className="flex items-center justify-center bg-slate-400 text-xs font-bold text-white transition-all"
                      title={`Sin pagos: ${resumen.alumnosSinPagos}`}
                    >
                      {resumen.alumnosSinPagos > 0 && `${Math.round((resumen.alumnosSinPagos / resumen.totalAlumnos) * 100)}%`}
                    </div>
                  </>
                )}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-500"></span> Al día ({resumen.alumnosAlDia})</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-rose-500"></span> Con deuda ({resumen.alumnosConDeuda})</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-slate-400"></span> Sin pagos ({resumen.alumnosSinPagos})</span>
              </div>
            </section>
          </>
        )}

        {/* Vista: Alumnos */}
        {activeView === "alumnos" && (
          <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Alumnos ({data.length})
            </h2>
            {data.length === 0 ? (
              <p className="text-center text-slate-600">No se encontraron resultados con los filtros seleccionados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 font-semibold text-slate-700">Nombre</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">RUT</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">WhatsApp</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Edad</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Horario</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Disciplinas</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Total Pagado</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Total Pendiente</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Estado</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{student.fullName}</td>
                        <td className="px-4 py-3 text-slate-600">{student.rut || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{student.whatsapp || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{student.edad} años</td>
                        <td className="px-4 py-3 text-slate-600">
                          {student.schedules.length > 0
                            ? `${student.schedules[0].discipline} ${student.schedules[0].dayOfWeek} ${student.schedules[0].startTime}-${student.schedules[0].endTime}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{student.disciplines || "-"}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(student.totalPagado)}</td>
                        <td className="px-4 py-3 font-semibold text-rose-700">{formatCurrency(student.totalPendiente)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${estadoClass(student.estadoPago)}`}>
                            {estadoLabel(student.estadoPago)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/alumnos/${encodeURIComponent(student.id)}`}
                            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Vista: Pagos Detallados */}
        {activeView === "pagos" && (
          <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Pagos Detallados ({pagosDetallados.length} registros)
            </h2>
            {pagosDetallados.length === 0 ? (
              <p className="text-center text-slate-600">No se encontraron pagos con los filtros seleccionados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 font-semibold text-slate-700">Alumno</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">RUT</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Forma de Pago</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Disciplina(s)</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Mes Cubierto</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Fecha de Pago</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Monto</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Estado</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Nota</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pagosDetallados.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{p.studentName}</td>
                        <td className="px-4 py-3 text-slate-600">{p.rut}</td>
                        <td className="px-4 py-3 text-slate-600">{p.paymentMethod}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {p.disciplines ? p.disciplines.split(",").join(", ") : p.discipline}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.month}</td>
                        <td className="px-4 py-3 text-slate-600">{p.paidAt ? formatDate(p.paidAt) : "-"}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            p.status === "PAGADO" ? "bg-emerald-100 text-emerald-700" : 
                            p.status === "PENDIENTE" ? "bg-amber-100 text-amber-700" : 
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs whitespace-normal break-words">{p.notes || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{p.receiptNumber || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Vista: Clases Diarias */}
        {activeView === "clases" && (
          <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Clases Diarias
            </h2>
            {data.length === 0 ? (
              <p className="text-center text-slate-600">No se encontraron alumnos con los filtros seleccionados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 font-semibold text-slate-700">Alumno</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">RUT</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Forma de Pago</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Disciplina</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Fecha Clase</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Monto</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.map((student) =>
                      student.dailyClassSales.length === 0 ? null : (
                        student.dailyClassSales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{student.fullName}</td>
                            <td className="px-4 py-3 text-slate-600">{student.rut || "-"}</td>
                            <td className="px-4 py-3 text-slate-600">{sale.paymentMethod}</td>
                            <td className="px-4 py-3 text-slate-600">{sale.discipline}</td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(sale.classDate)}</td>
                            <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(sale.amount)}</td>
                            <td className="px-4 py-3 text-slate-600 max-w-xs whitespace-normal break-words">{sale.notes || "-"}</td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
                {data.every((s) => s.dailyClassSales.length === 0) && (
                  <p className="text-center text-slate-600 py-4">No hay clases diarias registradas.</p>
                )}
              </div>
            )}
          </section>
        )}

        {data.length === 0 && !loading && (
          <section className="rounded-2xl border border-black/10 bg-white/90 p-6 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">No se encontraron resultados</p>
            <p className="mt-2 text-sm text-slate-500">Ajusta los filtros para generar el reporte.</p>
          </section>
        )}
      </div>
    </main>
  );
}