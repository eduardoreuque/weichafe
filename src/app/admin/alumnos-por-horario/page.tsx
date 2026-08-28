import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/login/actions";
import { readFileSync } from "fs";
import { join } from "path";

const PAYMENT_SCHEDULES_FILE = join(process.cwd(), "public", "payment-schedules.json");
const CLASS_SCHEDULES_FILE = join(process.cwd(), "public", "class-schedules.json");

export default async function StudentsBySchedulePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  // Cargar todas las relaciones de horarios
  let paymentSchedules: Record<string, string> = {};
  let classSchedules: Record<string, string> = {};

  try {
    const paymentData = readFileSync(PAYMENT_SCHEDULES_FILE, "utf-8");
    paymentSchedules = JSON.parse(paymentData);
  } catch (error) {
    console.error("Error loading payment schedules:", error);
  }

  try {
    const classData = readFileSync(CLASS_SCHEDULES_FILE, "utf-8");
    classSchedules = JSON.parse(classData);
  } catch (error) {
    console.error("Error loading class schedules:", error);
  }

  // Obtener todos los horarios desde el archivo JSON
  let schedules: any[] = [];
  try {
    const schedulesData = readFileSync(join(process.cwd(), "public", "schedules.json"), "utf-8");
    const schedulesJson = JSON.parse(schedulesData);
    schedules = Object.values(schedulesJson).filter((s: any) => s.isActive !== false);
    schedules.sort((a: any, b: any) => {
      const dayOrder = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
      const dayCompare = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
      if (dayCompare !== 0) return dayCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  } catch (error) {
    console.error("Error loading schedules:", error);
  }

  // Cargar horarios de alumnos
  let studentSchedulesData: Record<string, string[]> = {};
  try {
    const studentSchedulesFile = readFileSync(join(process.cwd(), "public", "student-schedules.json"), "utf-8");
    studentSchedulesData = JSON.parse(studentSchedulesFile);
  } catch (error) {
    console.error("Error loading student schedules:", error);
  }

  // Obtener todos los alumnos con horario asignado
  const studentsWithSchedule = await prisma.student.findMany({
    where: { scheduleId: { not: null } },
    include: { 
      monthlyPayments: { orderBy: { monthCovered: "desc" }, take: 5 },
      dailyClassSales: { orderBy: { classDate: "desc" }, take: 5 }
    },
  });

  // Agrupar alumnos por horario (tanto scheduleId principal como horarios del JSON)
  const studentsBySchedule: Record<string, typeof studentsWithSchedule> = {};
  studentsWithSchedule.forEach((student) => {
    // Agregar por scheduleId principal
    if (student.scheduleId) {
      if (!studentsBySchedule[student.scheduleId]) {
        studentsBySchedule[student.scheduleId] = [];
      }
      if (!studentsBySchedule[student.scheduleId].find(s => s.id === student.id)) {
        studentsBySchedule[student.scheduleId].push(student);
      }
    }
    
    // Agregar por horarios del JSON
    const studentScheduleIds = studentSchedulesData[student.id] || [];
    studentScheduleIds.forEach(scheduleId => {
      if (!studentsBySchedule[scheduleId]) {
        studentsBySchedule[scheduleId] = [];
      }
      if (!studentsBySchedule[scheduleId].find(s => s.id === student.id)) {
        studentsBySchedule[scheduleId].push(student);
      }
    });
  });

  // Obtener todos los pagos con sus horarios
  const payments = await prisma.monthlyPayment.findMany({
    where: {
      id: { in: Object.keys(paymentSchedules) },
    },
    include: { student: true },
  });

  // Obtener todas las clases con sus horarios
  const classes = await prisma.dailyClassSale.findMany({
    where: {
      id: { in: Object.keys(classSchedules) },
    },
    include: { student: true },
  });

  // Agrupar pagos por horario
  const paymentsBySchedule: Record<string, typeof payments> = {};
  payments.forEach((payment) => {
    const scheduleId = paymentSchedules[payment.id];
    if (scheduleId) {
      if (!paymentsBySchedule[scheduleId]) {
        paymentsBySchedule[scheduleId] = [];
      }
      paymentsBySchedule[scheduleId].push(payment);
    }
  });

  // Agrupar clases por horario
  const classesBySchedule: Record<string, typeof classes> = {};
  classes.forEach((cls) => {
    const scheduleId = classSchedules[cls.id];
    if (scheduleId) {
      if (!classesBySchedule[scheduleId]) {
        classesBySchedule[scheduleId] = [];
      }
      classesBySchedule[scheduleId].push(cls);
    }
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