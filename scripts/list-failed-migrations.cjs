/**
 * Lista las migraciones que quedaron en estado "fallida" (sin terminar y sin
 * rollback) para que el deploy pueda marcarlas como rolled-back con
 * `prisma migrate resolve` y luego reintentar `prisma migrate deploy`.
 *
 * Motivo: la migración 20260723114800_add_schedule_table usaba
 * "ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY", que SQLite no soporta.
 * Falla -> queda marcada como fallida -> cualquier `migrate deploy` posterior
 * responde P3009 y el deploy se abortaba sin actualizar la aplicación.
 */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  try {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at"
    );
    for (const row of rows) {
      console.log(row.migration_name);
    }
  } catch (error) {
    // Base nueva sin tabla de migraciones: no hay nada que reparar
    console.error("Sin historial de migraciones:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Error listando migraciones fallidas:", error);
  process.exit(1);
});
