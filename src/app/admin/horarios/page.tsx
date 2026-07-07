import Link from "next/link";
import { ScheduleManager } from "@/components/schedule-manager";

export default function HorariosPage() {
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
            <h1 className="text-3xl font-bold text-slate-900">Administración de Horarios</h1>
            <p className="mt-2 text-sm text-slate-600">
              Gestiona los horarios y bloques de las disciplinas
            </p>
          </div>
        </div>

        <ScheduleManager />
      </div>
    </div>
  );
}
