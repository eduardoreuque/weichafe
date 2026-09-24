-- CreateTable
-- IF NOT EXISTS: el intento anterior de esta migracion ya creo la tabla antes de
-- fallar con el ADD CONSTRAINT, asi que al re-aplicarla no debe volver a crearla.
CREATE TABLE IF NOT EXISTS "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discipline" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "blockName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Schedule_dayOfWeek_startTime_idx" ON "Schedule"("dayOfWeek", "startTime");

-- NOTA: la relacion Student.scheduleId -> Schedule.id NO se declara aqui porque
-- SQLite no soporta "ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY". Esa
-- sentencia hacia fallar la migracion completa (error P3018) y con ello el
-- deploy quedaba abortado antes de reiniciar el servicio. La columna scheduleId
-- ya existe (migracion 20260709023302) y Prisma Client resuelve la relacion a
-- nivel de aplicacion.
