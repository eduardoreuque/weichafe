import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const c = await p.student.count();
  console.log("Student count:", c);
  const u = await p.user.count();
  console.log("User count:", u);
}
main().finally(() => p.$disconnect());
