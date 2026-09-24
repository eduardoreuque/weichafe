/**
 * Importa los horarios base de public/schedules.json a la tabla Schedule.
 *
 * Solo actúa si la tabla está vacía, para no pisar los horarios que el
 * administrador haya creado o editado desde /admin/horarios.
 * Se ejecuta en el deploy (el resto de la app ya trabaja contra la BD).
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  const count = await prisma.schedule.count();
  if (count > 0) {
    console.log(`La tabla Schedule ya tiene ${count} horarios. No se importa nada.`);
    await prisma.$disconnect();
    return;
  }

  const file = path.join(process.cwd(), "public", "schedules.json");
  if (!fs.existsSync(file)) {
    console.log("No se encontró public/schedules.json, nada que importar.");
    await prisma.$disconnect();
    return;
  }

  const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  const list = Array.isArray(parsed) ? parsed : parsed.schedules || [];

  let imported = 0;
  for (const s of list) {
    if (!s || !s.id || !s.discipline || !s.dayOfWeek || !s.startTime) continue;
    await prisma.schedule.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        discipline: s.discipline,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime || "",
        blockName: s.blockName || "",
        location: s.location || null,
        isActive: s.isActive !== false,
      },
    });
    imported += 1;
  }

  console.log(`Horarios base importados a la BD: ${imported}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Error importando horarios:", error);
  process.exit(1);
});
