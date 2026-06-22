const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true }
  });
  console.log("\n=== USUARIOS EN LA BASE DE DATOS ===\n");
  console.log(JSON.stringify(users, null, 2));
  console.log(`\nTotal: ${users.length} usuarios\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());