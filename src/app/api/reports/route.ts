import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId") || "";
  const discipline = searchParams.get("discipline") || "";
  const paymentStatus = searchParams.get("paymentStatus") || "";
  const onlyActive = searchParams.get("onlyActive") !== "false";
  const searchQuery = searchParams.get("q") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  try {
    // Construir filtro base de estudiantes
    const studentWhere: any = {};
    if (onlyActive) studentWhere.isActive = true;

    // Filtro por búsqueda de nombre/RUT
    if (searchQuery.trim()) {
      studentWhere.OR = [
        { fullName: { contains: searchQuery.trim() } },
        { rut: { contains: searchQuery.trim() } },
      ];
    }

    // Obtener estudiantes
    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        monthlyPayments: {
          orderBy: { monthCovered: "desc" },
          include: {
            receipt: { select: { id: true, receiptNumber: true } },
          },
          take: 100,
        },
        dailyClassSales: {
          orderBy: { classDate: "desc" },
          take: 50,
        },
      },
      orderBy: { fullName: "asc" },
    });

    // Cargar schedules desde BD (con fallback a JSON)
    let schedulesArr: any[] = [];
    try {
      schedulesArr = await prisma.schedule.findMany({
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
    } catch {
      // Fallback a JSON si la tabla no existe
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      try {
        const raw = readFileSync(join(process.cwd(), "public", "schedules.json"), "utf-8");
        const parsed = JSON.parse(raw);
        schedulesArr = Array.isArray(parsed) ? parsed : parsed.schedules || [];
      } catch {}
    }

    // Mapear schedules por ID
    const schedulesById: Record<string, any> = {};
    schedulesArr.forEach((s: any) => {
      schedulesById[s.id] = s;
    });

    // Obtener schedules del estudiante desde su scheduleId en DB
    function getStudentScheduleInfo(studentId: string, studentScheduleId: string | null) {
      if (studentScheduleId && schedulesById[studentScheduleId]) {
        return [schedulesById[studentScheduleId]];
      }
      return [];
    }

    // Filtrar pagos por rango de fecha (paidAt)
    function filterPaymentsByDateRange(payments: any[], start: string, end: string) {
      if (!start && !end) return payments;
      const startDateObj = start ? new Date(start) : null;
      const endDateObj = end ? new Date(end) : null;
      if (endDateObj) endDateObj.setHours(23, 59, 59, 999);

      return payments.filter((p) => {
        if (!p.paidAt) return false;
        const paidAt = new Date(p.paidAt);
        if (startDateObj && paidAt < startDateObj) return false;
        if (endDateObj && paidAt > endDateObj) return false;
        return true;
      });
    }

    // Filtrar clases diarias por rango de fecha
    function filterClassSalesByDateRange(sales: any[], start: string, end: string) {
      if (!start && !end) return sales;
      const startDateObj = start ? new Date(start) : null;
      const endDateObj = end ? new Date(end) : null;
      if (endDateObj) endDateObj.setHours(23, 59, 59, 999);

      return sales.filter((s) => {
        const classDate = new Date(s.classDate);
        if (startDateObj && classDate < startDateObj) return false;
        if (endDateObj && classDate > endDateObj) return false;
        return true;
      });
    }

    // Aplicar todos los filtros
    let filteredStudents = students;

    // Filtro por horario (basado en scheduleId de la DB)
    if (scheduleId) {
      filteredStudents = filteredStudents.filter((s) => {
        return s.scheduleId === scheduleId;
      });
    }

    // Filtro por disciplina (en pagos mensuales)
    if (discipline) {
      filteredStudents = filteredStudents.filter((s) =>
        s.monthlyPayments.some((p) => p.discipline === discipline)
      );
    }

    // Filtro por estado de pago
    if (paymentStatus === "PAGADO") {
      filteredStudents = filteredStudents.filter((s) =>
        s.monthlyPayments.some((p) => p.status === "PAGADO")
      );
    } else if (paymentStatus === "PENDIENTE") {
      filteredStudents = filteredStudents.filter((s) =>
        s.monthlyPayments.some((p) => p.status === "PENDIENTE")
      );
    } else if (paymentStatus === "SALTADO") {
      filteredStudents = filteredStudents.filter((s) =>
        s.monthlyPayments.some((p) => p.status === "SALTADO")
      );
    } else if (paymentStatus === "SIN_PAGO") {
      filteredStudents = filteredStudents.filter((s) =>
        s.monthlyPayments.length === 0
      );
    } else if (paymentStatus === "CON_DEUDA") {
      filteredStudents = filteredStudents.filter((s) =>
        s.monthlyPayments.some((p) => p.status === "PENDIENTE" || p.status === "SALTADO")
      );
    } else if (paymentStatus === "AL_DIA") {
      filteredStudents = filteredStudents.filter((s) =>
        s.monthlyPayments.length > 0 &&
        !s.monthlyPayments.some((p) => p.status === "PENDIENTE" || p.status === "SALTADO")
      );
    }

    // Armar datos de respuesta
    const reportData = filteredStudents.map((student) => {
      const scheduleInfo = getStudentScheduleInfo(student.id, student.scheduleId);
      const filteredPayments = filterPaymentsByDateRange(student.monthlyPayments, startDate, endDate);
      const filteredClassSales = filterClassSalesByDateRange(student.dailyClassSales, startDate, endDate);

      const totalPagado = filteredPayments
        .filter((p) => p.status === "PAGADO")
        .reduce((sum, p) => sum + p.amount, 0);

      const totalPendiente = filteredPayments
        .filter((p) => p.status === "PENDIENTE" || p.status === "SALTADO")
        .reduce((sum, p) => sum + p.amount, 0);

      const ultimoPago = filteredPayments.find((p) => p.status === "PAGADO");
      const disciplinesSet = new Set(student.monthlyPayments.map((p) => p.discipline));

      return {
        id: student.id,
        fullName: student.fullName,
        rut: student.rut || "",
        email: student.email || "",
        whatsapp: student.whatsapp || "",
        isActive: student.isActive,
        birthDate: student.birthDate.toISOString().split("T")[0],
        edad: calculateAge(student.birthDate),
        district: student.district || "",
        schedules: scheduleInfo.map((s: any) => ({
          discipline: s.discipline,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          blockName: s.blockName,
        })),
        disciplines: Array.from(disciplinesSet).join(", "),
        totalPagado,
        totalPendiente,
        ultimoPagoMes: ultimoPago
          ? ultimoPago.monthCovered.toLocaleDateString("es-CL", { month: "long", year: "numeric" })
          : "Sin pagos",
        ultimoPagoMonto: ultimoPago?.amount || 0,
        paymentCount: filteredPayments.length,
        classSalesCount: filteredClassSales.length,
        estadoPago: getPaymentStatus(student.monthlyPayments),
        monthlyPayments: filteredPayments.map((p) => ({
          id: p.id,
          discipline: p.discipline,
          disciplines: p.disciplines,
          month: p.monthCovered.toLocaleDateString("es-CL", { month: "long", year: "numeric" }),
          amount: p.amount,
          status: p.status,
          paidAt: p.paidAt ? p.paidAt.toISOString().split("T")[0] : null,
          paymentMethod: p.paymentMethod || "-",
          notes: p.notes || "",
          receiptId: p.receipt?.id || null,
          receiptNumber: p.receipt?.receiptNumber || null,
        })),
        dailyClassSales: filteredClassSales.map((s) => ({
          id: s.id,
          discipline: s.discipline,
          classDate: s.classDate.toISOString().split("T")[0],
          amount: s.amount,
          paymentMethod: s.paymentMethod,
          notes: s.notes || "",
        })),
      };
    });

    // Resumen general (sin filtro de fecha para mantener totales históricos)
    const resumen = {
      totalAlumnos: filteredStudents.length,
      totalPagadoTotal: reportData.reduce((sum: number, s: any) => sum + s.totalPagado, 0),
      totalPendienteTotal: reportData.reduce((sum: number, s: any) => sum + s.totalPendiente, 0),
      totalClasesDiarias: reportData.reduce((sum: number, s: any) => sum + s.classSalesCount, 0),
      alumnosAlDia: reportData.filter((s: any) => s.estadoPago === "AL_DIA").length,
      alumnosConDeuda: reportData.filter((s: any) => s.estadoPago === "CON_DEUDA").length,
      alumnosSinPagos: reportData.filter((s: any) => s.estadoPago === "SIN_PAGOS").length,
    };

    // Pagos detallados planos para exportar
    const pagosDetallados: any[] = [];
    filteredStudents.forEach((student) => {
      const scheduleInfo = getStudentScheduleInfo(student.id, student.scheduleId);
      const filteredPayments = filterPaymentsByDateRange(student.monthlyPayments, startDate, endDate);

      filteredPayments.forEach((payment) => {
        if (scheduleId) {
          const schedule = schedulesById[scheduleId];
          if (payment.discipline !== schedule?.discipline) return;
        }
        if (discipline && payment.discipline !== discipline) return;

        pagosDetallados.push({
          studentId: student.id,
          studentName: student.fullName,
          rut: student.rut || "-",
          whatsapp: student.whatsapp || "-",
          email: student.email || "-",
          district: student.district || "-",
          scheduleId: student.scheduleId,
          schedules: scheduleInfo.map((s: any) => ({
            discipline: s.discipline,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            blockName: s.blockName,
          })),
          paymentId: payment.id,
          discipline: payment.discipline,
          disciplines: payment.disciplines || "",
          month: payment.monthCovered.toLocaleDateString("es-CL", { month: "long", year: "numeric" }),
          amount: payment.amount,
          status: payment.status,
          paidAt: payment.paidAt ? payment.paidAt.toISOString().split("T")[0] : null,
          paymentMethod: payment.paymentMethod || "-",
          notes: payment.notes || "",
        });
      });
    });

    return NextResponse.json({
      ok: true,
      data: reportData,
      resumen,
      schedules: schedulesArr,
      disciplines: Array.from(new Set(schedulesArr.map((s: any) => s.discipline))),
      pagosDetallados,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { ok: false, error: "Error al generar el reporte" },
      { status: 500 }
    );
  }
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getPaymentStatus(payments: { status: string }[]): string {
  if (payments.length === 0) return "SIN_PAGOS";
  const hasPending = payments.some((p) => p.status === "PENDIENTE" || p.status === "SALTADO");
  if (hasPending) return "CON_DEUDA";
  return "AL_DIA";
}