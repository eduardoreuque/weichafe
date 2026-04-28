"use client";

import { FormEvent, useState } from "react";
import { disciplineLabel, paymentMethodLabel, statusLabel } from "@/lib/helpers";
import { useRouter } from "next/navigation";

type SubmitResult = { ok: true } | { ok: false; error: string };

const disciplines = ["MMA", "KICK", "BOXEO", "JIU_JITSU", "MUAY_THAI", "FUNCIONAL", "OTRO"] as const;
const paymentMethods = ["EFECTIVO", "TRANSFERENCIA", "TARJETA_DEBITO", "TARJETA_CREDITO"] as const;
const monthlyStatuses = ["PAGADO", "PENDIENTE", "SALTADO"] as const;

interface StudentOption {
  id: string;
  fullName: string;
}

interface PaymentFormProps {
  students: StudentOption[];
}

export function PaymentForm({ students }: PaymentFormProps) {
  const [state, setState] = useState<SubmitResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setState(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      studentId: formData.get("studentId"),
      discipline: formData.get("discipline"),
      monthCovered: formData.get("monthCovered"),
      status: formData.get("status"),
      amount: formData.get("amount"),
      paidAt: formData.get("paidAt"),
      paymentMethod: formData.get("paymentMethod"),
      notes: formData.get("notes"),
    };

    try {
      const response = await fetch("/api/monthly-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as SubmitResult;
      setState(result);

      if (result.ok) {
        setFormKey((k) => k + 1);
        router.refresh();
      }
    } catch {
      setState({ ok: false, error: "No se pudo registrar la mensualidad. Intenta nuevamente." });
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
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Selecciona alumno *</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>

        <select
          name="discipline"
          required
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          {disciplines.map((d) => (
            <option key={d} value={d}>
              {disciplineLabel(d)}
            </option>
          ))}
        </select>

        <label className="text-xs text-slate-600">
          Mensualidad que paga *
          <input
            name="monthCovered"
            type="month"
            required
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>

        <select
          name="status"
          required
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          {monthlyStatuses.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>

        <input
          name="amount"
          type="number"
          min={0}
          placeholder="Monto"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />

        <label className="text-xs text-slate-600">
          Fecha pago
          <input
            name="paidAt"
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>

        <select
          name="paymentMethod"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Método de pago (si pagado)</option>
          {paymentMethods.map((m) => (
            <option key={m} value={m}>
              {paymentMethodLabel(m)}
            </option>
          ))}
        </select>

        <input
          name="notes"
          placeholder="Notas"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {isPending ? "Guardando..." : "Guardar mensualidad"}
      </button>
    </form>
  );
}
