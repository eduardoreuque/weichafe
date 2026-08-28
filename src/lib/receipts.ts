import { randomInt } from "crypto";

/**
 * Genera el número de comprobante de forma global (única definición).
 * Incluye timestamp + 6 dígitos aleatorios para minimizar colisiones
 * dentro del mismo segundo (el código estaba duplicado en 3 archivos).
 */
export function createReceiptNumber(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  const sec = pad(now.getSeconds());
  const rand = String(randomInt(100000, 999999));
  return `REC-${y}${m}${d}-${h}${min}${sec}-${rand}`;
}