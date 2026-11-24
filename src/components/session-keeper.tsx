"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SESSION_CHECK_EVENT } from "@/lib/session-client";

const PUBLIC_PATHS = ["/login", "/recovery"];
const MIN_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Mantiene la sesión mientras se usa el sistema y avisa cuando venció.
 *
 * Consulta /api/auth/me (que renueva la sesión) al cargar la página, al volver a
 * la pestaña y con la actividad del usuario, como máximo cada 5 minutos. Si la
 * sesión venció muestra un aviso con el inicio de sesión en otra pestaña, para
 * no perder lo escrito en los formularios. Antes una pestaña abierta por días
 * se veía normal y fallaba al guardar con un error genérico.
 */
export function SessionKeeper() {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const [expired, setExpired] = useState(false);
  const expiredRef = useRef(false);
  const lastCheck = useRef(0);
  const checking = useRef(false);

  const check = useCallback(async (force: boolean) => {
    if (checking.current) return;
    if (!force && Date.now() - lastCheck.current < MIN_CHECK_INTERVAL_MS) return;
    checking.current = true;
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      lastCheck.current = Date.now();
      if (response.status === 401 || response.ok) {
        expiredRef.current = response.status === 401;
        setExpired(expiredRef.current);
      }
    } catch {
      // Sin conexión no se puede saber si la sesión sigue vigente.
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    if (isPublic) return;

    // Con el aviso visible se comprueba sin esperar: el usuario puede haber
    // iniciado sesión en otra pestaña.
    const onActivity = () => void check(expiredRef.current);
    const onVisible = () => {
      if (document.visibilityState === "visible") onActivity();
    };
    const onRequested = () => void check(true);

    onActivity();
    window.addEventListener("focus", onActivity);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(SESSION_CHECK_EVENT, onRequested);
    return () => {
      window.removeEventListener("focus", onActivity);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(SESSION_CHECK_EVENT, onRequested);
    };
  }, [isPublic, pathname, check]);

  if (!expired || isPublic) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <h2 id="session-expired-title" className="text-lg font-bold text-slate-900">
          Tu sesión expiró
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Inicia sesión de nuevo y vuelve a esta pestaña. Se abre en otra pestaña, así que lo que
          escribiste aquí no se pierde.
        </p>
        <a
          href="/login"
          target="_blank"
          rel="noopener"
          className="mt-4 block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          Iniciar sesión
        </a>
        <button
          type="button"
          onClick={() => void check(true)}
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ya inicié sesión
        </button>
      </div>
    </div>
  );
}
