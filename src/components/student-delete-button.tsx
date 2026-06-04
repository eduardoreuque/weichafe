"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteResult = { ok: true } | { ok: false; error: string };

type StudentDeleteButtonProps = {
  studentId: string;
  studentName: string;
};

export function StudentDeleteButton({ studentId, studentName }: StudentDeleteButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      `Se eliminara el alumno ${studentName} y su historial asociado. Esta accion no se puede deshacer.`
    );

    if (!confirmed) return;

    setIsPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/students?id=${encodeURIComponent(studentId)}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as DeleteResult;

      if (!response.ok || !result.ok) {
        setError(result.ok ? "No se pudo eliminar el alumno." : result.error);
        return;
      }

      router.refresh();
    } catch {
      setError("No se pudo eliminar el alumno. Intenta nuevamente.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Eliminando..." : "Eliminar alumno"}
      </button>
      {error ? <p className="mt-1 text-xs font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}
