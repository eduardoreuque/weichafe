import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import type { SessionUser } from "@/lib/auth";

/**
 * Menú de navegación global.
 *
 * Antes cada página tenía sus propios botones sueltos y no existía una forma
 * rápida de saltar entre secciones. Este componente centraliza la navegación:
 * muestra los accesos de operación para todos y los de administración solo a ADMIN.
 */

const MAIN_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/alumnos", label: "Alumnos" },
];

const ADMIN_LINKS = [
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/pagos-por-fecha", label: "Pagos por fecha" },
  { href: "/admin/pagos-por-horario", label: "Pagos por horario" },
  { href: "/admin/alumnos-por-horario", label: "Alumnos por horario" },
  { href: "/admin/horarios", label: "Horarios" },
  { href: "/admin", label: "Usuarios" },
];

export function AppNav({ session, active }: { session: SessionUser; active?: string }) {
  const links = session.role === "ADMIN" ? [...MAIN_LINKS, ...ADMIN_LINKS] : MAIN_LINKS;

  const isActive = (href: string) => {
    if (!active) return false;
    if (href === "/") return active === "/";
    return active === href || active.startsWith(`${href}/`);
  };

  return (
    <nav className="sticky top-0 z-30 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="pl-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
          Weichafe
        </span>

        <div className="flex flex-1 flex-wrap items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive(link.href)
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-semibold text-slate-600 sm:inline">
            {session.name}
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                session.role === "ADMIN"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {session.role === "ADMIN" ? "Admin" : "Staff"}
            </span>
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
