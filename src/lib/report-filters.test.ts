import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dateInRange,
  disciplinesOf,
  enrolledInScope,
  matchesPaymentStatus,
  paymentReferenceDate,
  paymentStateOf,
  recordInScope,
  recordIsUnlinkedForSchedule,
  type ScopeFilters,
} from "./report-filters";

const none: ScopeFilters = { scheduleId: "", scheduleDiscipline: "", discipline: "", start: null, end: null };
const mmaBlock: ScopeFilters = { ...none, scheduleId: "mma-1", scheduleDiscipline: "MMA" };

test("sin filtros, todo registro está en alcance", () => {
  assert.equal(recordInScope({ scheduleId: null, discipline: "BOXEO" }, none), true);
});

test("con filtro de horario solo entra el registro vinculado a ese bloque", () => {
  assert.equal(recordInScope({ scheduleId: "mma-1", discipline: "MMA" }, mmaBlock), true);
  // Misma disciplina, otro bloque: antes se mezclaba.
  assert.equal(recordInScope({ scheduleId: "mma-2", discipline: "MMA" }, mmaBlock), false);
  // Misma disciplina, sin horario: antes aparecía en todos los bloques.
  assert.equal(recordInScope({ scheduleId: null, discipline: "MMA" }, mmaBlock), false);
});

test("los registros sin horario se informan aparte, solo para la disciplina del bloque", () => {
  assert.equal(recordIsUnlinkedForSchedule({ scheduleId: null, discipline: "MMA" }, mmaBlock), true);
  assert.equal(recordIsUnlinkedForSchedule({ scheduleId: null, discipline: "BOXEO" }, mmaBlock), false);
  assert.equal(recordIsUnlinkedForSchedule({ scheduleId: "mma-2", discipline: "MMA" }, mmaBlock), false);
  assert.equal(recordIsUnlinkedForSchedule({ scheduleId: null, discipline: "MMA" }, none), false);
});

test("la disciplina admite listas separadas por coma", () => {
  assert.deepEqual(disciplinesOf({ discipline: "MMA, OTRO" }), ["MMA", "OTRO"]);
  assert.deepEqual(disciplinesOf({ discipline: "MMA", disciplines: "JIU_JITSU" }), ["MMA", "JIU_JITSU"]);
  const byDiscipline = { ...none, discipline: "OTRO" };
  assert.equal(recordInScope({ scheduleId: null, discipline: "MMA,OTRO" }, byDiscipline), true);
  assert.equal(recordInScope({ scheduleId: null, discipline: "MMA" }, byDiscipline), false);
});

test("horario y disciplina incompatibles no devuelven nada", () => {
  const conflict = { ...mmaBlock, discipline: "BOXEO" };
  assert.equal(recordInScope({ scheduleId: "mma-1", discipline: "MMA" }, conflict), false);
  assert.equal(recordIsUnlinkedForSchedule({ scheduleId: null, discipline: "MMA" }, conflict), false);
});

test("el rango de fechas incluye ambos extremos", () => {
  const range = { start: new Date(2026, 10, 1), end: new Date(2026, 10, 30, 23, 59, 59, 999) };
  assert.equal(dateInRange(new Date(2026, 10, 1), range), true);
  assert.equal(dateInRange(new Date(2026, 10, 30), range), true);
  assert.equal(dateInRange(new Date(2026, 9, 31), range), false);
  assert.equal(dateInRange(new Date(2026, 11, 1), range), false);
  assert.equal(dateInRange(new Date(2020, 0, 1), { start: null, end: null }), true);
});

test("un pago sin fecha de pago usa su fecha de registro", () => {
  const createdAt = new Date(2026, 10, 5);
  assert.equal(paymentReferenceDate({ paidAt: null, createdAt }), createdAt);
  const paidAt = new Date(2026, 10, 2);
  assert.equal(paymentReferenceDate({ paidAt, createdAt }), paidAt);
});

test("alumno asignado: por bloque exacto o por disciplina", () => {
  const disciplines = new Map([
    ["mma-1", "MMA"],
    ["mma-2", "MMA"],
    ["jj-1", "JIU_JITSU"],
  ]);
  assert.equal(enrolledInScope(["mma-2", "jj-1"], disciplines, mmaBlock), false);
  assert.equal(enrolledInScope(["mma-1", "jj-1"], disciplines, mmaBlock), true);
  assert.equal(enrolledInScope(["jj-1"], disciplines, { ...none, discipline: "JIU_JITSU" }), true);
  assert.equal(enrolledInScope(["jj-1"], disciplines, { ...none, discipline: "MMA" }), false);
  // Horario eliminado: no cuenta.
  assert.equal(enrolledInScope(["borrado"], disciplines, { ...none, discipline: "MMA" }), false);
});

test("estado de pago se calcula sobre los pagos mostrados", () => {
  assert.equal(paymentStateOf([]), "SIN_PAGOS");
  assert.equal(paymentStateOf([{ status: "PAGADO" }]), "AL_DIA");
  assert.equal(paymentStateOf([{ status: "PAGADO" }, { status: "SALTADO" }]), "CON_DEUDA");
});

test("filtro de estado de pago", () => {
  const paid = [{ status: "PAGADO" }];
  const mixed = [{ status: "PAGADO" }, { status: "PENDIENTE" }];
  assert.equal(matchesPaymentStatus([], ""), true);
  assert.equal(matchesPaymentStatus([], "SIN_PAGO"), true);
  assert.equal(matchesPaymentStatus(paid, "SIN_PAGO"), false);
  assert.equal(matchesPaymentStatus(paid, "PAGADO"), true);
  assert.equal(matchesPaymentStatus(paid, "PENDIENTE"), false);
  assert.equal(matchesPaymentStatus(mixed, "PENDIENTE"), true);
  assert.equal(matchesPaymentStatus(paid, "AL_DIA"), true);
  assert.equal(matchesPaymentStatus(mixed, "AL_DIA"), false);
  assert.equal(matchesPaymentStatus(mixed, "CON_DEUDA"), true);
  assert.equal(matchesPaymentStatus([], "AL_DIA"), false);
});
