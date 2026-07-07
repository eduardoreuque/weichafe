import { ScheduleManager } from "@/components/schedule-manager";

export default function HorariosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Administración de Horarios</h1>
          <p className="mt-2 text-sm text-slate-600">
            Gestiona los horarios y bloques de las disciplinas
          </p>
        </div>

        <ScheduleManager />
      </div>
    </div>
  );
}