import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/login/actions";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const query = params.q || "";
  
  const students = await prisma.student.findMany({
    where: query
      ? {
          OR: [
            { fullName: { contains: query } },
            { rut: { contains: query } },
            { email: { contains: query } },
            { whatsapp: { contains: query } },
          ],
        }
      : undefined,
    orderBy: {
      fullName: "asc",
    },
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
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Gestión de Alumnos</h1>
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              Listado de Alumnos ({students.length})
            </h2>
            {session.role === "ADMIN" && (
              <Link
                href="/alumnos/nuevo"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                + Nuevo Alumno
              </Link>
            )}
          </div>

          {/* Formulario de búsqueda simple */}
          <form action="/alumnos" method="GET" className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Buscar por nombre, RUT, email o WhatsApp..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Buscar
              </button>
              {query && (
                <Link
                  href="/alumnos"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Limpiar
                </Link>
              )}
            </div>
          </form>

          <div className="grid gap-4">
            {students.length === 0 ? (
              <p className="text-center text-sm text-slate-600">
                {query ? "No se encontraron alumnos con ese criterio." : "No se encontraron alumnos."}
              </p>
            ) : (
              students.map((student) => (
                <article
                  key={student.id}
                  className={`rounded-2xl border ${student.isActive ? "border-slate-200" : "border-amber-200 bg-amber-50/50"} bg-white p-4`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt={student.fullName}
                          width={64}
                          height={64}
                          className="rounded-full border-2 border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-500">
                          {student.fullName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          {student.fullName}
                          {!student.isActive && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Inactivo
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {student.rut && <span className="mr-3">RUT: {student.rut}</span>}
                        </p>
                        <p className="text-sm text-slate-600">
                          {student.email ?? "Sin email"}
                        </p>
                        <p className="text-sm text-slate-600">
                          WhatsApp: {student.whatsapp ?? "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/alumnos/${student.id}`}
                        className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        Ver/Editar
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}