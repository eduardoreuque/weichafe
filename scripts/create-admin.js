const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  });
  console.log("Usuarios encontrados:", JSON.stringify(users, null, 2));
  
  if (users.length === 0) {
    console.log("No hay usuarios. Creando admin...");
    const hash = bcrypt.hashSync("admin123", 10);
    const user = await prisma.user.create({
      data: {
        email: "admin@weichafe.cl",
        passwordHash: hash,
        name: "Administrador",
        role: "ADMIN"
      }
    });
    console.log("Admin creado:", JSON.stringify(user, null, 2));
  } else {
    console.log("Ya existen usuarios en la base de datos");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());