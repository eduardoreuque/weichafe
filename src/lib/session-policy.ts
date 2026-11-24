/**
 * Reglas de duración de la sesión. Los tiempos van en segundos.
 *
 * La sesión se renueva con el uso: mientras el sistema se use al menos una vez
 * cada 7 días no vence, hasta un tope de 30 días desde el inicio de sesión.
 * Antes vencía 7 días después de iniciar sesión, a la misma hora, aunque se
 * estuviera usando en ese momento.
 */
export const SESSION_IDLE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_MAX_SECONDS = 60 * 60 * 24 * 30;
/** La sesión se renueva como máximo una vez al día. */
export const SESSION_RENEW_AFTER_SECONDS = 60 * 60 * 24;

export const SESSION_EXPIRED_MESSAGE = "Tu sesión expiró. Inicia sesión de nuevo para continuar.";

export interface SessionTimes {
  issuedAt: number;
  expiresAt: number;
  /** Momento del inicio de sesión; se conserva al renovar. */
  loginAt: number;
}

export function nextSessionExpiry(loginAt: number, now: number): number {
  return Math.min(now + SESSION_IDLE_SECONDS, loginAt + SESSION_MAX_SECONDS);
}

export function shouldRenewSession(times: SessionTimes, now: number): boolean {
  if (now - times.issuedAt < SESSION_RENEW_AFTER_SECONDS) return false;
  return nextSessionExpiry(times.loginAt, now) > times.expiresAt;
}
