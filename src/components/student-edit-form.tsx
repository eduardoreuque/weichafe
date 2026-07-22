"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { updateStudentAction } from "@/app/actions";

type Schedule = {
  id: string;
  discipline: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  blockName: string;
};

type Student = {
  id: string;
  fullName: string;
  rut: string | null;
  birthDate: Date | string;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  district: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  photoUrl: string | null;
  isActive: boolean;
  scheduleId: string | null;
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student.photoUrl);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(data);
    } catch (error) {
      console.error("Error loading schedules:", error);
    }
  };

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Si se marcó para eliminar la foto
      if (removePhoto) {
        formData.set("photoUrl", "");
      } else if (photoFile) {
        // Si hay una nueva foto, subirla primero
        const uploadFormData = new FormData();
        uploadFormData.append("file", photoFile);
        
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });
        
        if (!uploadRes.ok) {
          throw new Error("Error al subir la foto");
        }
        
        const { url } = await uploadRes.json();
        formData.set("photoUrl", url);
      } else {
        formData.set("photoUrl", student.photoUrl || "");
      }

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
            defaultValue={new Date(student.birthDate).toISOString().split("T")[0]}
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
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Horarios asignados (opcional)
          </label>
          <select
            name="scheduleId"
            defaultValue={student.scheduleId || ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Sin horario asignado</option>
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.discipline} - {schedule.dayOfWeek} {schedule.startTime}-{schedule.endTime} ({schedule.blockName})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Selecciona el horario principal. El alumno puede asistir a múltiples horarios, pero este será su horario principal.
          </p>
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
            Foto del alumno
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          {photoPreview && !removePhoto && (
            <div className="mt-2 flex flex-col items-start gap-2">
              <img
                src={photoPreview}
                alt="Preview"
                className="h-32 w-32 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setRemovePhoto(true);
                  setPhotoPreview(null);
                  setPhotoFile(null);
                }}
                className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Eliminar foto
              </button>
            </div>
          )}
          {removePhoto && (
            <p className="mt-2 text-xs text-amber-700">La foto será eliminada al guardar.</p>
          )}
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