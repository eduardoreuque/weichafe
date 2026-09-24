import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/login/actions";

export default async function StudentsBySchedulePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  // Horarios desde la BD. Antes se leían de public/schedules.json, que se
  // resetea en cada deploy y no incluía los horarios creados desde el panel.
  const schedules = await prisma.schedule.findMany({
    where: { isActive: true },
    orderBy: [{ discipline: "asc" }, { startTime: "asc" }],
  });

  // Alumnos con horario asignado
  const studentsWithSchedule = await prisma.student.findMany({
    where: { scheduleId: { not: null } },
    orderBy: { fullName: "asc" },
  });

  const studentsBySchedule: Record<string, typeof studentsWithSchedule> = {};
  studentsWithSchedule.forEach((student) => {
    if (!student.scheduleId) return;
    if (!studentsBySchedule[student.scheduleId]) {
      studentsBySchedule[student.scheduleId] = [];
    }
    studentsBySchedule[student.scheduleId].push(student);
  });

  // Actividad: pagos y clases recientes, cada uno vinculado a su horario
  const [payments, classes] = await Promise.all([
    prisma.monthlyPayment.findMany({
      select: {
        id: true,
        scheduleId: true,
        monthCovered: true,
        status: true,
        amount: true,
        student: { select: { id: true, fullName: true, scheduleId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.dailyClassSale.findMany({
      select: {
        id: true,
        scheduleId: true,
        classDate: true,
        amount: true,
        attendeeName: true,
        student: { select: { id: true, fullName: true, scheduleId: true } },
      },
      orderBy: { classDate: "desc" },
      take: 300,
    }),
  ]);

  // Se agrupa por el horario del registro y, si no tiene, por el del alumno
  const paymentsBySchedule: Record<string, typeof payments> = {};
  payments.forEach((payment) => {
    const sid = payment.scheduleId || payment.student?.scheduleId || null;
    if (!sid) return;
    if (!paymentsBySchedule[sid]) {
      paymentsBySchedule[sid] = [];
    }
    paymentsBySchedule[sid].push(payment);
  });

  const classesBySchedule: Record<string, typeof classes> = {};
  classes.forEach((cls) => {
    const sid = cls.scheduleId || cls.student?.scheduleId || null;
    if (!sid) return;
    if (!classesBySchedule[sid]) {
      classesBySchedule[sid] = [];
    }
    classesBySchedule[sid].push(cls);
  });

  return (
    <main className="relative min-h-screen px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      {/* Fondo izquierdo - pegado al borde */}
      <div className="fixed left-0 top-0 h-screen w-1/3 opacity-100 pointer-events-none z-0">
        <img src="/1.png" alt="" className="h-full w-full object-contain" />
      </div>
      
      {/* Fondo derecho - pegado al borde */}
      <div className="fixed right-0 top-0 h-screen w-1/3 opacity-100 pointer-events-none z-0">
        <img src="/2.png" alt="" className="h-full w-full object-contain" />
      </div>
      
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/weichafe.jpg" alt="Logo Equipo Weichafe" width={72} height={72} className="rounded-full border border-emerald-500/40 bg-slate-900 p-1" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Academia Weichafe</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Alumnos por Horario</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <div className="text-right text-sm">
                <p className="font-semibold text-slate-700">{session.name}</p>
                <p className={`text-xs font-bold ${session.role === "ADMIN" ? "text-violet-600" : "text-slate-500"}`}>
                  {session.role === "ADMIN" ? "Administrador" : "Funcionario"}
                </p>
              </div>
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
        </header>

        <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-slate-900">
            Alumnos por Horario
          </h2>

          {schedules.length === 0 ? (
            <p className="text-center text-sm text-slate-600">
              No hay horarios configurados. Crea horarios en la sección de administración.
            </p>
          ) : (
            <div className="grid gap-6">
              {schedules.map((schedule) => {
                const scheduleStudents = studentsBySchedule[schedule.id] || [];
                const schedulePayments = paymentsBySchedule[schedule.id] || [];
                const scheduleClasses = classesBySchedule[schedule.id] || [];
                const totalStudents = scheduleStudents.length;

                return (
                  <div
                    key={schedule.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {schedule.discipline}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {schedule.dayOfWeek} • {schedule.startTime} - {schedule.endTime}
                        </p>
                        <p className="text-xs text-slate-500">{schedule.blockName}</p>
                        {schedule.location && (
                          <p className="text-xs text-slate-500">📍 {schedule.location}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          {totalStudents}
                        </p>
                        <p className="text-xs text-slate-600">alumnos</p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Alumnos asignados */}
                      <div className="rounded-xl bg-slate-50 p-4">
                        <h4 className="mb-2 text-sm font-semibold text-slate-700">
                          Alumnos asignados ({scheduleStudents.length})
                        </h4>
                        {scheduleStudents.length === 0 ? (
                          <p className="text-xs text-slate-500">Sin alumnos asignados</p>
                        ) : (
                          <div className="space-y-2">
                            {scheduleStudents.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center justify-between rounded-lg bg-white p-2"
                              >
                                <div className="flex items-center gap-2">
                                  {student.photoUrl ? (
                                    <img
                                      src={student.photoUrl}
                                      alt={student.fullName}
                                      width={32}
                                      height={32}
                                      className="rounded-full border border-slate-200 object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                                      {student.fullName.charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">
                                      {student.fullName}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                      {student.rut || "Sin RUT"}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                    student.isActive
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {student.isActive ? "Activo" : "Inactivo"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Mensualidades y clases */}
                      <div className="rounded-xl bg-slate-50 p-4">
                        <h4 className="mb-2 text-sm font-semibold text-slate-700">
                          Actividad reciente
                        </h4>
                        {schedulePayments.length === 0 && scheduleClasses.length === 0 ? (
                          <p className="text-xs text-slate-500">Sin actividad registrada</p>
                        ) : (
                          <div className="space-y-2">
                            {schedulePayments.slice(0, 3).map((payment) => (
                              <div
                                key={payment.id}
                                className="flex items-center justify-between rounded-lg bg-white p-2"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {payment.student?.fullName}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    {payment.monthCovered.toLocaleDateString("es-CL", {
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                    payment.status === "PAGADO"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : payment.status === "PENDIENTE"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {payment.status}
                                </span>
                              </div>
                            ))}
                            {scheduleClasses.slice(0, 3).map((cls) => (
                              <div
                                key={cls.id}
                                className="flex items-center justify-between rounded-lg bg-white p-2"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {cls.student?.fullName || cls.attendeeName}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    {cls.classDate.toLocaleDateString("es-CL", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </p>
                                </div>
                                <span className="text-xs font-semibold text-slate-600">
                                  ${cls.amount}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}