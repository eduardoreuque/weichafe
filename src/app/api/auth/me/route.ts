import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, createSession, getSessionDetails, setSessionCookie } from "@/lib/auth";
import { SESSION_EXPIRED_MESSAGE, shouldRenewSession } from "@/lib/session-policy";

/**
 * Estado de la sesión activa.
 *
 * Lo usan las páginas de administración (componentes cliente) para conocer el
 * rol, y SessionKeeper para mantener la sesión: si corresponde, aquí se renueva.
 */
export async function GET() {
  const details = await getSessionDetails();
  if (!details) {
    return NextResponse.json({ ok: false, error: SESSION_EXPIRED_MESSAGE }, { status: 401 });
  }

  try {
    // La cuenta debe seguir existiendo: la sesión de un usuario eliminado se
    // cierra en lugar de renovarse.
    const user = await prisma.user.findUnique({
      where: { id: details.user.id },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) {
      await clearSessionCookie();
      return NextResponse.json({ ok: false, error: SESSION_EXPIRED_MESSAGE }, { status: 401 });
    }

    if (shouldRenewSession(details, Math.floor(Date.now() / 1000))) {
      await setSessionCookie(await createSession(user, details.loginAt));
    }

    return NextResponse.json({ ok: true, role: user.role, name: user.name, email: user.email });
  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.json({ ok: false, error: "No se pudo comprobar la sesión" }, { status: 500 });
  }
}
