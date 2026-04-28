import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "@/app/login/actions";
import { deleteUserAction } from "./actions";
import { CreateUserForm, DeleteUserButton } from "./user-forms";

export default async function AdminPage() {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  const roleLabel = (role: string) => (role === "ADMIN" ? "Administrador" : "Funcionario");
  const roleBadge = (role: string) =>
    role === "ADMIN"
      ? "rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700"
      : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_5%_10%,#f8f7ef_0,#e9f2ff_35%,#f2e7db_75%,#e8eceb_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {/* Header */}
        <header className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Image
                src="/weichafe.jpg"
                alt="Logo Equipo Weichafe"
                width={52}
                height={52}
                className="rounded-full border border-emerald-500/40 bg-slate-900 p-1"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Administración
                </p>
                <h1 className="text-xl font-black tracking-tight">Gestión de usuarios</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {session.name}{" "}
                <span className={roleBadge(session.role)}>{roleLabel(session.role)}</span>
              </span>
              <Link
                href="/"
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                ← Volver al panel
              </Link>
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

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Lista de usuarios */}
          <section className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm">
            <h2 className="text-lg font-bold">Usuarios registrados</h2>
            <ul className="mt-4 space-y-3">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={roleBadge(user.role)}>{roleLabel(user.role)}</span>
                    <DeleteUserButton
                      userId={user.id}
                      isSelf={user.id === session.id}
                      deleteAction={deleteUserAction}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Crear usuario */}
          <CreateUserForm />
        </div>
      </div>
    </main>
  );
}
