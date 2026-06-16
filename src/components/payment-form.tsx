"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const DISCIPLINE_OPTIONS = [
  { value: "MMA", label: "MMA" },
  { value: "JIU_JITSU", label: "Jiu Jitsu" },
  { value: "KICK", label: "Kickboxing" },
  { value: "BOXEO", label: "Boxeo" },
  { value: "MUAY_THAI", label: "Muay Thai" },
  { value: "FUNCIONAL", label: "Funcional" },
  { value: "OTRO", label: "Otra" },
];

type StudentOption = { id: string; fullName: string };

export function PaymentForm({ students }: { students: StudentOption[] }) {
  const [state, setState] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setState(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/monthly-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: formData.get("studentId"),
          discipline: formData.get("discipline"),
          monthCovered: formData.get("monthCovered"),
          amount: formData.get("amount"),
          status: formData.get("status"),
          paidAt: formData.get("paidAt") || undefined,
          paymentMethod: formData.get("paymentMethod") || undefined,
          notes: formData.get("notes") || undefined,
        }),
      });

      const result = await response.json();
      setState(result);

      if (result.ok) {
        setFormKey((k) => k + 1);
        router.refresh();
      }
    } catch {
      setState({ ok: false, error: "No se pudo registrar. Intenta nuevamente." });
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
      <h2 className="text-lg font-bold">Registrar mensualidad</h2>

      {state?.ok === true && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          ✓ Mensualidad registrada correctamente
        </p>
      )}
      {state?.ok === false && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {state.error}
        </p>
      )}

      <div className="mt-4 grid gap-3">
        <select
          name="studentId"
          required
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">Seleccionar alumno *</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>

        <select
          name="discipline"
          required
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">Disciplina *</option>
          {DISCIPLINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="text-xs text-slate-600">
          Mes que cubre *
          <input
            name="monthCovered"
            type="month"
            required
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </label>

        <input
          name="amount"
          type="number"
          required
          placeholder="Monto *"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />

        <select
          name="status"
          required
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        >
          <option value="PAGADO">Pagado</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="SALTADO">Saltado</option>
        </select>

        <label className="text-xs text-slate-600">
          Fecha de pago
          <input
            name="paidAt"
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </label>

        <select
          name="paymentMethod"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">Método de pago</option>
          <option value="EFECTIVO">Efectivo</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="TARJETA_DEBITO">Tarjeta Débito</option>
          <option value="TARJETA_CREDITO">Tarjeta Crédito</option>
        </select>

        <input
          name="notes"
          placeholder="Notas (opcional)"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {isPending ? "Registrando..." : "Registrar mensualidad"}
      </button>
    </form>
  );
}