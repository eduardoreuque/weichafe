/* eslint-disable no-console */
/**
 * Script de regularización de ventas de clase diaria "huérfanas".
 *
 * Contexto: las ventas de clase diaria pueden registrarse con un nombre libre
 * (attendeeName) SIN vincular un alumno (studentId = null). Si más tarde se
 * crea el alumno con ese nombre, esas ventas NO aparecen en su ficha ni en
 * los reportes por alumno. Este script:
 *
 *  1. Busca dailyClassSale con studentId = null y attendeeName no vacío.
 *  2. Intenta matchear ese nombre con un Student existente (case-insensitive,
 *     ignorando tildes y espacios extra).
 *  3. Si hay match ÚNICO, vincula la venta al alumno (studentId) y crea su
 *     comprobante (Receipt) si no existe.
 *  4. Reporta cuántas se pudieron vincular y cuáles quedan sin match.
 *
 * Uso (en el servidor / standalone):
 *   DATABASE_URL="file:/home/ec2-user/weichafe-standalone/prisma/dev.db" \
 *   node scripts/regularize-orphan-class-sales.cjs
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/\s+/g, " ")
    .trim();
}

function createReceiptNumber(now) {
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  const rnd = String(Math.floor(Math.random() * 900000) + 100000);
  return `REC-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${rnd}`;
}

async function main() {
  // 1. Alumnos existentes indexados por nombre normalizado
  const students = await prisma.student.findMany({
    select: { id: true, fullName: true },
  });
  const byName = new Map();
  for (const s of students) {
    const key = normalize(s.fullName);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(s.id);
  }

  // 2. Ventas huérfanas
  const orphanSales = await prisma.dailyClassSale.findMany({
    where: { studentId: null },
    select: { id: true, attendeeName: true, classDate: true, amount: true, paymentMethod: true, discipline: true },
    orderBy: { classDate: "desc" },
  });

  console.log(`Ventas huérfanas encontradas: ${orphanSales.length}`);

  if (orphanSales.length === 0) {
    console.log("Nada que regularizar.");
    return;
  }

  let linked = 0;
  const unmatched = [];

  for (const sale of orphanSales) {
    if (!sale.attendeeName) {
      unmatched.push({ id: sale.id, attendeeName: "(sin nombre)" });
      continue;
    }
    const key = normalize(sale.attendeeName);
    const ids = byName.get(key);
    if (!ids || ids.length !== 1) {
      unmatched.push({ id: sale.id, attendeeName: sale.attendeeName });
      continue;
    }

    // Match único -> vincular y crear comprobante
    const studentId = ids[0];
    await prisma.$transaction(async (tx) => {
      await tx.dailyClassSale.update({
        where: { id: sale.id },
        data: { studentId },
      });

      const existing = await tx.receipt.findFirst({
        where: { dailyClassSaleId: sale.id },
        select: { id: true },
      });
      if (!existing) {
        await tx.receipt.create({
          data: {
            receiptNumber: createReceiptNumber(new Date()),
            amount: sale.amount,
            description: `Clase diaria ${sale.discipline}`,
            paymentMethod: sale.paymentMethod,
            studentId,
            dailyClassSaleId: sale.id,
            issuedAt: sale.classDate,
          },
        });
      }
    });
    linked++;
    console.log(`  ✓ Vinculada venta ${sale.id} (${sale.attendeeName}) -> alumno ${studentId}`);
  }

  console.log(`\nVincularon correctamente: ${linked}`);
  console.log(`Sin match (revisar a mano): ${unmatched.length}`);
  for (const u of unmatched) {
    console.log(`  - ${u.id} | ${u.attendeeName}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });