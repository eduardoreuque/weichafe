import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/login/actions";
import { StudentEditForm } from "@/components/student-edit-form";
import { readFileSync } from "fs";
import { join } from "path";

const STUDENT_SCHEDULES_FILE = join(process.cwd(), "public", "student-schedules.json");

export default async function StudentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
  });

  const monthlyPayments = student
    ? await prisma.monthlyPayment.findMany({
        where: { studentId: id },
        orderBy: { monthCovered: "desc" },
        take: 10,
      })
    : [];

  const dailyClassSales = student
    ? await prisma.dailyClassSale.findMany({
        where: { studentId: id },
        orderBy: { classDate: "desc" },
        take: 10,
      })
    : [];

  // Obtener horarios del alumno
  let studentSchedules: any[] = [];
  try {
    const data = readFileSync(STUDENT_SCHEDULES_FILE, "utf-8");
    const allStudentSchedules = JSON.parse(data);
    const scheduleIds = allStudentSchedules[id] || [];
    
    // Obtener detalles de los horarios
    const schedulesData = readFileSync(join(process.cwd(), "public", "schedules.json"), "utf-8");
    const allSchedules = JSON.parse(schedulesData).schedules;
    studentSchedules = allSchedules.filter((s: any) => scheduleIds.includes(s.id));
  } catch (error) {
    console.error("Error loading student schedules:", error);
  }

  if (!student) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_5%_10%,#f8f7ef_0,#e9f2ff_35%,#f2e7db_75%,#e8eceb_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-lg backdrop-blur">
            <h1 className="text-2xl font-bold text-slate-900">Alumno no encontrado</h1>
            <Link href="/alumnos" className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Volver a la lista
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_5%_10%,#f8f7ef_0,#e9f2ff_35%,#f2e7db_75%,#e8eceb_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Image src="/weichafe.jpg" alt="Logo Equipo Weichafe" width={72} height={72} className="rounded-full border border-emerald-500/40 bg-slate-900 p-1" priority />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Academia Weichafe</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Editar Alumno</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/alumnos"
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Volver
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

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-900">Información del Alumno</h2>
      <StudentEditForm student={student} monthlyPayments={monthlyPayments} />
            </div>
          </div>

            <div className="space-y-6">
            <div className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-sm">
              <h3 className="mb-3 text-lg font-bold text-slate-900">Foto del Alumno</h3>
              {student.photoUrl ? (
                <div className="space-y-3">
                  <img
                    src={student.photoUrl}
                    alt={student.fullName}
                    className="h-48 w-48 rounded-full border-4 border-slate-200 object-cover"
                  />
                  <p className="text-xs text-slate-600 break-all">{student.photoUrl}</p>
                </div>
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-200 text-4xl font-bold text-slate-500">
                  {student.fullName.charAt(0)}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-2 font-bold text-slate-900">Últimos pagos</h3>
              {monthlyPayments.length === 0 ? (
                <p className="text-sm text-slate-600">Sin pagos registrados</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {monthlyPayments.slice(0, 5).map((payment: any) => (
                    <li key={payment.id} className="rounded-lg border border-slate-200 bg-white p-2">
                      <p className="font-medium">{payment.discipline}</p>
                      <p className="text-xs text-slate-600">${payment.amount.toLocaleString("es-CL")}</p>
                      {payment.receipt && (
                        <Link
                          href={`/comprobantes/${payment.receipt.id}`}
                          className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
                        >
                          Ver comprobante
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {studentSchedules.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="mb-3 font-bold text-slate-900">Horarios de Clases</h3>
                <div className="space-y-2">
                  {studentSchedules.map((schedule: any) => (
                    <div key={schedule.id} className="rounded-lg border border-emerald-200 bg-white p-3">
                      <p className="font-semibold text-sm text-slate-900">{schedule.discipline}</p>
                      <p className="text-xs text-slate-600">{schedule.dayOfWeek}</p>
                      <p className="text-xs font-semibold text-slate-700">
                        {schedule.startTime} - {schedule.endTime}
                      </p>
                      <p className="text-xs text-slate-500">{schedule.blockName}</p>
                      {schedule.location && <p className="text-xs text-slate-500">📍 {schedule.location}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
