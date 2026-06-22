const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.student.count();
  console.log("\n=== ESTUDIANTES EN LA BASE DE DATOS ===\n");
  console.log("Total de estudiantes:", count);
  
  if (count > 0) {
    const students = await prisma.student.findMany({
      take: 10,
      select: { id: true, fullName: true, rut: true, email: true, isActive: true }
    });
    console.log("\nPrimeros 10 estudiantes:");
    console.log(JSON.stringify(students, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());