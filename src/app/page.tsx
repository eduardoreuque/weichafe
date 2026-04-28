import Image from "next/image";
import Link from "next/link";
import { Discipline, MonthlyStatus } from "@prisma/client";
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
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/login/actions";
import { StudentForm } from "@/components/student-form";
import { PaymentForm } from "@/components/payment-form";
import { ClassForm } from "@/components/class-form";

const monthlyFees = [
  { name: "Boxeo y MMA mujeres", amount: "$44.990" },
  { name: "MMA, BJJ y Kickboxing", amount: "$49.990" },
  { name: "MMA ninos", amount: "$39.990" },
  { name: "BJJ ninos", amount: "$39.990" },
  { name: "Matricula", amount: "$25.000" },
];

const schedules = [
  {
    discipline: "MMA",
    rows: [
      "Horario 1: Lunes, miercoles y viernes a las 17:00 hrs",
      "Horario 2: Lunes, miercoles y viernes a las 18:00 hrs",
      "Horario 3: Lunes, miercoles y viernes a las 19:00 hrs",
      "Horario 4: Lunes, miercoles y viernes a las 20:00 hrs",
      "Horario 5: Martes y jueves a las 08:00 y sabados a las 09:00",
      "Horario 6: Martes y jueves a las 20:15 y sabados a las 09:00",
      "Horario 7: Lunes, miercoles y viernes a las 21:15 (solo competidores)",
    ],
  },
  {
    discipline: "Brazilian Jiu Jitsu",
    rows: [
      "Horario 1: Lunes, miercoles y viernes a las 20:00 hrs",
      "Horario 2: Martes y jueves a las 18:00 hrs y sabados a las 10:15",
      "Horario 3: Martes y jueves a las 19:00 hrs y sabados a las 10:15",
      "Horario 4: Lunes, miercoles y viernes a las 18:00 hrs (solo mujeres)",
    ],
  },
  {
    discipline: "Kickboxing",
    rows: [
      "Horario 1: Lunes, miercoles y viernes a las 18:00 hrs",
      "Horario 2: Lunes, miercoles y viernes a las 19:00 hrs",
    ],
  },
  {
    discipline: "Boxeo",
    rows: [
      "Horario 1: Lunes, miercoles y viernes a las 17:00",
      "Horario 2: Lunes, miercoles y viernes a las 21:00",
    ],
  },
];

const contactInfo = {
  address: "Avenida Vicuna Mackenna 10688, La Florida, Region Metropolitana de Santiago, Chile",
  phoneLabel: "+56 9 4538 8812",
  phoneHref: "tel:+56945388812",
  mapsHref:
    "https://www.google.com/maps/search/?api=1&query=Avenida+Vicuna+Mackenna+10688,+La+Florida,+Region+Metropolitana+de+Santiago,+Chile",
  facebookHref: "https://www.facebook.com/eweichafe/",
  instagramHref: "https://www.instagram.com/equipoweichafe/",
};

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
  const session = await getSession();
  if (!session) redirect("/login");

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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Image src="/weichafe.jpg" alt="Logo Equipo Weichafe" width={84} height={84} className="rounded-full border border-emerald-500/40 bg-slate-900 p-1" priority />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Academia Weichafe</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Control de alumnos, mensualidades y comprobantes</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="font-semibold text-slate-700">{session.name}</p>
                <p className={`text-xs font-bold ${session.role === "ADMIN" ? "text-violet-600" : "text-slate-500"}`}>
                  {session.role === "ADMIN" ? "Administrador" : "Funcionario"}
                </p>
              </div>
              {session.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                >
                  Gestionar usuarios
                </Link>
              )}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            Registro con fecha de pago, disciplina pagada (MMA, Kick, Boxeo, Jiu Jitsu y más), alertas de meses saltados y ventas por clase diaria.
          </p>
        </header>

        <section className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Contacto Weichafe</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">Informacion de sede y redes</h2>
              <p className="mt-3 text-sm text-slate-700">{contactInfo.address}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <a
                  href={contactInfo.mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Ver ubicacion
                </a>
                <a
                  href={contactInfo.phoneHref}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  {contactInfo.phoneLabel}
                </a>
                <a
                  href={contactInfo.facebookHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  Facebook
                </a>
                <a
                  href={contactInfo.instagramHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-pink-300 bg-pink-50 px-3 py-2 font-semibold text-pink-700 transition-colors hover:bg-pink-100"
                >
                  Instagram
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
            <h2 className="text-xl font-bold">Valores mensuales</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {monthlyFees.map((fee) => (
                <li key={fee.name} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <span className="font-medium text-slate-700">{fee.name}</span>
                  <span className="font-bold text-slate-900">{fee.amount}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
            <h2 className="text-xl font-bold">Horarios por disciplina</h2>
            <div className="mt-3 space-y-3">
              {schedules.map((group) => (
                <div key={group.discipline} className="rounded-xl border border-slate-200 p-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">{group.discipline}</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {group.rows.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <StudentForm />
          <PaymentForm students={students.map((s) => ({ id: s.id, fullName: s.fullName }))} />
          <ClassForm students={students.map((s) => ({ id: s.id, fullName: s.fullName }))} />
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
          <h2 className="text-xl font-bold">Alumnos y estado de mensualidades</h2>
          <div className="mt-4 grid gap-4">
            {students.length === 0 ? <p className="text-sm text-slate-600">Aún no hay alumnos registrados.</p> : null}
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
