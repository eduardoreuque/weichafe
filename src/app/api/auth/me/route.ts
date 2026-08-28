import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Devuelve el rol de la sesión activa. Lo usan las páginas de administración
// (componentes cliente) para redirigir si el usuario no es ADMIN.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    role: session.role,
    name: session.name,
    email: session.email,
  });
}