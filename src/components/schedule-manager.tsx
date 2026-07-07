"use client";

import { useState, useEffect } from "react";

interface Schedule {
  id: string;
  discipline: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  blockName: string;
  location?: string;
  isActive: boolean;
}

export function ScheduleManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    discipline: "MMA",
    customDiscipline: "",
    dayOfWeek: "LUNES",
    startTime: "17:00",
    endTime: "18:00",
    blockName: "",
    location: "",
    isActive: true,
  });

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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingSchedule ? "update" : "create";
    const disciplineValue = formData.discipline === "OTRO" ? formData.customDiscipline : formData.discipline;
    const schedule = editingSchedule 
      ? { ...formData, id: editingSchedule.id, discipline: disciplineValue }
      : { ...formData, discipline: disciplineValue };

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, schedule }),
      });

      if (res.ok) {
        await loadSchedules();
        resetForm();
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      discipline: schedule.discipline,
      customDiscipline: "",
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      blockName: schedule.blockName,
      location: schedule.location || "",
      isActive: schedule.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este horario?")) return;

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", schedule: { id } }),
      });

      if (res.ok) {
        await loadSchedules();
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      discipline: "MMA",
      customDiscipline: "",
      dayOfWeek: "LUNES",
      startTime: "17:00",
      endTime: "18:00",
      blockName: "",
      location: "",
      isActive: true,
    });
    setEditingSchedule(null);
    setShowForm(false);
  };

  const disciplines = ["MMA", "KICK", "BOXEO", "JIU_JITSU", "MUAY_THAI", "FUNCIONAL", "OTRO"];
  const days = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

  if (loading) {
    return <div className="p-4">Cargando horarios...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Gestión de Horarios</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {showForm ? "Cancelar" : "+ Nuevo Horario"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            {editingSchedule ? "Editar Horario" : "Nuevo Horario"}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Disciplina</label>
              <select
                value={formData.discipline}
                onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {disciplines.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {formData.discipline === "OTRO" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700">Nombre de la Disciplina</label>
                <input
                  type="text"
                  value={formData.customDiscipline}
                  onChange={(e) => setFormData({ ...formData, customDiscipline: e.target.value })}
                  placeholder="Ej: Karate, Taekwondo, etc."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700">Día</label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Hora Inicio</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Hora Fin</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Nombre del Bloque</label>
              <input
                type="text"
                value={formData.blockName}
                onChange={(e) => setFormData({ ...formData, blockName: e.target.value })}
                placeholder="Ej: Horario 1, Horario 2"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Ubicación (opcional)</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ej: Sala Principal, Mat"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {editingSchedule ? "Actualizar" : "Crear"} Horario
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className={`rounded-2xl border p-4 shadow-sm ${
              schedule.isActive ? "border-slate-200 bg-white" : "border-slate-300 bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{schedule.discipline}</h3>
                <p className="text-sm text-slate-600">{schedule.dayOfWeek}</p>
                <p className="text-sm font-semibold text-slate-700">
                  {schedule.startTime} - {schedule.endTime}
                </p>
                <p className="text-xs text-slate-500">{schedule.blockName}</p>
                {schedule.location && <p className="text-xs text-slate-500">📍 {schedule.location}</p>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(schedule)}
                  className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(schedule.id)}
                  className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}