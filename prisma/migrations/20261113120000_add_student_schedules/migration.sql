-- Varios horarios por alumno (N:N).
-- Antes el alumno solo podía tener un horario (Student.scheduleId): al marcar
-- varios en el formulario se guardaba el primero y el resto se perdía.
--
-- Esta migración solo AGREGA una tabla y copia los horarios ya asignados.
-- No modifica ni borra datos existentes; Student.scheduleId se mantiene como
-- horario principal.

-- CreateTable
CREATE TABLE "StudentSchedule" (
    "studentId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("studentId", "scheduleId"),
    CONSTRAINT "StudentSchedule_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentSchedule_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StudentSchedule_scheduleId_idx" ON "StudentSchedule"("scheduleId");

-- Copiar el horario actual de cada alumno (solo si el horario todavía existe).
-- createdAt en milisegundos, igual que las fechas que escribe Prisma.
INSERT OR IGNORE INTO "StudentSchedule" ("studentId", "scheduleId", "createdAt")
SELECT s."id", s."scheduleId", CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM "Student" s
WHERE s."scheduleId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Schedule" sc WHERE sc."id" = s."scheduleId");
