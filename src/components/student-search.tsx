"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function StudentSearch({ initialQuery }: { initialQuery: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace, refresh } = useRouter();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("search") as string;

    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    replace(`${pathname}?${params.toString()}`);
    refresh();
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="search"
        name="search"
        defaultValue={initialQuery}
        placeholder="Buscar por nombre, RUT, email o WhatsApp..."
        className="w-full rounded-xl border border-slate-300 px-4 py-3 pl-12 pr-12 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />
      <svg
        className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <button
        type="submit"
        className="absolute right-2 top-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        Buscar
      </button>
    </form>
  );
}
