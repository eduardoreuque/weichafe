import { PaymentSearchBySchedule } from "@/components/payment-search-by-schedule";

export default function PagosPorHorarioPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Pagos por Horario</h1>
          <p className="mt-2 text-sm text-slate-600">
            Busca y visualiza los pagos de los alumnos por horario de clase
          </p>
        </div>

        <PaymentSearchBySchedule />
      </div>
    </div>
  );
}