"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";

interface StudentInfo {
  id: string;
  fullName: string;
  rut: string | null;
  email: string | null;
  whatsapp: string | null;
}

interface Payment {
  id: string;
  studentId: string;
  discipline: string;
  disciplines: string | null;
  status: string;
  monthCovered: string;
  amount: number;
  paidAt: string | null;
  paymentMethod: string | null;
  notes: string | null;
  student: StudentInfo;
}

interface ClassSale {
  id: string;
  studentId: string | null;
  attendeeName: string | null;
  discipline: string;
  classDate: string;
  amount: number;
  paymentMethod: string;
  notes: string | null;
  student: StudentInfo | null;
}

interface ApiResponse {
  payments: Payment[];
  classSales: ClassSale[];
  totalAmount: number;
}

function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(dateStr: string): string {
  // Fuerza mediodía para evitar el corrimiento de -1 día por zona horaria
  const safe = dateStr.includes("T") ? dateStr : dateStr + "T12:00:00";
  return new Date(safe).toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  const safe = dateStr.includes("T") ? dateStr : dateStr + "T12:00:00";
  return new Date(safe).toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function disciplineLabel(d: string): string {
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

function paymentMethodLabel(m: string | null): string {
  if (!m) return "-";
  const map: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    TARJETA_DEBITO: "Tarjeta Débito",
    TARJETA_CREDITO: "Tarjeta Crédito",
  };
  return map[m] ?? m;
}

export default function PagosPorFechaPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Fecha por defecto: últimos 30 días (en zona horaria local)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(toLocalYmd(end));
    setStartDate(toLocalYmd(start));
  }, []);

  // Página exclusiva de ADMIN (protección adicional en el cliente)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me");
        const me = await r.json();
        if (me.ok !== true || me.role !== "ADMIN") router.replace("/");
      } catch {
        router.replace("/");
      }
    })();
  }, [router]);

  const searchPayments = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      if (debouncedSearch.trim()) {
        params.append("q", debouncedSearch.trim());
      }

      const res = await fetch(`/api/payments/by-date-range?${params}`);
      if (!res.ok) {
        throw new Error("Error al obtener pagos");
      }
      const result: ApiResponse = await res.json();
      setData(result);
    } catch (e) {
      setError("Error al buscar pagos. Intenta nuevamente.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, debouncedSearch]);

  // Buscar automáticamente cuando cambian las fechas o la búsqueda
  useEffect(() => {
    if (startDate && endDate) {
      searchPayments();
    }
  }, [startDate, endDate, debouncedSearch, searchPayments]);

  return (
    <main className="relative min-h-screen px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      {/* Fondos decorativos */}
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
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Pagos por Rango de Fecha</h1>
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
              <label className="mb-1 block text-sm font-semibold text-slate-700">Fecha inicio *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Fecha fin *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Buscar alumno</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre del alumno..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={searchPayments}
                disabled={loading || !startDate || !endDate}
                className="w-full rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Resultados */}
        {data && (
          <>
            {/* Resumen */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-600">Total Mensualidades</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{data.payments.length}</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-700">Total Clases Diarias</p>
                <p className="mt-1 text-3xl font-bold text-blue-900">{data.classSales.length}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">Total Recaudado</p>
                <p className="mt-1 text-3xl font-bold text-emerald-900">
                  ${data.totalAmount.toLocaleString("es-CL")}
                </p>
              </div>
            </section>

            {/* Mensualidades */}
            {data.payments.length > 0 && (
              <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold text-slate-900">
                  Mensualidades Pagadas ({data.payments.length})
                </h2>
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
                        <th className="px-4 py-3 font-semibold text-slate-700">Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {payment.student.fullName}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{payment.student.rut || "-"}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {paymentMethodLabel(payment.paymentMethod)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {payment.disciplines
                              ? payment.disciplines.split(",").map(disciplineLabel).join(", ")
                              : disciplineLabel(payment.discipline)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(payment.monthCovered)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {payment.paidAt ? formatDateTime(payment.paidAt) : "-"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">
                            ${payment.amount.toLocaleString("es-CL")}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={payment.notes || ""}>
                            {payment.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Clases Diarias */}
            {data.classSales.length > 0 && (
              <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold text-slate-900">
                  Clases Diarias ({data.classSales.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 font-semibold text-slate-700">Alumno</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">RUT</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Forma de Pago</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Disciplina(s)</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Fecha de Clase</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Monto</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.classSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {sale.student?.fullName || sale.attendeeName || "Sin nombre"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{sale.student?.rut || "-"}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {paymentMethodLabel(sale.paymentMethod)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {sale.discipline.split(",").map(disciplineLabel).join(", ")}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(sale.classDate)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">
                            ${sale.amount.toLocaleString("es-CL")}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={sale.notes || ""}>
                            {sale.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {data.payments.length === 0 && data.classSales.length === 0 && (
              <section className="rounded-2xl border border-black/10 bg-white/90 p-6 text-center shadow-sm">
                <p className="text-lg font-semibold text-slate-700">
                  No se encontraron pagos en el rango seleccionado
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {searchQuery
                    ? `No hay pagos de "${searchQuery}" entre ${formatDate(startDate)} y ${formatDate(endDate)}`
                    : `No hay pagos entre ${formatDate(startDate)} y ${formatDate(endDate)}`}
                </p>
              </section>
            )}
          </>
        )}

        {!data && !loading && !hasSearched && (
          <section className="rounded-2xl border border-black/10 bg-white/90 p-6 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">
              Selecciona un rango de fechas para ver los pagos
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Por defecto se muestran los últimos 30 días
            </p>
          </section>
        )}
      </div>
    </main>
  );
}