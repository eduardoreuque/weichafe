/* eslint-disable no-console */
/**
 * Backfill de scheduleId en MonthlyPayment y DailyClassSale.
 * 
 * Contexto: 
 * En producción, muchos pagos (283 de 291) y ventas de clase diaria se
 * crearon antes de que existiera la columna scheduleId o el binding directo
 * a horarios.
 * 
 * Este script:
 * 1. Para MonthlyPayment donde scheduleId IS NULL:
 *    - Si el estudiante asociado tiene un scheduleId asignado cuya disciplina
 *      coincide con la del pago, copia el scheduleId del estudiante al pago.
 *    - Si el estudiante solo tiene 1 horario asignado y la disciplina coincide,
 *      se asocia.
 * 2. Para DailyClassSale donde scheduleId IS NULL:
 *    - Si el estudiante asociado tiene un scheduleId cuya disciplina coincide,
 *      asocia el horario.
 * 3. Loguea cuántos registros fueron actualizados de forma segura sin
 *    hacer suposiciones ambiguas.
 * 
 * Uso:
 *   node scripts/backfill-schedules.cjs
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO BACKFILL DE SCHEDULE_ID ===");

  const schedules = await prisma.schedule.findMany();
  console.log(`Horarios disponibles en BD: ${schedules.length}`);
  const scheduleById = new Map(schedules.map((s) => [s.id, s]));

  // 1. BACKFILL MONTHLY PAYMENTS
  const unlinkedPayments = await prisma.monthlyPayment.findMany({
    where: { scheduleId: null },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          scheduleId: true,
        },
      },
    },
  });

  console.log(`Pagos mensuales sin scheduleId: ${unlinkedPayments.length}`);

  let paymentsUpdated = 0;
  for (const payment of unlinkedPayments) {
    if (!payment.student || !payment.student.scheduleId) {
      continue;
    }

    const studentSchedule = scheduleById.get(payment.student.scheduleId);
    if (!studentSchedule) continue;

    // Verificar compatibilidad de disciplina
    const paymentDisc = (payment.discipline || "").toUpperCase();
    const schedDisc = (studentSchedule.discipline || "").toUpperCase();
    const disciplinesList = (payment.disciplines || "").toUpperCase();

    const matches =
      schedDisc === paymentDisc ||
      disciplinesList.includes(schedDisc) ||
      paymentDisc.includes(schedDisc);

    if (matches) {
      await prisma.monthlyPayment.update({
        where: { id: payment.id },
        data: { scheduleId: studentSchedule.id },
      });
      paymentsUpdated++;
    }
  }

  console.log(`✓ Pagos mensuales actualizados con scheduleId del alumno: ${paymentsUpdated}`);

  // 2. BACKFILL DAILY CLASS SALES
  const unlinkedSales = await prisma.dailyClassSale.findMany({
    where: { scheduleId: null },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          scheduleId: true,
        },
      },
    },
  });

  console.log(`Ventas de clases diarias sin scheduleId: ${unlinkedSales.length}`);

  let salesUpdated = 0;
  for (const sale of unlinkedSales) {
    if (!sale.student || !sale.student.scheduleId) {
      continue;
    }

    const studentSchedule = scheduleById.get(sale.student.scheduleId);
    if (!studentSchedule) continue;

    const saleDisc = (sale.discipline || "").toUpperCase();
    const schedDisc = (studentSchedule.discipline || "").toUpperCase();

    if (saleDisc === schedDisc || saleDisc.includes(schedDisc)) {
      await prisma.dailyClassSale.update({
        where: { id: sale.id },
        data: { scheduleId: studentSchedule.id },
      });
      salesUpdated++;
    }
  }

  console.log(`✓ Ventas de clases diarias actualizadas con scheduleId del alumno: ${salesUpdated}`);
  console.log("=== FIN DEL BACKFILL ===");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Error en backfill:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
