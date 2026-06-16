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

export function ClassForm({ students }: { students: StudentOption[] }) {
  const [state, setState] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const router = useRouter();

  const toggleDiscipline = (value: string) => {
    setSelectedDisciplines((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedDisciplines.length === 0) {
      setState({ ok: false, error: "Selecciona al menos una disciplina" });
      return;
    }
    setIsPending(true);
    setState(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: Record<string, unknown> = {
      studentId: formData.get("studentId"),
      attendeeName: formData.get("attendeeName"),
      disciplines: selectedDisciplines.join(","),
      classDate: formData.get("classDate"),
      amount: formData.get("amount"),
      paymentMethod: formData.get("paymentMethod"),
      notes: formData.get("notes"),
    };

    try {
      const response = await fetch("/api/daily-class-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { ok: boolean; error?: string };
      setState(result);

      if (result.ok) {
        setFormKey((k) => k + 1);
        setSelectedDisciplines([]);
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
      <h2 className="text-lg font-bold">Venta clase diaria</h2>

      {state?.ok === true && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          ✓ Clase registrada correctamente
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
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">Seleccionar alumno (o escribir nombre)</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
        <input
          name="attendeeName"
          placeholder="O nombre del asistente (si no está en la lista)"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />

        <fieldset className="border border-slate-200 rounded-xl p-3">
          <legend className="text-xs font-semibold text-slate-500 mb-2">Disciplinas *</legend>
          <div className="grid grid-cols-2 gap-2">
            {DISCIPLINE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDisciplines.includes(opt.value)}
                  onChange={() => toggleDiscipline(opt.value)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="text-xs text-slate-600">
          Fecha de clase *
          <input
            name="classDate"
            type="date"
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
          name="paymentMethod"
          required
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">Método de pago *</option>
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
        {isPending ? "Registrando..." : "Registrar clase"}
      </button>
    </form>
  );
}