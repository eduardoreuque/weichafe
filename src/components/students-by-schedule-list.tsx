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
}

interface Student {
  id: string;
  fullName: string;
  rut: string | null;
  email: string | null;
  whatsapp: string | null;
  isActive: boolean;
  birthDate: string;
  address: string | null;
  district: string | null;
}

export function StudentsByScheduleList() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const disciplines = ["MMA", "KICK", "BOXEO", "JIU_JITSU", "MUAY_THAI", "FUNCIONAL", "OTRO"];
  const days = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

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

  const searchStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscipline || !selectedDay || !selectedTime) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("discipline", selectedDiscipline);
      params.append("dayOfWeek", selectedDay);
      params.append("startTime", selectedTime);

      const res = await fetch(`/api/students/by-schedule?${params}`);
      const data = await res.json();
      setStudents(data);
    } catch (error) {
      console.error("Error searching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTimes = () => {
    if (!selectedDiscipline || !selectedDay) return [];
    return schedules
      .filter((s) => s.discipline === selectedDiscipline && s.dayOfWeek === selectedDay)
      .map((s) => s.startTime);
  };

  const availableTimes = getAvailableTimes();

  const getScheduleInfo = () => {
    if (!selectedDiscipline || !selectedDay || !selectedTime) return null;
    return schedules.find(
      (s) => s.discipline === selectedDiscipline && s.dayOfWeek === selectedDay && s.startTime === selectedTime
    );
  };

  const scheduleInfo = getScheduleInfo();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Alumnos por Horario</h2>

      <form onSubmit={searchStudents} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Disciplina</label>
            <select
              value={selectedDiscipline}
              onChange={(e) => {
                setSelectedDiscipline(e.target.value);
                setSelectedTime("");
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Selecciona una disciplina</option>
              {disciplines.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Día</label>
            <select
              value={selectedDay}
              onChange={(e) => {
                setSelectedDay(e.target.value);
                setSelectedTime("");
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Selecciona un día</option>
              {days.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Hora</label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
              disabled={!selectedDiscipline || !selectedDay}
            >
              <option value="">Selecciona una hora</option>
              {availableTimes.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!selectedDiscipline || !selectedDay || !selectedTime || loading}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Buscando..." : "Buscar Alumnos"}
        </button>
      </form>

      {scheduleInfo && (
        <div className="rounded-2xl border border-slate-200 bg-blue-50 p-4">
          <h3 className="font-bold text-slate-900">{scheduleInfo.discipline}</h3>
          <p className="text-sm text-slate-600">
            {scheduleInfo.dayOfWeek} | {scheduleInfo.startTime} - {scheduleInfo.endTime}
          </p>
          <p className="text-sm text-slate-600">{scheduleInfo.blockName}</p>
          {scheduleInfo.location && <p className="text-xs text-slate-500">📍 {scheduleInfo.location}</p>}
        </div>
      )}

      {students.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {students.length} alumno(s) encontrado(s)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">RUT</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">WhatsApp</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Email</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Comuna</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{student.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{student.rut || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{student.whatsapp || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{student.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{student.district || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          student.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {student.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}