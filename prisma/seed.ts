import { Discipline, MonthlyStatus, PaymentMethod, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.receipt.deleteMany();
  await prisma.dailyClassSale.deleteMany();
  await prisma.monthlyPayment.deleteMany();
  await prisma.student.deleteMany();

  const student = await prisma.student.create({
    data: {
      fullName: "Matias Alarcon",
      birthDate: new Date("2004-05-18"),
      email: "matias@example.com",
      whatsapp: "+56911112222",
      address: "Av. Siempre Viva 123",
      district: "Temuco",
      emergencyPhone: "+56999998888",
    },
  });

  const monthlyPaid = await prisma.monthlyPayment.create({
    data: {
      studentId: student.id,
      discipline: Discipline.MMA,
      status: MonthlyStatus.PAGADO,
      monthCovered: new Date("2026-02-01"),
      amount: 35000,
      paidAt: new Date("2026-02-03"),
      paymentMethod: PaymentMethod.TRANSFERENCIA,
      notes: "Pago a inicio de mes",
    },
  });

  await prisma.monthlyPayment.create({
    data: {
      studentId: student.id,
      discipline: Discipline.MMA,
      status: MonthlyStatus.SALTADO,
      monthCovered: new Date("2026-03-01"),
      amount: 0,
      notes: "Mes marcado como saltado",
    },
  });

  const dailySale = await prisma.dailyClassSale.create({
    data: {
      studentId: student.id,
      discipline: Discipline.BOXEO,
      classDate: new Date("2026-04-21"),
      amount: 6000,
      paymentMethod: PaymentMethod.EFECTIVO,
      notes: "Clase suelta",
    },
  });

  await prisma.receipt.create({
    data: {
      receiptNumber: "REC-202604-0001",
      amount: monthlyPaid.amount,
      description: "Mensualidad MMA - Febrero 2026",
      paymentMethod: PaymentMethod.TRANSFERENCIA,
      studentId: student.id,
      monthlyPaymentId: monthlyPaid.id,
      issuedAt: monthlyPaid.paidAt ?? new Date(),
    },
  });

  await prisma.receipt.create({
    data: {
      receiptNumber: "REC-202604-0002",
      amount: dailySale.amount,
      description: "Clase diaria Boxeo",
      paymentMethod: PaymentMethod.EFECTIVO,
      studentId: student.id,
      dailyClassSaleId: dailySale.id,
      issuedAt: new Date("2026-04-21"),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
