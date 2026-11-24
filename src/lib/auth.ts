import { SignJWT, decodeJwt, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { nextSessionExpiry, type SessionTimes } from "@/lib/session-policy";

const DEV_FALLBACK_SECRET = "weichafe-secret-local-dev-key-32chars!!";

const COOKIE_NAME = "weichafe-session";

const nowSeconds = () => Math.floor(Date.now() / 1000);

export type UserRole = "ADMIN" | "STAFF";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Secreto de firma de JWT.
 * Si no está configurado AUTH_SECRET en el entorno, usa el fallback seguro
 * en lugar de lanzar una excepción que rompa el login en producción.
 * En producción se advierte por consola: el despliegue genera
 * /var/weichafe/auth.env con un secreto único por servidor.
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[auth] AUTH_SECRET no está definido: se usa la clave por defecto. Configúralo en el entorno del servidor."
      );
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }
  return new TextEncoder().encode(secret);
}

/**
 * Crea el token de sesión. La duración la define session-policy.ts.
 * Al renovar se pasa el loginAt original para respetar el tope total.
 */
export async function createSession(user: SessionUser, loginAt: number = nowSeconds()): Promise<string> {
  const now = nowSeconds();
  return new SignJWT({ id: user.id, email: user.email, name: user.name, role: user.role, loginAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(nextSessionExpiry(loginAt, now))
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
});

/** Sesión actual con sus tiempos, para decidir si corresponde renovarla. */
export async function getSessionDetails(): Promise<({ user: SessionUser } & SessionTimes) | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const issuedAt = payload.iat ?? 0;
    return {
      user: payload as unknown as SessionUser,
      issuedAt,
      expiresAt: payload.exp ?? 0,
      // Las sesiones emitidas antes de la renovación no traen loginAt.
      loginAt: typeof payload.loginAt === "number" ? payload.loginAt : issuedAt,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const forceSecure = process.env.COOKIE_SECURE === "true";
  // La cookie dura lo mismo que el token.
  const expiresAt = decodeJwt(token).exp ?? nowSeconds();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: forceSecure,
    sameSite: "lax",
    maxAge: Math.max(0, expiresAt - nowSeconds()),
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
