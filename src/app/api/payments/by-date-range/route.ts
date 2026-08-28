import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseLocalDate } from "@/lib/helpers";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sesion expirada" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const searchQuery = searchParams.get("q") || "";

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Fechas de inicio y fin requeridas" }, { status: 400 });
  }

  try {
    // Construir filtro de fecha
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    end.setHours(23, 59, 59, 999);

    // Filtro base de estudiantes (búsqueda por nombre)
    const studentIdFilter: any = {};
    if (searchQuery.trim()) {
      const students = await prisma.student.findMany({
        where: {
          fullName: { contains: searchQuery.trim() },
        },
        select: { id: true },
      });
      studentIdFilter.studentId = { in: students.map((s) => s.id) };
    }

    // Traer pagos cuya fecha de pago (paidAt) O fecha de registro (createdAt) caigan en el rango.
    // Esto evita perder pagos PENDIENTE/SALTADO que no tienen paidAt pero sí fueron registrados en el rango.
    const whereClause: any = {
      ...studentIdFilter,
      OR: [
        { paidAt: { gte: start, lte: end } },
        { paidAt: null, createdAt: { gte: start, lte: end } },
      ],
    };

    const payments = await prisma.monthlyPayment.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            rut: true,
            email: true,
            whatsapp: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // También obtener ventas de clases diarias en el mismo rango
    const classSalesWhere: any = {
      classDate: {
        gte: start,
        lte: end,
      },
    };

    if (searchQuery.trim()) {
      const students = await prisma.student.findMany({
        where: {
          fullName: { contains: searchQuery.trim() },
        },
        select: { id: true },
      });
      const studentIds = students.map((s) => s.id);
      classSalesWhere.OR = [
        { studentId: { in: studentIds } },
        { attendeeName: { contains: searchQuery.trim() } },
      ];
    }

    const classSales = await prisma.dailyClassSale.findMany({
      where: classSalesWhere,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            rut: true,
          },
        },
      },
      orderBy: {
        classDate: "desc",
      },
    });

    return NextResponse.json({
      payments,
      classSales,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0) + classSales.reduce((sum, c) => sum + c.amount, 0),
    });
  } catch (error) {
    console.error("Error fetching payments by date range:", error);
    return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 });
  }
}