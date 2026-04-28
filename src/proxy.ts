import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/_next", "/favicon.ico", "/logo-weichafe.svg", "/logo-weichafe.png", "/logo-weichafe-2026.png"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("weichafe-session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // La verificacion de firma se hace en el servidor con getSession().
  // Aqui solo protegemos rutas por presencia de cookie para evitar
  // desajustes de secreto en runtime/build dentro del proxy.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
