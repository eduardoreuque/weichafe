import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseLocalDate } from "@/lib/helpers";

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

    // Filtro por bÃºsqueda de nombre/RUT
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
        },
        dailyClassSales: {
          orderBy: { classDate: "desc" },
        },
      },
      orderBy: { fullName: "asc" },
    });

    // Ventas de clases diarias registradas sin alumno vinculado (nombre libre / "walk-in")
    // Estas no aparecen bajo ningÃºn Student, por eso se consultan y reportan aparte.
    const orphanWhere: any = { studentId: null };
    if (searchQuery.trim()) {
      orphanWhere.attendeeName = { contains: searchQuery.trim() };
    }
    const orphanClassSales = await prisma.dailyClassSale.findMany({
      where: orphanWhere,
      orderBy: { classDate: "desc" },
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

    // Filtrar pagos por rango de fecha (paidAt, o createdAt si no tiene fecha de pago registrada)
    function filterPaymentsByDateRange(payments: any[], start: string, end: string) {
      if (!start && !end) return payments;
      const startDateObj = start ? parseLocalDate(start) : null;
      const endDateObj = end ? parseLocalDate(end) : null;
      if (endDateObj) endDateObj.setHours(23, 59, 59, 999);

      return payments.filter((p) => {
        const referenceDate = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt);
        if (startDateObj && referenceDate < startDateObj) return false;
        if (endDateObj && referenceDate > endDateObj) return false;
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

    // Determinar la disciplina "efectiva": si se selecciona un horario,
    // se hereda la disciplina de ese horario (ej: horario MMA -> disciplina MMA).
    const scheduleFilterObj = scheduleId ? schedulesById[scheduleId] : null;
    const effectiveDiscipline = discipline || scheduleFilterObj?.discipline || "";

    // Filtro por horario (alumno asignado a ese bloque)
    if (scheduleId) {
      filteredStudents = filteredStudents.filter(
        (s) => s.scheduleId === scheduleId || s.scheduleId == null
      );
      // Conservamos alumnos sin scheduleId y luego el filtro por disciplina
      // efectiva decide si tienen registros que coincidan con el horario.
    }

    // Filtro por disciplina efectiva: el alumno debe tener al menos una
    // mensualidad O clase diaria de esa disciplina (no solo mensualidad).
    if (effectiveDiscipline) {
      filteredStudents = filteredStudents.filter((s) =>
        s.monthlyPayments.some(
          (p) =>
            p.discipline === effectiveDiscipline ||
            (p.disciplines || "").split(",").map((x: string) => x.trim()).includes(effectiveDiscipline)
        ) ||
        s.dailyClassSales.some((c) =>
          c.discipline.split(",").map((x: string) => x.trim()).includes(effectiveDiscipline)
        )
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
      const filteredPayments = filterPaymentsByDateRange(student.monthlyPayments, startDate, endDate)
        .filter((p) => {
          if (!effectiveDiscipline) return true;
          return (
            p.discipline === effectiveDiscipline ||
            (p.disciplines || "").split(",").map((x: string) => x.trim()).includes(effectiveDiscipline)
          );
        });
      const filteredClassSales = filterClassSalesByDateRange(student.dailyClassSales, startDate, endDate)
        .filter((s) => {
          if (!effectiveDiscipline) return true;
          return s.discipline.split(",").map((x: string) => x.trim()).includes(effectiveDiscipline);
        })
        .filter((s) => {
          // Si se filtra por un horario concreto, exigir el mismo dÃ­a de la semana
          if (!scheduleFilterObj) return true;
          const dayMap: Record<string, string> = {
            LUNES: "1", MARTES: "2", MIERCOLES: "3", JUEVES: "4",
            VIERNES: "5", SABADO: "6", DOMINGO: "0",
          };
          const dow = dayMap[scheduleFilterObj.dayOfWeek];
          if (dow === undefined) return true;
          return new Date(s.classDate).getDay().toString() === dow;
        });

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
        classSalesAmountTotal: filteredClassSales.reduce((sum, s) => sum + s.amount, 0),
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

    // Filtrar y mapear ventas de clases sin alumno vinculado (mismos filtros de fecha/disciplina/horario)
    let filteredOrphanClassSales = filterClassSalesByDateRange(orphanClassSales, startDate, endDate);
    if (effectiveDiscipline) {
      filteredOrphanClassSales = filteredOrphanClassSales.filter((s) =>
        s.discipline.split(",").map((x: string) => x.trim()).includes(effectiveDiscipline)
      );
    }
    // Las ventas sin alumno (walk-ins) no tienen horario asignado.
    // Si se filtra por horario, se respeta el dÃ­a de la semana del horario,
    // pero no se excluyen todas (un walk-in puede caer en el bloque correcto).
    if (scheduleFilterObj) {
      const dayMap: Record<string, string> = {
        LUNES: "1", MARTES: "2", MIERCOLES: "3", JUEVES: "4",
        VIERNES: "5", SABADO: "6", DOMINGO: "0",
      };
      const dow = dayMap[scheduleFilterObj.dayOfWeek];
      if (dow !== undefined) {
        filteredOrphanClassSales = filteredOrphanClassSales.filter(
          (s) => new Date(s.classDate).getDay().toString() === dow
        );
      }
    }
    const clasesSinAlumno = filteredOrphanClassSales.map((s) => ({
      id: s.id,
      attendeeName: s.attendeeName || "Sin nombre",
      discipline: s.discipline,
      classDate: s.classDate.toISOString().split("T")[0],
      amount: s.amount,
      paymentMethod: s.paymentMethod,
      notes: s.notes || "",
    }));

    // Resumen general (sin filtro de fecha para mantener totales histÃ³ricos)
    const resumen = {
      totalAlumnos: filteredStudents.length,
      totalPagadoTotal: reportData.reduce((sum: number, s: any) => sum + s.totalPagado, 0),
      totalPendienteTotal: reportData.reduce((sum: number, s: any) => sum + s.totalPendiente, 0),
      totalClasesDiarias:
        reportData.reduce((sum: number, s: any) => sum + s.classSalesCount, 0) +
        clasesSinAlumno.length,
      // Monto recaudado por clases diarias (con y sin alumno vinculado), segÃºn filtros
      totalClasesMonto:
        reportData.reduce((sum: number, s: any) => sum + s.classSalesAmountTotal, 0) +
        clasesSinAlumno.reduce((sum: number, c: any) => sum + c.amount, 0),
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
        // Aplicar disciplina efectiva (la del horario o el filtro explÃ­cito)
        if (effectiveDiscipline) {
          const ok =
            payment.discipline === effectiveDiscipline ||
            (payment.disciplines || "")
              .split(",")
              .map((x: string) => x.trim())
              .includes(effectiveDiscipline);
          if (!ok) return;
        }

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
      disciplines: Array.from(
        new Set([
          ...schedulesArr.map((s: any) => s.discipline),
          ...students.flatMap((st) => st.monthlyPayments.map((p: any) => p.discipline)),
          ...students.flatMap((st) => st.dailyClassSales.map((c: any) => c.discipline.split(","))).flat(),
          ...clasesSinAlumno.map((c: any) => c.discipline.split(",")).flat(),
        ])
      ),
      pagosDetallados,
      clasesSinAlumno,
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

