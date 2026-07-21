"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  month: string;
  amount: number;
  status: string;
  paidAt: string | null;
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
  estadoPago: string;
  monthlyPayments: PaymentInfo[];
}

interface Resumen {
  totalAlumnos: number;
  totalPagadoTotal: number;
  totalPendienteTotal: number;
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

export default function ReportesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [data, setData] = useState<StudentReport[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  // Filtros
  const [filterSchedule, setFilterSchedule] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSchedule) params.set("scheduleId", filterSchedule);
      if (filterDiscipline) params.set("discipline", filterDiscipline);
      if (filterPayment) params.set("paymentStatus", filterPayment);
      if (!onlyActive) params.set("onlyActive", "false");

      const res = await fetch(`/api/reports?${params.toString()}`);
      const result = await res.json();

      if (result.ok) {
        setData(result.data);
        setResumen(result.resumen);
        setSchedules(result.schedules || []);
        setDisciplines(result.disciplines || []);
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

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

  const exportToExcel = () => {
    // Crear contenido CSV
    const headers = [
      "Nombre Completo",
      "RUT",
      "Email",
      "WhatsApp",
      "Edad",
      "Comuna",
      "Disciplinas",
      "Horarios",
      "Total Pagado",
      "Total Pendiente",
      "Último Pago",
      "Estado Pago",
      "Activo",
    ];

    const rows = data.map((student) => [
      student.fullName,
      student.rut,
      student.email,
      student.whatsapp,
      student.edad.toString(),
      student.district,
      student.disciplines,
      student.schedules
        .map((s) => `${s.discipline} ${s.dayOfWeek} ${s.startTime}-${s.endTime}`)
        .join("; "),
      student.totalPagado.toString(),
      student.totalPendiente.toString(),
      student.ultimoPagoMes,
      estadoLabel(student.estadoPago),
      student.isActive ? "Sí" : "No",
    ]);

    // Formato CSV con BOM para Excel (UTF-8 con caracteres españoles)
    let csv = "\uFEFF";
    csv += headers.join(";") + "\n";
    rows.forEach((row) => {
      csv += row.map((cell) => `"${cell}"`).join(";") + "\n";
    });

    // Descargar archivo
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;bom" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    a.download = `reporte-weichafe-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportDetailedExcel = () => {
    // Crear CSV detallado con pagos individuales
    const headers = [
      "Nombre Completo",
      "RUT",
      "Email",
      "WhatsApp",
      "Edad",
      "Comuna",
      "Disciplinas",
      "Horario",
      "Mes Pagado",
      "Monto",
      "Estado",
      "Fecha Pago",
      "Estado General",
    ];

    const rows: string[][] = [];

    data.forEach((student) => {
      const scheduleStr = student.schedules
        .map((s) => `${s.discipline} ${s.dayOfWeek} ${s.startTime}-${s.endTime}`)
        .join("; ");

      if (student.monthlyPayments.length > 0) {
        student.monthlyPayments.forEach((payment) => {
          rows.push([
            student.fullName,
            student.rut,
            student.email,
            student.whatsapp,
            student.edad.toString(),
            student.district,
            student.disciplines,
            scheduleStr,
            payment.month,
            payment.amount.toString(),
            payment.status,
            payment.paidAt || "-",
            estadoLabel(student.estadoPago),
          ]);
        });
      } else {
        rows.push([
          student.fullName,
          student.rut,
          student.email,
          student.whatsapp,
          student.edad.toString(),
          student.district,
          student.disciplines,
          scheduleStr,
          "-",
          "0",
          "-",
          "-",
          estadoLabel(student.estadoPago),
        ]);
      }
    });

    let csv = "\uFEFF";
    csv += headers.join(";") + "\n";
    rows.forEach((row) => {
      csv += row.map((cell) => `"${cell}"`).join(";") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;bom" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    a.download = `reporte-detallado-weichafe-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="relative min-h-screen px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      {/* Fondos */}
      <div className="fixed left-0 top-0 h-screen w-1/3 opacity-30 pointer-events-none z-0">
        <img src="/1.png" alt="" className="h-full w-full object-contain" />
      </div>
      <div className="fixed right-0 top-0 h-screen w-1/3 opacity-30 pointer-events-none z-0">
        <img src="/2.png" alt="" className="h-full w-full object-contain" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/weichafe.jpg" alt="Logo" width={72} height={72} className="rounded-full border border-emerald-500/40 bg-slate-900 p-1" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Academia Weichafe</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Reportes</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <Link
                href="/admin"
                className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
              >
                Admin
              </Link>
            </div>
          </div>
        </header>

        {/* Filtros */}
        <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={loadReport}
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Generar Reporte"}
            </button>
            {data.length > 0 && (
              <>
                <button
                  onClick={exportToExcel}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  📥 Exportar a Excel (resumen)
                </button>
                <button
                  onClick={exportDetailedExcel}
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  📥 Exportar detallado (con pagos)
                </button>
              </>
            )}
          </div>
        </section>

        {/* Resumen */}
        {resumen && (
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
              <p className="mt-1 text-3xl font-bold text-emerald-900">
                ${resumen.totalPagadoTotal.toLocaleString("es-CL")}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-medium text-rose-700">Total Pendiente</p>
              <p className="mt-1 text-3xl font-bold text-rose-900">
                ${resumen.totalPendienteTotal.toLocaleString("es-CL")}
              </p>
            </div>
          </section>
        )}

        {/* Tabla de resultados */}
        {data.length > 0 && (
          <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Resultados ({data.length} alumnos)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-semibold text-slate-700">Nombre</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">RUT</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">WhatsApp</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Edad</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Horarios</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Disciplinas</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Total Pagado</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/alumnos/${student.id}`}
                          className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          {student.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{student.rut || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{student.whatsapp || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{student.edad} años</td>
                      <td className="px-4 py-3 text-slate-600">
                        {student.schedules.length > 0 ? (
                          <div className="space-y-1">
                            {student.schedules.map((s, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-medium">{s.discipline}</span> {s.dayOfWeek} {s.startTime}-{s.endTime}
                              </div>
                            ))}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{student.disciplines || "-"}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        ${student.totalPagado.toLocaleString("es-CL")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${estadoClass(student.estadoPago)}`}>
                          {estadoLabel(student.estadoPago)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data.length === 0 && !loading && (
          <section className="rounded-2xl border border-black/10 bg-white/90 p-6 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">
              No se encontraron resultados
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Selecciona los filtros y haz clic en "Generar Reporte"
            </p>
          </section>
        )}
      </div>
    </main>
  );
}