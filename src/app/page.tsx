import Link from "next/link";
import { Discipline, MonthlyStatus, PaymentMethod } from "@prisma/client";
import { createDailyClassSale, createMonthlyPayment, createStudent } from "./actions";
import {
  calculateAge,
  detectSkippedMonthsByDiscipline,
  disciplineLabel,
  paymentMethodLabel,
  statusLabel,
  toDateLabel,
  toMonthLabel,
} from "@/lib/helpers";
import { prisma } from "@/lib/prisma";

const disciplines: Discipline[] = [
  "MMA",
  "KICK",
  "BOXEO",
  "JIU_JITSU",
  "MUAY_THAI",
  "FUNCIONAL",
  "OTRO",
];

const paymentMethods: PaymentMethod[] = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA_DEBITO",
  "TARJETA_CREDITO",
];

const monthlyStatuses: MonthlyStatus[] = ["PAGADO", "PENDIENTE", "SALTADO"];

function statusClass(status: MonthlyStatus): string {
  switch (status) {
    case "PAGADO":
      return "bg-emerald-100 text-emerald-800";
    case "PENDIENTE":
      return "bg-amber-100 text-amber-800";
    case "SALTADO":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function Home() {
  const students = await prisma.student.findMany({
    include: {
      monthlyPayments: {
        orderBy: {
          monthCovered: "desc",
        },
      },
      dailyClassSales: {
        orderBy: {
          classDate: "desc",
        },
      },
      receipts: {
        orderBy: {
          issuedAt: "desc",
        },
      },
    },
    orderBy: {
      fullName: "asc",
    },
  });

  const receipts = await prisma.receipt.findMany({
    orderBy: {
      issuedAt: "desc",
    },
    include: {
      student: true,
    },
    take: 20,
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_5%_10%,#f8f7ef_0,#e9f2ff_35%,#f2e7db_75%,#e8eceb_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-lg backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Academia Weichafe</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Control de alumnos, mensualidades y comprobantes</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            Registro con fecha de pago, disciplina pagada (MMA, Kick, Boxeo, Jiu Jitsu y mas), alertas de meses saltados y ventas por clase diaria.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <form action={createStudent} className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
            <h2 className="text-lg font-bold">Nuevo alumno</h2>
            <div className="mt-4 grid gap-3">
              <input name="fullName" required placeholder="Nombre completo" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <label className="text-xs text-slate-600">
                Fecha nacimiento
                <input name="birthDate" type="date" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <input name="email" type="email" placeholder="Correo" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="whatsapp" placeholder="WhatsApp" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="address" placeholder="Direccion" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="district" placeholder="Comuna" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input name="emergencyPhone" placeholder="Telefono de emergencia" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <button className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Guardar alumno</button>
          </form>

          <form action={createMonthlyPayment} className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
            <h2 className="text-lg font-bold">Registrar mensualidad</h2>
            <div className="mt-4 grid gap-3">
              <select name="studentId" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">Selecciona alumno</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
              <select name="discipline" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                {disciplines.map((discipline) => (
                  <option key={discipline} value={discipline}>
                    {disciplineLabel(discipline)}
                  </option>
                ))}
              </select>
              <label className="text-xs text-slate-600">
                Mensualidad que paga
                <input name="monthCovered" type="month" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <select name="status" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                {monthlyStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
              <input name="amount" type="number" min={0} placeholder="Monto" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <label className="text-xs text-slate-600">
                Fecha pago
                <input name="paidAt" type="date" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <select name="paymentMethod" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">Metodo de pago (si pagado)</option>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {paymentMethodLabel(method)}
                  </option>
                ))}
              </select>
              <input name="notes" placeholder="Notas" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <button className="mt-4 w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Guardar mensualidad</button>
          </form>

          <form action={createDailyClassSale} className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
            <h2 className="text-lg font-bold">Venta por clase diaria</h2>
            <div className="mt-4 grid gap-3">
              <select name="studentId" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">Sin alumno asociado</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
              <input name="attendeeName" placeholder="Nombre asistente (opcional)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <select name="discipline" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                {disciplines.map((discipline) => (
                  <option key={discipline} value={discipline}>
                    {disciplineLabel(discipline)}
                  </option>
                ))}
              </select>
              <label className="text-xs text-slate-600">
                Fecha clase
                <input name="classDate" type="date" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <input name="amount" type="number" min={0} placeholder="Monto clase" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <select name="paymentMethod" required className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {paymentMethodLabel(method)}
                  </option>
                ))}
              </select>
              <input name="notes" placeholder="Notas" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <button className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Guardar clase diaria</button>
          </form>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-xl font-bold">Alumnos y estado de mensualidades</h2>
          <div className="mt-4 grid gap-4">
            {students.length === 0 ? <p className="text-sm text-slate-600">Aun no hay alumnos registrados.</p> : null}
            {students.map((student) => {
              const skippedByDiscipline = detectSkippedMonthsByDiscipline(student.monthlyPayments);

              return (
                <article key={student.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-lg font-bold">{student.fullName}</h3>
                      <p className="text-sm text-slate-600">
                        Nacimiento: {toDateLabel(student.birthDate)} ({calculateAge(student.birthDate)} anos)
                      </p>
                    </div>
                    <div className="text-xs text-slate-600">
                      <p>Correo: {student.email ?? "-"}</p>
                      <p>WhatsApp: {student.whatsapp ?? "-"}</p>
                      <p>Direccion: {student.address ?? "-"}</p>
                      <p>Comuna: {student.district ?? "-"}</p>
                      <p>Emergencia: {student.emergencyPhone ?? "-"}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-slate-700">Registro de mensualidades</h4>
                      <ul className="space-y-2 text-sm">
                        {student.monthlyPayments.slice(0, 8).map((payment) => (
                          <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-2">
                            <div>
                              <p className="font-medium">
                                {disciplineLabel(payment.discipline)} - {toMonthLabel(payment.monthCovered)}
                              </p>
                              <p className="text-xs text-slate-600">
                                Fecha pago: {payment.paidAt ? toDateLabel(payment.paidAt) : "Sin pago"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">${payment.amount.toLocaleString("es-CL")}</p>
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(payment.status)}`}>
                                {statusLabel(payment.status)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-slate-700">Alertas de meses saltados</h4>
                      <div className="space-y-2">
                        {Object.keys(skippedByDiscipline).length === 0 ? (
                          <p className="text-sm text-slate-600">Sin historial suficiente.</p>
                        ) : (
                          Object.entries(skippedByDiscipline).map(([discipline, gaps]) => (
                            <div key={discipline} className="rounded-xl border border-slate-200 p-2 text-sm">
                              <p className="font-medium">{disciplineLabel(discipline as Discipline)}</p>
                              {gaps.length > 0 ? (
                                <p className="mt-1 text-rose-700">Faltan registros en: {gaps.join(", ")}</p>
                              ) : (
                                <p className="mt-1 text-emerald-700">Sin meses faltantes detectados.</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
            <h2 className="text-xl font-bold">Comprobantes emitidos</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {receipts.length === 0 ? <li className="text-slate-600">Aun no hay comprobantes.</li> : null}
              {receipts.map((receipt) => (
                <li key={receipt.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                  <div>
                    <p className="font-medium">{receipt.student.fullName}</p>
                    <p className="text-xs text-slate-600">{receipt.description}</p>
                    <p className="text-xs text-slate-500">{toDateLabel(receipt.issuedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${receipt.amount.toLocaleString("es-CL")}</p>
                    <Link href={`/comprobantes/${receipt.id}`} className="text-xs font-semibold text-indigo-700">
                      Ver comprobante
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
            <h2 className="text-xl font-bold">Ventas por clase diaria</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {students.flatMap((student) => student.dailyClassSales).length === 0 ? (
                <li className="text-slate-600">No hay ventas de clases diarias aun.</li>
              ) : null}
              {students
                .flatMap((student) =>
                  student.dailyClassSales.map((sale) => ({
                    ...sale,
                    studentName: student.fullName,
                  })),
                )
                .sort((a, b) => b.classDate.getTime() - a.classDate.getTime())
                .slice(0, 20)
                .map((sale) => (
                  <li key={sale.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                    <div>
                      <p className="font-medium">{sale.studentName}</p>
                      <p className="text-xs text-slate-600">
                        {disciplineLabel(sale.discipline)} - {toDateLabel(sale.classDate)}
                      </p>
                      <p className="text-xs text-slate-500">{paymentMethodLabel(sale.paymentMethod)}</p>
                    </div>
                    <p className="font-semibold">${sale.amount.toLocaleString("es-CL")}</p>
                  </li>
                ))}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
