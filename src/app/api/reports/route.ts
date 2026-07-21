import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { readFileSync } from "fs";
import { join } from "path";

const SCHEDULES_FILE = join(process.cwd(), "public", "schedules.json");
const STUDENT_SCHEDULES_FILE = join(process.cwd(), "public", "student-schedules.json");

function loadSchedules(): any[] {
  try {
    const data = readFileSync(SCHEDULES_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : parsed.schedules || [];
  } catch {
    return [];
  }
}

function loadStudentSchedules(): Record<string, string[]> {
  try {
    const data = readFileSync(STUDENT_SCHEDULES_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
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

  try {
    // Obtener todos los alumnos
    const students = await prisma.student.findMany({
      where: onlyActive ? { isActive: true } : {},
      include: {
        monthlyPayments: {
          orderBy: { monthCovered: "desc" },
          take: 12,
        },
      },
      orderBy: { fullName: "asc" },
    });

    const schedules = loadSchedules();
    const studentSchedulesData = loadStudentSchedules();

    // Filtrar alumnos según criterios
    let filteredStudents = students;

    // Filtro por horario
    if (scheduleId) {
      filteredStudents = filteredStudents.filter((s) => {
        const studentScheduleIds = studentSchedulesData[s.id] || [];
        return studentScheduleIds.includes(scheduleId) || s.scheduleId === scheduleId;
      });
    }

    // Filtro por disciplina
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

    // Mapear schedules por ID
    const schedulesById: Record<string, any> = {};
    schedules.forEach((s: any) => {
      schedulesById[s.id] = s;
    });

    // Armar datos de respuesta
    const reportData = filteredStudents.map((student) => {
      const studentScheduleIds = studentSchedulesData[student.id] || [];
      const scheduleInfo = studentScheduleIds
        .map((sid: string) => schedulesById[sid])
        .filter(Boolean);

      const totalPagado = student.monthlyPayments
        .filter((p) => p.status === "PAGADO")
        .reduce((sum, p) => sum + p.amount, 0);

      const totalPendiente = student.monthlyPayments
        .filter((p) => p.status === "PENDIENTE" || p.status === "SALTADO")
        .reduce((sum, p) => sum + p.amount, 0);

      const ultimoPago = student.monthlyPayments.find((p) => p.status === "PAGADO");

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
        paymentCount: student.monthlyPayments.length,
        estadoPago: getPaymentStatus(student.monthlyPayments),
        monthlyPayments: student.monthlyPayments.map((p) => ({
          id: p.id,
          discipline: p.discipline,
          month: p.monthCovered.toLocaleDateString("es-CL", { month: "long", year: "numeric" }),
          amount: p.amount,
          status: p.status,
          paidAt: p.paidAt ? p.paidAt.toISOString().split("T")[0] : null,
        })),
      };
    });

    // Resumen
    const resumen = {
      totalAlumnos: filteredStudents.length,
      totalPagadoTotal: reportData.reduce((sum, s) => sum + s.totalPagado, 0),
      totalPendienteTotal: reportData.reduce((sum, s) => sum + s.totalPendiente, 0),
      alumnosAlDia: reportData.filter((s) => s.estadoPago === "AL_DIA").length,
      alumnosConDeuda: reportData.filter((s) => s.estadoPago === "CON_DEUDA").length,
      alumnosSinPagos: reportData.filter((s) => s.estadoPago === "SIN_PAGOS").length,
    };

    return NextResponse.json({
      ok: true,
      data: reportData,
      resumen,
      schedules,
      disciplines: Array.from(new Set(schedules.map((s: any) => s.discipline))),
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