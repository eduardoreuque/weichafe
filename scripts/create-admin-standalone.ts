import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Users found: ${users.length}`);

  if (users.length === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    const user = await prisma.user.create({
      data: {
        email: "admin@weichafe.cl",
        passwordHash: hash,
        name: "Administrador",
        role: "ADMIN",
      },
    });
    console.log(`Admin created: ${user.id}`);
  } else {
    console.log("Admin already exists");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());