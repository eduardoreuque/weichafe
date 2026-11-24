/** Evento con el que un formulario pide comprobar la sesión de inmediato. */
export const SESSION_CHECK_EVENT = "weichafe:session-check";

/** Pide a SessionKeeper que compruebe la sesión ahora (muestra el aviso si venció). */
export function requestSessionCheck(): void {
  window.dispatchEvent(new Event(SESSION_CHECK_EVENT));
}

/** true si la respuesta indica que no hay sesión; en ese caso pide comprobarla. */
export function handleUnauthorized(response: Response): boolean {
  if (response.status !== 401) return false;
  requestSessionCheck();
  return true;
}
