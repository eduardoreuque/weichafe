import { StudentsByScheduleList } from "@/components/students-by-schedule-list";

export default function AlumnosPorHorarioPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Alumnos por Horario</h1>
          <p className="mt-2 text-sm text-slate-600">
            Busca y visualiza los alumnos inscritos en cada horario de clase
          </p>
        </div>

        <StudentsByScheduleList />
      </div>
    </div>
  );
}