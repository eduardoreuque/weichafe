/* eslint-disable no-console */
/**
 * Vincula horario (scheduleId) a mensualidades y clases diarias que no lo tienen.
 *
 * USO MANUAL. Ya no se ejecuta en cada deploy: asignar un horario a un pago es
 * una suposición, y los registros sin horario ahora se muestran aparte en los
 * reportes en lugar de mezclarse con un bloque.
 *
 * Regla (solo casos sin ambigüedad): el registro se vincula únicamente si el
 * alumno está asignado a EXACTAMENTE UN horario de la disciplina del registro.
 * Si tiene dos bloques de la misma disciplina, o ninguno, no se toca.
 *
 * Por defecto solo informa qué haría. Para aplicar los cambios:
 *   node scripts/backfill-schedules.cjs --apply
 *
 * No imprime nombres ni datos personales (los logs del deploy son públicos).
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function disciplinesOf(value) {
  return String(value || "")
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean);
}

async function main() {
  console.log(`=== BACKFILL DE HORARIOS (${APPLY ? "APLICANDO CAMBIOS" : "simulación, sin cambios"}) ===`);

  // Horarios de cada alumno: la lista N:N y, por compatibilidad, el principal
  const schedules = await prisma.schedule.findMany({ select: { id: true, discipline: true } });
  const disciplineOf = new Map(schedules.map((s) => [s.id, String(s.discipline).toUpperCase()]));

  const enrolled = new Map();
  const add = (studentId, scheduleId) => {
    if (!scheduleId || !disciplineOf.has(scheduleId)) return;
    if (!enrolled.has(studentId)) enrolled.set(studentId, new Set());
    enrolled.get(studentId).add(scheduleId);
  };
  for (const link of await prisma.studentSchedule.findMany()) add(link.studentId, link.scheduleId);
  for (const s of await prisma.student.findMany({ select: { id: true, scheduleId: true } })) add(s.id, s.scheduleId);

  const uniqueScheduleFor = (studentId, disciplines) => {
    const matches = [...(enrolled.get(studentId) || [])].filter((id) => disciplines.includes(disciplineOf.get(id)));
    return matches.length === 1 ? matches[0] : null;
  };

  const payments = await prisma.monthlyPayment.findMany({
    where: { scheduleId: null },
    select: { id: true, studentId: true, discipline: true, disciplines: true },
  });
  let paymentsLinked = 0;
  for (const payment of payments) {
    const scheduleId = uniqueScheduleFor(payment.studentId, disciplinesOf(`${payment.discipline},${payment.disciplines || ""}`));
    if (!scheduleId) continue;
    if (APPLY) await prisma.monthlyPayment.update({ where: { id: payment.id }, data: { scheduleId } });
    paymentsLinked++;
  }
  console.log(`Mensualidades sin horario: ${payments.length} | vinculables sin ambigüedad: ${paymentsLinked}`);

  const sales = await prisma.dailyClassSale.findMany({
    where: { scheduleId: null, studentId: { not: null } },
    select: { id: true, studentId: true, discipline: true },
  });
  let salesLinked = 0;
  for (const sale of sales) {
    const scheduleId = uniqueScheduleFor(sale.studentId, disciplinesOf(sale.discipline));
    if (!scheduleId) continue;
    if (APPLY) await prisma.dailyClassSale.update({ where: { id: sale.id }, data: { scheduleId } });
    salesLinked++;
  }
  console.log(`Clases diarias sin horario (con alumno): ${sales.length} | vinculables sin ambigüedad: ${salesLinked}`);

  if (!APPLY) console.log("No se modificó nada. Para aplicar: node scripts/backfill-schedules.cjs --apply");
  console.log("=== FIN ===");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Error en backfill:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
