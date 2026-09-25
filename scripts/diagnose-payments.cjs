/**
 * Diagnóstico de pagos (SOLO LECTURA).
 *
 * Busca alumnos por nombre/RUT y lista TODO lo registrado para ellos
 * (mensualidades, clases diarias, comprobantes) con valores crudos, para
 * detectar por qué un pago no aparece en las vistas de la aplicación.
 *
 * Uso:
 *   SEARCH="LEANDRO,QUIROZ" DATABASE_URL="file:.../dev.db" node scripts/diagnose-payments.cjs
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

const RAW_SEARCH = (process.env.SEARCH || "").trim();
const TERMS = RAW_SEARCH
  .split(",")
  .map((t) => t.trim())
  .filter((t) => t.length > 0);

const DB_URL = process.env.DATABASE_URL || "(no definida)";
const DB_PATH = DB_URL.startsWith("file:") ? DB_URL.slice(5) : "";

function fmt(value) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 19).replace("T", " ");
}

function month(value) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 7);
}

async function main() {
  console.log("=== DIAGNOSTICO DE PAGOS (solo lectura) ===");
  console.log("Fecha ejecucion : " + new Date().toISOString());
  console.log("DATABASE_URL    : " + DB_URL);

  if (DB_PATH) {
    try {
      const st = fs.statSync(DB_PATH);
      console.log("Archivo BD      : " + DB_PATH + " (" + st.size + " bytes, modificado " + fmt(st.mtime) + ")");
      for (const suffix of ["-wal", "-shm", "-journal"]) {
        const p = DB_PATH + suffix;
        console.log(
          "  " + suffix + " presente: " + (fs.existsSync(p) ? "SI (" + fs.statSync(p).size + " bytes)" : "no")
        );
      }
    } catch (error) {
      console.log("Archivo BD      : no se pudo leer (" + error.message + ")");
    }
  }

  const journal = await prisma.$queryRawUnsafe("PRAGMA journal_mode");
  console.log("journal_mode    : " + JSON.stringify(journal));

  const totals = {
    alumnos: await prisma.student.count(),
    mensualidades: await prisma.monthlyPayment.count(),
    clasesDiarias: await prisma.dailyClassSale.count(),
    comprobantes: await prisma.receipt.count(),
    horarios: await prisma.schedule.count(),
    usuarios: await prisma.user.count(),
  };
  console.log(
    "TOTALES         : " +
      Object.entries(totals)
        .map(([k, v]) => k + "=" + v)
        .join("  ")
  );

  const where = TERMS.length
    ? { OR: TERMS.flatMap((t) => [{ fullName: { contains: t } }, { rut: { contains: t } }]) }
    : {};

  const students = await prisma.student.findMany({
    where,
    include: { schedule: true },
    orderBy: { fullName: "asc" },
  });

  console.log("\n=== ALUMNOS QUE COINCIDEN CON [" + (RAW_SEARCH || "todos") + "]: " + students.length + " ===");

  for (const s of students) {
    console.log("\n--- " + s.fullName + " (id=" + s.id + ")");
    console.log("    activo=" + s.isActive + " | rut=" + (s.rut || "-") + " | creado=" + fmt(s.createdAt));
    console.log(
      "    horario asignado: " +
        (s.schedule
          ? s.schedule.discipline + " " + s.schedule.dayOfWeek + " " + s.schedule.startTime + "-" +
            s.schedule.endTime + " (" + s.schedule.blockName + ")"
          : "SIN HORARIO")
    );

    const payments = await prisma.monthlyPayment.findMany({
      where: { studentId: s.id },
      orderBy: { createdAt: "desc" },
    });
    console.log("    MENSUALIDADES registradas: " + payments.length);
    for (const p of payments) {
      console.log(
        "      [" + p.status + "] " + p.discipline + (p.disciplines ? " multi=" + p.disciplines : "") +
          " mes=" + month(p.monthCovered) + " monto=" + p.amount + " paidAt=" + fmt(p.paidAt) +
          " creado=" + fmt(p.createdAt) + " metodo=" + (p.paymentMethod || "-") +
          " horario=" + (p.scheduleId || "-") + " id=" + p.id
      );
    }

    const sales = await prisma.dailyClassSale.findMany({
      where: { studentId: s.id },
      orderBy: { classDate: "desc" },
    });
    console.log("    CLASES DIARIAS registradas: " + sales.length);
    for (const c of sales) {
      console.log(
        "      " + c.discipline + " fecha=" + fmt(c.classDate) + " monto=" + c.amount +
          " metodo=" + c.paymentMethod + " horario=" + (c.scheduleId || "-") +
          " notas=" + (c.notes || "-") + " id=" + c.id
      );
    }

    const receipts = await prisma.receipt.findMany({
      where: { studentId: s.id },
      orderBy: { issuedAt: "desc" },
      take: 30,
    });
    console.log("    COMPROBANTES: " + receipts.length);
    for (const r of receipts) {
      console.log(
        "      " + r.receiptNumber + " " + fmt(r.issuedAt) + " $" + r.amount + " | " + r.description +
          " | mensualidad=" + (r.monthlyPaymentId || "-") + " clase=" + (r.dailyClassSaleId || "-")
      );
    }
  }

  if (TERMS.length) {
    const orphans = await prisma.dailyClassSale.findMany({
      where: { studentId: null, OR: TERMS.map((t) => ({ attendeeName: { contains: t } })) },
      orderBy: { classDate: "desc" },
    });
    console.log("\n=== CLASES SIN ALUMNO VINCULADO que coinciden: " + orphans.length + " ===");
    for (const c of orphans) {
      console.log(
        "    " + (c.attendeeName || "(sin nombre)") + " | " + c.discipline + " | " + fmt(c.classDate) +
          " | $" + c.amount + " | id=" + c.id
      );
    }
    const totalOrphans = await prisma.dailyClassSale.count({ where: { studentId: null } });
    console.log("    (total de ventas sin alumno en la BD: " + totalOrphans + ")");
  }

  const allPayments = await prisma.monthlyPayment.findMany({
    select: { monthCovered: true, status: true, paidAt: true, scheduleId: true },
  });
  const byMonth = {};
  for (const p of allPayments) {
    const key = month(p.monthCovered) + " | " + p.status;
    byMonth[key] = (byMonth[key] || 0) + 1;
  }
  console.log("\n=== MENSUALIDADES EN LA BD POR MES/ESTADO ===");
  for (const key of Object.keys(byMonth).sort()) {
    console.log("    " + key + ": " + byMonth[key]);
  }
  console.log(
    "    (PAGADO sin paidAt: " + allPayments.filter((p) => !p.paidAt && p.status === "PAGADO").length +
      " | sin horario vinculado: " + allPayments.filter((p) => !p.scheduleId).length + ")"
  );

  const allSales = await prisma.dailyClassSale.findMany({ select: { classDate: true, studentId: true } });
  const salesByMonth = {};
  for (const c of allSales) {
    const key = month(c.classDate) + (c.studentId ? " (con alumno)" : " (SIN alumno)");
    salesByMonth[key] = (salesByMonth[key] || 0) + 1;
  }
  console.log("\n=== CLASES DIARIAS EN LA BD POR MES ===");
  for (const key of Object.keys(salesByMonth).sort()) {
    console.log("    " + key + ": " + salesByMonth[key]);
  }

  const inactiveWithPayments = await prisma.student.findMany({
    where: { isActive: false, monthlyPayments: { some: {} } },
    select: { id: true, fullName: true, _count: { select: { monthlyPayments: true } } },
  });
  console.log("\n=== ALUMNOS INACTIVOS CON MENSUALIDADES (Reportes los oculta por defecto) ===");
  if (inactiveWithPayments.length === 0) console.log("    (ninguno)");
  for (const s of inactiveWithPayments) {
    console.log("    " + s.fullName + " | pagos=" + s._count.monthlyPayments + " | id=" + s.id);
  }

  const duplicateNames = await prisma.$queryRawUnsafe(
    "SELECT fullName, COUNT(*) as n FROM Student GROUP BY fullName HAVING COUNT(*) > 1 ORDER BY n DESC"
  );
  console.log("\n=== NOMBRES DUPLICADOS DE ALUMNOS (posible causa de confusion) ===");
  if (duplicateNames.length === 0) console.log("    (ninguno)");
  for (const row of duplicateNames) {
    console.log("    " + row.fullName + " x" + String(row.n));
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("ERROR=" + error.message);
  await prisma.$disconnect();
  process.exit(1);
});

