import crypto from "crypto";

/**
 * Recuperación de acceso por "código maestro".
 *
 * Mecánica:
 *  - El dueño define RECOVERY_CODE (mín. 16 caracteres) en el entorno del servidor.
 *  - Si se queda sin acceso, entra a /recovery desde su celular, ingresa el código
 *    y la nueva contraseña del admin. No requiere sesión ni servicios externos.
 *  - Solo se activa si RECOVERY_CODE está configurado. Si no, la página muestra
 *    "no disponible" y las acciones devuelven error.
 */

const MIN_CODE_LENGTH = 16;
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;

// Protección simple contra fuerza bruta (por IP, en memoria).
// Suficiente porque la app corre como proceso único (Next standalone en EC2).
const attempts = new Map<string, { count: number; lockedUntil: number }>();

export function isRecoveryEnabled(): boolean {
  const code = process.env.RECOVERY_CODE;
  return typeof code === "string" && code.trim().length >= MIN_CODE_LENGTH;
}

/** Comparación en tiempo constante para evitar timing attacks. */
export function verifyRecoveryCode(input: string): boolean {
  if (!isRecoveryEnabled()) return false;
  const a = crypto.createHash("sha256").update(input.trim()).digest();
  const b = crypto.createHash("sha256").update(process.env.RECOVERY_CODE!.trim()).digest();
  return crypto.timingSafeEqual(a, b);
}

export function isLocked(clientId: string): boolean {
  const entry = attempts.get(clientId);
  if (!entry) return false;
  if (Date.now() < entry.lockedUntil) return true;
  attempts.delete(clientId);
  return false;
}

export function registerFailure(clientId: string): { locked: boolean } {
  const entry = attempts.get(clientId) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_SECONDS * 1000;
    entry.count = 0;
    attempts.set(clientId, entry);
    return { locked: true };
  }
  attempts.set(clientId, entry);
  return { locked: false };
}

export function resetAttempts(clientId: string): void {
  attempts.delete(clientId);
}