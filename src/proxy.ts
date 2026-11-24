import { NextRequest, NextResponse } from "next/server";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/session-policy";

const PUBLIC_PATHS = ["/login", "/recovery", "/_next", "/favicon.ico", "/weichafe.jpg"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("weichafe-session")?.value;

  if (!token) {
    // Las llamadas a la API desde los formularios reciben un 401 en JSON. Antes
    // se redirigían al login: el navegador reenviaba el formulario a esa página,
    // que respondía con un error, y el usuario veía "Error al subir la foto".
    // Abrir un enlace de la API en el navegador sí lleva al login.
    const isPageNavigation = request.headers.get("accept")?.includes("text/html") ?? false;
    if (pathname.startsWith("/api/") && !isPageNavigation) {
      return NextResponse.json({ ok: false, error: SESSION_EXPIRED_MESSAGE }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // La verificacion de firma se hace en el servidor con getSession().
  // Aqui solo protegemos rutas por presencia de cookie para evitar
  // desajustes de secreto en runtime/build dentro del proxy.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
