-- Vincular pagos y clases diarias con el horario (Schedule) directamente en la BD.
-- Antes esa relación se guardaba en archivos JSON dentro de public/, que se
-- reseteaban en cada deploy y se perdian.

-- AlterTable: campos nuevos de Schedule
ALTER TABLE "Schedule" ADD COLUMN "location" TEXT;
ALTER TABLE "Schedule" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: relacion pago -> horario
ALTER TABLE "MonthlyPayment" ADD COLUMN "scheduleId" TEXT REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: relacion clase diaria -> horario
ALTER TABLE "DailyClassSale" ADD COLUMN "scheduleId" TEXT REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "MonthlyPayment_scheduleId_idx" ON "MonthlyPayment"("scheduleId");

-- CreateIndex
CREATE INDEX "DailyClassSale_scheduleId_idx" ON "DailyClassSale"("scheduleId");

-- CreateIndex
CREATE INDEX "Schedule_discipline_dayOfWeek_startTime_idx" ON "Schedule"("discipline", "dayOfWeek", "startTime");
