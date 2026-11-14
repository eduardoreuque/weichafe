"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { updateStudentAction } from "@/app/actions";

type Schedule = {
  id: string;
  discipline: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  blockName: string;
  isActive?: boolean;
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
  scheduleIds = [],
  monthlyPayments = [] 
}: { 
  student: Student; 
  /** Horarios a los que el alumno está asignado actualmente. */
  scheduleIds?: string[];
  monthlyPayments?: any[]; 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student.photoUrl);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>(scheduleIds);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading schedules:", error);
    }
  };

  const toggleSchedule = (scheduleId: string) => {
    setSelectedSchedules((prev) =>
      prev.includes(scheduleId) ? prev.filter((id) => id !== scheduleId) : [...prev, scheduleId]
    );
  };

  // Se ofrecen los horarios activos y, además, los que el alumno ya tiene
  // aunque estén desactivados (para poder quitarlos).
  const selectableSchedules = schedules.filter(
    (s) => s.isActive !== false || selectedSchedules.includes(s.id)
  );

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

  // Se usa onSubmit (y no action) a propósito: con action, React reinicia el
  // formulario al terminar y las casillas de horarios volvían a mostrar los
  // valores iniciales aunque lo guardado fuera otra cosa.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
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
    <form onSubmit={handleSubmit} className="space-y-4">
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
            defaultValue={student.birthDate ? new Date(student.birthDate).toISOString().split("T")[0] : ""}
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
          {/* Lo que se envía sale del estado, no de las casillas: si la lista de
              horarios aún no carga, los horarios actuales del alumno no se pierden. */}
          {selectedSchedules.map((id) => (
            <input key={id} type="hidden" name="scheduleIds" value={id} />
          ))}
          <p className="mb-1 block text-sm font-semibold text-slate-700">
            Horarios asignados (opcional)
          </p>
          <p className="mb-2 text-xs text-slate-500">
            Marca todos los horarios a los que asiste. Puede ser más de una disciplina y más de un bloque.
          </p>
          {selectableSchedules.length === 0 ? (
            <p className="rounded-xl border border-slate-200 p-3 text-xs text-slate-500">
              No hay horarios disponibles.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {selectableSchedules.map((schedule) => (
                <label
                  key={schedule.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedSchedules.includes(schedule.id)}
                    onChange={() => toggleSchedule(schedule.id)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-800">
                    <span className="font-semibold">{schedule.discipline}</span> - {schedule.dayOfWeek}{" "}
                    {schedule.startTime}-{schedule.endTime} ({schedule.blockName})
                    {schedule.isActive === false && (
                      <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Desactivado
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
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