import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

/**
 * Layout de la sección de administración.
 *
 * Centraliza dos cosas:
 *  1) El menú de navegación (antes cada página tenía solo un botón "Volver").
 *  2) La validación de rol ADMIN en el servidor para TODAS las rutas /admin/*,
 *     incluidas las páginas de cliente que solo validaban en el navegador.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <AppNav session={session} />
      </div>
      {children}
    </div>
  );
}
