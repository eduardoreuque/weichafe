import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateAge, isPlausibleDate, parseLocalDate } from "@/lib/helpers";
import {
  dateInRange,
  enrolledInScope,
  matchesPaymentStatus,
  paymentReferenceDate,
  paymentStateOf,
  recordInScope,
  recordIsUnlinkedForSchedule,
  type ScopeFilters,
} from "@/lib/report-filters";

function toDay(date: Date): string {
  return date.toISOString().split("T")[0];
}

function toMonth(date: Date): string {
  return date.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

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
  const searchQuery = (searchParams.get("q") || "").trim();
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const start = startDate ? parseLocalDate(startDate) : null;
  const end = endDate ? parseLocalDate(endDate) : null;
  if ((start && !isPlausibleDate(start)) || (end && !isPlausibleDate(end))) {
    return NextResponse.json({ ok: false, error: "Rango de fechas inválido" }, { status: 400 });
  }
  if (end) end.setHours(23, 59, 59, 999);

  try {
    const schedulesArr = await prisma.schedule.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    const schedulesById = new Map(schedulesArr.map((s) => [s.id, s]));
    const disciplineBySchedule = new Map(schedulesArr.map((s) => [s.id, s.discipline]));

    const scheduleFilter = scheduleId ? schedulesById.get(scheduleId) ?? null : null;
    if (scheduleId && !scheduleFilter) {
      return NextResponse.json({ ok: false, error: "Horario no encontrado" }, { status: 404 });
    }

    const filters: ScopeFilters = {
      scheduleId: scheduleFilter?.id ?? "",
      scheduleDiscipline: scheduleFilter?.discipline ?? "",
      discipline,
      start,
      end,
    };
    const hasScope = Boolean(filters.scheduleId || filters.discipline);

    const searchFilter = searchQuery
      ? { OR: [{ fullName: { contains: searchQuery } }, { rut: { contains: searchQuery } }] }
      : {};

    const students = await prisma.student.findMany({
      where: { ...(onlyActive ? { isActive: true } : {}), ...searchFilter },
      include: {
        monthlyPayments: {
          orderBy: { monthCovered: "desc" },
          include: { receipt: { select: { id: true, receiptNumber: true } } },
        },
        dailyClassSales: { orderBy: { classDate: "desc" } },
        schedules: { select: { scheduleId: true } },
      },
      orderBy: { fullName: "asc" },
    });

    // Alumnos inactivos con mensualidades: si el filtro "solo activos" está
    // aplicado, se informa el total para que no parezca que falta información.
    const hiddenInactiveCount = onlyActive
      ? await prisma.student.count({
          where: { isActive: false, monthlyPayments: { some: {} }, ...searchFilter },
        })
      : 0;

    // Ventas de clase diaria sin alumno vinculado (nombre libre / "walk-in")
    const orphanClassSales = await prisma.dailyClassSale.findMany({
      where: { studentId: null, ...(searchQuery ? { attendeeName: { contains: searchQuery } } : {}) },
      orderBy: { classDate: "desc" },
    });

    // Registros sin horario de la disciplina del bloque filtrado. No se muestran
    // dentro del bloque (no se puede saber a cuál pertenecen): se informan aparte.
    const sinHorario = { pagos: 0, pagosMonto: 0, clases: 0, clasesMonto: 0 };

    const rows = [];
    for (const student of students) {
      const enrolledIds = new Set(student.schedules.map((link) => link.scheduleId));
      if (student.scheduleId) enrolledIds.add(student.scheduleId);

      const payments = student.monthlyPayments.filter(
        (p) => recordInScope(p, filters) && dateInRange(paymentReferenceDate(p), filters)
      );
      const classSales = student.dailyClassSales.filter(
        (c) => recordInScope(c, filters) && dateInRange(c.classDate, filters)
      );

      for (const p of student.monthlyPayments) {
        if (recordIsUnlinkedForSchedule(p, filters) && dateInRange(paymentReferenceDate(p), filters)) {
          sinHorario.pagos += 1;
          sinHorario.pagosMonto += p.amount;
        }
      }
      for (const c of student.dailyClassSales) {
        if (recordIsUnlinkedForSchedule(c, filters) && dateInRange(c.classDate, filters)) {
          sinHorario.clases += 1;
          sinHorario.clasesMonto += c.amount;
        }
      }

      // El alumno pertenece al horario/disciplina filtrados si está asignado o
      // si tiene algún registro vinculado (aunque sea fuera del rango de fechas).
      const belongs =
        !hasScope ||
        enrolledInScope(enrolledIds, disciplineBySchedule, filters) ||
        student.monthlyPayments.some((p) => recordInScope(p, filters)) ||
        student.dailyClassSales.some((c) => recordInScope(c, filters));
      if (!belongs) continue;

      // El estado de pago se evalúa sobre los pagos que el reporte muestra.
      if (!matchesPaymentStatus(payments, paymentStatus)) continue;

      rows.push({ student, enrolledIds, payments, classSales });
    }

    const reportData = rows.map(({ student, enrolledIds, payments, classSales }) => {
      const ultimoPago = payments.find((p) => p.status === "PAGADO");
      return {
        id: student.id,
        fullName: student.fullName,
        rut: student.rut || "",
        email: student.email || "",
        whatsapp: student.whatsapp || "",
        isActive: student.isActive,
        birthDate: toDay(student.birthDate),
        edad: calculateAge(student.birthDate),
        district: student.district || "",
        schedules: schedulesArr
          .filter((s) => enrolledIds.has(s.id))
          .map((s) => ({
            discipline: s.discipline,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            blockName: s.blockName,
          })),
        disciplines: Array.from(new Set(student.monthlyPayments.map((p) => p.discipline))).join(", "),
        totalPagado: payments.filter((p) => p.status === "PAGADO").reduce((sum, p) => sum + p.amount, 0),
        totalPendiente: payments
          .filter((p) => p.status === "PENDIENTE" || p.status === "SALTADO")
          .reduce((sum, p) => sum + p.amount, 0),
        ultimoPagoMes: ultimoPago ? toMonth(ultimoPago.monthCovered) : "Sin pagos",
        ultimoPagoMonto: ultimoPago?.amount || 0,
        paymentCount: payments.length,
        classSalesCount: classSales.length,
        classSalesAmountTotal: classSales.reduce((sum, c) => sum + c.amount, 0),
        estadoPago: paymentStateOf(payments),
        monthlyPayments: payments.map((p) => ({
          id: p.id,
          scheduleId: p.scheduleId ?? null,
          discipline: p.discipline,
          disciplines: p.disciplines,
          month: toMonth(p.monthCovered),
          amount: p.amount,
          status: p.status,
          paidAt: p.paidAt ? toDay(p.paidAt) : null,
          paymentMethod: p.paymentMethod || "-",
          notes: p.notes || "",
          receiptId: p.receipt?.id || null,
          receiptNumber: p.receipt?.receiptNumber || null,
        })),
        dailyClassSales: classSales.map((c) => ({
          id: c.id,
          scheduleId: c.scheduleId ?? null,
          discipline: c.discipline,
          classDate: toDay(c.classDate),
          amount: c.amount,
          paymentMethod: c.paymentMethod,
          notes: c.notes || "",
        })),
      };
    });

    const clasesSinAlumno = [];
    for (const sale of orphanClassSales) {
      if (!dateInRange(sale.classDate, filters)) continue;
      if (recordIsUnlinkedForSchedule(sale, filters)) {
        sinHorario.clases += 1;
        sinHorario.clasesMonto += sale.amount;
      }
      if (!recordInScope(sale, filters)) continue;
      clasesSinAlumno.push({
        id: sale.id,
        scheduleId: sale.scheduleId ?? null,
        attendeeName: sale.attendeeName || "Sin nombre",
        discipline: sale.discipline,
        classDate: toDay(sale.classDate),
        amount: sale.amount,
        paymentMethod: sale.paymentMethod,
        notes: sale.notes || "",
      });
    }

    const resumen = {
      totalAlumnos: reportData.length,
      totalPagadoTotal: reportData.reduce((sum, s) => sum + s.totalPagado, 0),
      totalPendienteTotal: reportData.reduce((sum, s) => sum + s.totalPendiente, 0),
      totalClasesDiarias: reportData.reduce((sum, s) => sum + s.classSalesCount, 0) + clasesSinAlumno.length,
      totalClasesMonto:
        reportData.reduce((sum, s) => sum + s.classSalesAmountTotal, 0) +
        clasesSinAlumno.reduce((sum, c) => sum + c.amount, 0),
      alumnosAlDia: reportData.filter((s) => s.estadoPago === "AL_DIA").length,
      alumnosConDeuda: reportData.filter((s) => s.estadoPago === "CON_DEUDA").length,
      alumnosSinPagos: reportData.filter((s) => s.estadoPago === "SIN_PAGOS").length,
      alumnosInactivosOcultos: hiddenInactiveCount,
    };

    const pagosDetallados = rows.flatMap(({ student, payments }) =>
      payments.map((p) => ({
        studentId: student.id,
        studentName: student.fullName,
        rut: student.rut || "-",
        whatsapp: student.whatsapp || "-",
        email: student.email || "-",
        district: student.district || "-",
        paymentId: p.id,
        paymentScheduleId: p.scheduleId ?? null,
        discipline: p.discipline,
        disciplines: p.disciplines || "",
        month: toMonth(p.monthCovered),
        amount: p.amount,
        status: p.status,
        paidAt: p.paidAt ? toDay(p.paidAt) : null,
        paymentMethod: p.paymentMethod || "-",
        notes: p.notes || "",
      }))
    );

    const splitDisciplines = (value: string) =>
      value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

    return NextResponse.json({
      ok: true,
      data: reportData,
      resumen,
      schedules: schedulesArr,
      disciplines: Array.from(
        new Set([
          ...schedulesArr.map((s) => s.discipline),
          ...students.flatMap((st) => st.monthlyPayments.map((p) => p.discipline as string)),
          ...students.flatMap((st) => st.dailyClassSales.flatMap((c) => splitDisciplines(c.discipline))),
          ...orphanClassSales.flatMap((c) => splitDisciplines(c.discipline)),
        ])
      ),
      pagosDetallados,
      clasesSinAlumno,
      // Solo tiene valores cuando se filtra por horario
      sinHorario: filters.scheduleId ? sinHorario : null,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ ok: false, error: "Error al generar el reporte" }, { status: 500 });
  }
}
