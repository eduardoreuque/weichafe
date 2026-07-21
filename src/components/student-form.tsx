"use client";

import { FormEvent, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type StudentSubmitResult = { ok: true } | { ok: false; error: string };

interface Schedule {
  id: string;
  discipline: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  blockName: string;
  location?: string;
}

export function StudentForm() {
  const [state, setState] = useState<StudentSubmitResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    loadSchedules();
  }, []);

  async function handlePhotoUpload(file: File) {
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to server
    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });
      const result = await res.json();
      if (result.ok) {
        setUploadedPhotoUrl(result.url);
      } else {
        alert(result.error || "Error al subir la foto");
        setPhotoPreview(null);
      }
    } catch {
      alert("Error al subir la foto");
      setPhotoPreview(null);
    } finally {
      setIsUploading(false);
    }
  }

  const loadSchedules = async () => {
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(data);
    } catch (error) {
      console.error("Error loading schedules:", error);
    }
  };

  const toggleSchedule = (scheduleId: string) => {
    setSelectedSchedules((prev) =>
      prev.includes(scheduleId)
        ? prev.filter((id) => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setState(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: Record<string, unknown> = {
      fullName: formData.get("fullName"),
      birthDate: formData.get("birthDate"),
      rut: formData.get("rut"),
      email: formData.get("email"),
      whatsapp: formData.get("whatsapp"),
      address: formData.get("address"),
      district: formData.get("district"),
      emergencyContact: formData.get("emergencyContact"),
      emergencyPhone: formData.get("emergencyPhone"),
      notes: formData.get("notes"),
      photoUrl: uploadedPhotoUrl,
      isActive: formData.get("isActive") === "on",
      scheduleId: selectedSchedules.length > 0 ? selectedSchedules[0] : null,
      schedules: selectedSchedules,
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
        setSelectedSchedules([]);
        setPhotoPreview(null);
        setUploadedPhotoUrl(null);
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
        <input
          name="rut"
          placeholder="RUT (ej: 12.345.678-9)"
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
          name="emergencyContact"
          placeholder="Nombre contacto emergencia"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <input
          name="emergencyPhone"
          placeholder="Teléfono de emergencia"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        {/* Subir foto desde el equipo */}
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-500">Foto del alumno</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoUpload(file);
            }}
            className="w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
          />
          {isUploading && <p className="mt-1 text-xs text-slate-500">Subiendo imagen...</p>}
          {photoPreview && (
            <div className="mt-2 flex items-center gap-3">
              <Image
                src={photoPreview}
                alt="Preview"
                width={48}
                height={48}
                className="rounded-full border-2 border-slate-200 object-cover h-12 w-12"
              />
              <span className="text-xs text-emerald-700">Foto lista ✓</span>
            </div>
          )}
        </div>
        <textarea
          name="notes"
          placeholder="Observaciones"
          rows={2}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Alumno activo
        </label>

        {schedules.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Horarios de clases (selecciona los horarios a los que asistirá):
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {schedules.map((schedule) => (
                <label
                  key={schedule.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedSchedules.includes(schedule.id)}
                    onChange={() => toggleSchedule(schedule.id)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {schedule.discipline} - {schedule.blockName}
                    </p>
                    <p className="text-xs text-slate-600">
                      {schedule.dayOfWeek} | {schedule.startTime} - {schedule.endTime}
                    </p>
                    {schedule.location && (
                      <p className="text-xs text-slate-500">📍 {schedule.location}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
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