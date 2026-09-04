import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/recovery", "/_next", "/favicon.ico", "/weichafe.jpg"];

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
