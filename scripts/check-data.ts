import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.student.count();
  console.log(`Total alumnos en BD: ${total}`);

  const last = await prisma.student.findMany({ take: 3, orderBy: { createdAt: "desc" } });
  for (const s of last) {
    console.log(`  - ${s.fullName} | RUT: ${s.rut || "-"} | Activo: ${s.isActive} | WhatsApp: ${s.whatsapp || "-"}`);
  }

  const active = await prisma.student.count({ where: { isActive: true } });
  const inactive = await prisma.student.count({ where: { isActive: false } });
  console.log(`\nActivos: ${active} | Inactivos: ${inactive}`);

  await prisma.$disconnect();
}

main();