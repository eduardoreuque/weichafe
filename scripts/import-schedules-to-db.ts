import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const filePath = join(process.cwd(), "public", "schedules.json");
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  for (const s of data.schedules) {
    await prisma.schedule.upsert({
      where: { id: s.id },
      update: {
        discipline: s.discipline,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        blockName: s.blockName,
      },
      create: {
        id: s.id,
        discipline: s.discipline,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        blockName: s.blockName,
      },
    });
  }

  const count = await prisma.schedule.count();
  console.log(`✅ ${count} schedules importados correctamente`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());