import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PaymentSearchBySchedule } from "@/components/payment-search-by-schedule";

export default async function PagosPorHorarioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            ← Volver
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Pagos por Horario</h1>
            <p className="mt-2 text-sm text-slate-600">
              Busca y visualiza los pagos de los alumnos por horario de clase
            </p>
          </div>
        </div>

        <PaymentSearchBySchedule />
      </div>
    </div>
  );
}
