"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      onClick={() => window.print()}
    >
      Imprimir
    </button>
  );
}
