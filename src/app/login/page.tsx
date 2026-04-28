"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import Image from "next/image";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_5%_10%,#f8f7ef_0,#e9f2ff_35%,#f2e7db_75%,#e8eceb_100%)] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white/90 p-8 shadow-xl backdrop-blur">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/weichafe.jpg"
            alt="Logo Equipo Weichafe"
            width={72}
            height={72}
            className="rounded-full border border-emerald-500/40 bg-slate-900 p-1"
            priority
          />
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Academia Weichafe
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Iniciar sesión
            </h1>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          {state?.ok === false && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-sm font-medium text-rose-700">
              {state.error}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-semibold text-slate-600">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="usuario@weichafe.cl"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-slate-600">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-60"
          >
            {isPending ? "Verificando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Acceso restringido al personal autorizado
        </p>
      </div>
    </main>
  );
}
