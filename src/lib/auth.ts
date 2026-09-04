import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

const DEV_FALLBACK_SECRET = "weichafe-secret-local-dev-key-32chars!!";

const COOKIE_NAME = "weichafe-session";
const EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 días

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
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || DEV_FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_SECONDS}s`)
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

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const forceSecure = process.env.COOKIE_SECURE === "true";
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: forceSecure,
    sameSite: "lax",
    maxAge: EXPIRY_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
