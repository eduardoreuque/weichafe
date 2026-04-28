"use client";

import { useActionState, useEffect, useState } from "react";
import { createUserAction } from "./actions";
import { ActionResult } from "@/app/actions";

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createUserAction, null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.ok === true) setFormKey((k) => k + 1);
  }, [state]);

  return (
    <form
      key={formKey}
      action={formAction}
      className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm"
    >
      <h2 className="text-lg font-bold">Crear nuevo usuario</h2>

      {state?.ok === true && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          ✓ Usuario creado correctamente
        </p>
      )}
      {state?.ok === false && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {state.error}
        </p>
      )}

      <div className="mt-4 grid gap-3">
        <input
          name="name"
          required
          placeholder="Nombre completo *"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Correo electrónico *"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Contraseña (mín. 6 caracteres) *"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
        <select
          name="role"
          required
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        >
          <option value="STAFF">Funcionario (acceso básico)</option>
          <option value="ADMIN">Administrador (acceso total)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {isPending ? "Creando..." : "Crear usuario"}
      </button>
    </form>
  );
}

interface DeleteUserButtonProps {
  userId: string;
  isSelf: boolean;
  deleteAction: (userId: string) => Promise<void>;
}

export function DeleteUserButton({ userId, isSelf, deleteAction }: DeleteUserButtonProps) {
  const [state, setState] = useState<ActionResult | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    setIsPending(true);
    try {
      await deleteAction(userId);
    } catch {
      setState({ ok: false, error: "No se pudo eliminar" });
    } finally {
      setIsPending(false);
    }
  }

  if (isSelf) {
    return <span className="text-xs text-slate-400">(tu cuenta)</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {state?.ok === false && <span className="text-xs text-rose-600">{state.error}</span>}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition-opacity hover:bg-rose-200 disabled:opacity-50"
      >
        {isPending ? "..." : "Eliminar"}
      </button>
    </div>
  );
}
