import { prisma } from "@/lib/prisma";

/** Lista de ids sin vacíos ni repetidos, respetando el orden recibido. */
export function normalizeIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** true si todos los horarios indicados existen en la base. */
export async function scheduleIdsExist(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const found = await prisma.schedule.count({ where: { id: { in: ids } } });
  return found === ids.length;
}
