"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type StudentSubmitResult = { ok: true } | { ok: false; error: string };

export function StudentForm() {
  const [state, setState] = useState<StudentSubmitResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setState(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      fullName: formData.get("fullName"),
      birthDate: formData.get("birthDate"),
      email: formData.get("email"),
      whatsapp: formData.get("whatsapp"),
      address: formData.get("address"),
      district: formData.get("district"),
      emergencyPhone: formData.get("emergencyPhone"),
    };

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as StudentSubmitResult;
      setState(result);

      if (result.ok) {
        setFormKey((k) => k + 1);
        router.refresh();
      }
    } catch {
      setState({ ok: false, error: "No se pudo guardar el alumno. Intenta nuevamente." });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      key={formKey}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm"
    >
      <h2 className="text-lg font-bold">Nuevo alumno</h2>

      {state?.ok === true && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          ✓ Alumno guardado correctamente
        </p>
      )}
      {state?.ok === false && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {state.error}
        </p>
      )}

      <div className="mt-4 grid gap-3">
        <input
          name="fullName"
          required
          placeholder="Nombre completo *"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <label className="text-xs text-slate-600">
          Fecha nacimiento *
          <input
            name="birthDate"
            type="date"
            required
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </label>
        <input
          name="email"
          type="email"
          placeholder="Correo"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <input
          name="whatsapp"
          placeholder="WhatsApp"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <input
          name="address"
          placeholder="Dirección"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <input
          name="district"
          placeholder="Comuna"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <input
          name="emergencyPhone"
          placeholder="Teléfono de emergencia"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {isPending ? "Guardando..." : "Guardar alumno"}
      </button>
    </form>
  );
}
