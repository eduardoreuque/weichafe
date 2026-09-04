import { isRecoveryEnabled } from "@/lib/recovery";
import { RecoveryForm } from "./recovery-form";

export default async function RecoveryPage() {
  // Si el administrador no configuró RECOVERY_CODE, la página no existe
  // (respuesta neutral para no revelar configuración del servidor).
  if (!isRecoveryEnabled()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_5%_10%,#f8f7ef_0,#e9f2ff_35%,#f2e7db_75%,#e8eceb_100%)] px-4">
        <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white/90 p-8 text-center shadow-xl">
          <p className="text-sm font-medium text-slate-600">
            Esta página no está disponible.
          </p>
          <a
            href="/login"
            className="mt-4 inline-block text-xs font-semibold text-emerald-700 hover:underline"
          >
            ← Volver al inicio de sesión
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_5%_10%,#f8f7ef_0,#e9f2ff_35%,#f2e7db_75%,#e8eceb_100%)] px-4">
      <RecoveryForm />
    </main>
  );
}