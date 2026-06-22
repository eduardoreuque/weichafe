"use client";

import { useState } from "react";
import Link from "next/link";
import { updateStudentAction } from "@/app/actions";

type Student = {
  id: string;
  fullName: string;
  rut: string | null;
  birthDate: string;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  district: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  photoUrl: string | null;
  isActive: boolean;
};

export function StudentEditForm({ 
  student, 
  monthlyPayments = [] 
}: { 
  student: Student; 
  monthlyPayments?: any[]; 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateStudentAction(student.id, formData);
      if (result.ok === false) {
        setError(result.error);
      } else {
        setSuccess("Alumno actualizado correctamente");
      }
    } catch (e) {
      setError("Error al actualizar el alumno");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Nombre completo *
          </label>
          <input
            type="text"
            name="fullName"
            required
            defaultValue={student.fullName}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">RUT</label>
          <input
            type="text"
            name="rut"
            defaultValue={student.rut ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Fecha de nacimiento *
          </label>
          <input
            type="date"
            name="birthDate"
            required
            defaultValue={student.birthDate.split("T")[0]}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
          <input
            type="email"
            name="email"
            defaultValue={student.email ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">WhatsApp</label>
          <input
            type="tel"
            name="whatsapp"
            defaultValue={student.whatsapp ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-700">Dirección</label>
          <input
            type="text"
            name="address"
            defaultValue={student.address ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Comuna</label>
          <input
            type="text"
            name="district"
            defaultValue={student.district ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Contacto emergencia
          </label>
          <input
            type="text"
            name="emergencyContact"
            defaultValue={student.emergencyContact ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Teléfono emergencia
          </label>
          <input
            type="tel"
            name="emergencyPhone"
            defaultValue={student.emergencyPhone ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            URL de foto
          </label>
          <input
            type="url"
            name="photoUrl"
            defaultValue={student.photoUrl ?? ""}
            placeholder="https://ejemplo.com/foto.jpg"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Observaciones
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={student.notes ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={student.isActive}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-semibold text-slate-700">Alumno activo</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </button>
        <Link
          href="/alumnos"
          className="rounded-xl border border-slate-300 bg-slate-50 px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}