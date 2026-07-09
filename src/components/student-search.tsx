"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function StudentSearch({ initialQuery }: { initialQuery: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative">
      <input
        type="search"
        defaultValue={initialQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Buscar por nombre, RUT o email..."
        className="w-full rounded-xl border border-slate-300 px-4 py-3 pl-12 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
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
    </div>
  );
}