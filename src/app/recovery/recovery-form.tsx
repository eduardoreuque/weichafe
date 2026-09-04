"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { recoverPasswordAction } from "./actions";

export function RecoveryForm() {
  const [state, formAction, isPending] = useActionState(recoverPasswordAction, null);

  return (
    <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white/90 p-8 shadow-xl">
      <div className="mb-6 flex flex-col items-center gap-3">
        <Image
          src="/weichafe.jpg"
          alt="Logo Equipo Weichafe"
          width={64}
          height={64}
          className="rounded-full border border-emerald-500/40 bg-slate-900 p-1"
        />
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Academia Weichafe
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Recuperar acceso
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Ingresa el código maestro y define una nueva contraseña.
          </p>
        </div>
      </div>

      {state?.ok === true ? (
        <div className="text-center">
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            ✓ Contraseña actualizada. Ya puedes iniciar sesión.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-80"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          {state?.ok === false && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-sm font-medium text-rose-700">
              {state.error}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="code" className="text-xs font-semibold text-slate-600">
              Código de recuperación
            </label>
            <input
              id="code"
              name="code"
              type="password"
              required
              autoComplete="off"
              placeholder="••••••••••••••••"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="newPassword" className="text-xs font-semibold text-slate-600">
              Nueva contraseña (mín. 6)
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-600">
              Repite la contraseña
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-60"
          >
            {isPending ? "Recuperando..." : "Cambiar contraseña"}
          </button>

          <Link
            href="/login"
            className="text-center text-xs font-semibold text-slate-500 hover:text-emerald-700"
          >
            ← Volver al inicio de sesión
          </Link>
        </form>
      )}
    </div>
  );
}