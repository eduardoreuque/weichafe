# Backlog de mejoras — Weichafe

Hallazgos de la revisión completa del código (septiembre 2026).
Lo ya corregido en el commit `a2fa578` está marcado con ✅.

---

## 1. Corregido en esta revisión

| # | Problema | Impacto | Estado |
|---|---|---|---|
| 1 | `prisma/migrations/20260723114800_add_schedule_table` usaba `ALTER TABLE ... ADD CONSTRAINT` (SQLite no lo soporta) → P3018 y luego P3009 en todos los deploys | **Los cambios no llegaban a la web**: con `set -e` el deploy abortaba antes de reiniciar el servicio | ✅ Migración reescrita (idempotente) + el deploy limpia migraciones fallidas y reintenta |
| 2 | Los horarios de pagos y clases se guardaban en `public/*-schedules.json` | Esos archivos se resetean en cada deploy: se perdían las relaciones pago↔horario y alumno↔horario | ✅ `MonthlyPayment.scheduleId` y `DailyClassSale.scheduleId` en BD |
| 3 | El formulario de clase diaria enviaba el horario pero la API lo descartaba | El filtro por horario nunca podía ser exacto | ✅ Se guarda `scheduleId` |
| 4 | `filterClassSalesByDateRange` usaba `new Date("YYYY-MM-DD")` | Las clases del **último día** del rango no aparecían en reportes | ✅ Usa `parseLocalDate` |
| 5 | Filtro por horario comparaba solo el día de la semana | Mezclaba horarios/disciplinas (ej: MMA lunes 20:00 mostraba JIU_JITSU) | ✅ Coincidencia exacta de `scheduleId`, con respaldo por día para registros antiguos |
| 6 | "Alumnos por horario" leía JSON reseteado | La búsqueda devolvía vacío en producción | ✅ Consulta la BD |
| 7 | Eliminar alumno borraba sus ventas de clase diaria | Pérdida de registros de caja | ✅ No se borran (quedan como ventas sin alumno) y se bloquea el borrado si tiene mensualidades |
| 8 | `Schedule.location` e `isActive` no existían en la BD | El formulario de horarios guardaba datos que se descartaban | ✅ Columnas agregadas y persistidas |
| 9 | `/comprobantes/[id]` no validaba sesión | Con cualquier cookie se podía abrir el comprobante de otro alumno | ✅ Exige sesión válida |
| 10 | `AUTH_SECRET` estaba escrito en `.github/workflows/deploy.yml` | Cualquiera con acceso al repo podía firmar sesiones válidas | ✅ Se genera y persiste en `/var/weichafe/auth.env` |
| 11 | El botón "+ Nuevo Alumno" apuntaba a `/alumnos/nuevo` (ruta inexistente) | 404 | ✅ Va al formulario del panel (`/#nuevo-alumno`) |
| 12 | Acciones server duplicadas y sin uso en `src/app/actions.ts` | Código muerto que además escribía JSON | ✅ Eliminadas (se mantiene `updateStudentAction`) |

## 2. Nuevo

- ✅ **Menú de navegación global** (`src/components/app-nav.tsx`) con accesos según rol + `src/app/admin/layout.tsx` que valida ADMIN en el servidor para todo `/admin/*`.
- ✅ **Respaldo de la base** desde `/admin` (`GET /api/admin/backup`, usa `VACUUM INTO` para una copia consistente).
- ✅ **Respaldos versionados** en cada deploy (`/var/weichafe/backups`, se conservan los últimos 10).
- ✅ **Horarios base** se cargan en la BD si la tabla está vacía (`scripts/import-schedules.cjs`).
- ✅ `RECOVERY_CODE` se genera y persiste en el servidor (habilita `/recovery`).


---

## 3. Pendientes sugeridos (por prioridad)

### Alta — datos y operación
1. **Paginación y límites en el dashboard**: `src/app/page.tsx` trae todos los alumnos con todas sus mensualidades, clases y comprobantes. Con >300 alumnos empezará a ir lento. Sugerido: métricas con `count`/`aggregate` y listado paginado.
2. **Historial completo por alumno**: en `/alumnos/[id]` solo se ven 5 pagos y 10 clases (`take: 10`). Sugerido: pestañas "Mensualidades" / "Clases" / "Comprobantes" con paginación y reimpresión.
3. **Editar / anular pagos y clases**: hoy no hay forma de corregir un monto mal cargado. Sugerido: `PATCH /api/monthly-payments/:id` y `PATCH /api/daily-class-sales/:id` con estado `ANULADO` y registro de quién modificó.
4. **Recordatorios de pago por WhatsApp**: ya se detectan los meses saltados (`detectSkippedMonthsByDiscipline`) y se tiene el WhatsApp del alumno. Sugerido: botón "Recordar por WhatsApp" con mensaje prellenado (`https://wa.me/56...?text=`).
5. **Respaldos automáticos diarios**: hoy se respalda en cada deploy. Sugerido: `systemd timer` que copie `dev.db` a `/var/weichafe/backups` + botón para descargar el respaldo más reciente.

### Media — funcionalidad
6. **Caja del día**: nueva vista con total recaudado hoy (mensualidades + clases), desglose por método de pago y cierre de caja imprimible.
7. **Reporte de morosidad**: alumnos con meses impagos agrupados por horario, exportable a CSV y contacto por WhatsApp.
8. **Comprobante en PDF**: hoy es HTML con `window.print`. Sugerido: "descargar PDF" y envío por WhatsApp/email.
9. **Sesiones multi-horario reales**: `Student.scheduleId` guarda un solo horario aunque el formulario permite marcar varios. Sugerido: tabla `StudentSchedule` (N:N) y adaptar los filtros.
10. **Historial de cambios (auditoría)**: registrar quién creó/editó/eliminó pagos, alumnos y horarios.
11. **Vista pública de horarios**: página sin login con horarios y valores (hoy están fijos en `src/app/page.tsx`, duplicando la BD).

### Baja — calidad técnica
12. **Tipado Prisma**: hay muchos `any` en consultas (`studentWhere`, `whereClause`, `orderBy`). Usar `Prisma.StudentWhereInput`, etc.
13. **Duplicaciones**: `calculateAge` (en `lib/helpers.ts` y en `api/reports/route.ts`), `getPaymentStatus`, y las listas de disciplinas repetidas en `class-form`, `payment-form` y `schedule-manager` (extraer a `lib/constants.ts`).
14. **Fotos de alumnos**: se mezclan archivos en `UPLOAD_DIR` con base64 en la BD (`photoUrl`). Normalizar a archivos y limpiar el base64 al reemplazar.
15. **`next.config.ts`**: `images.remotePatterns` con `hostname: "**"` es muy permisivo; acotar a los dominios propios.
16. **Sin tests**: sugerido tests de `lib/helpers.ts` (fechas, meses saltados) y de los filtros de reportes con Vitest o `node:test`.
17. **`public/schedules.json`**: se mantiene solo para el importador inicial; se puede eliminar cuando la BD sea la fuente única.
18. **`src/components/student-search.tsx`**: archivo vacío ("componente eliminado"). Borrarlo o reintroducir la búsqueda global de alumnos.
19. **Rate limiting en login**: `/recovery` ya lo tiene en memoria; el login no. Reutilizar `lib/recovery.ts`.
20. **PWA/offline**: `capacitor.config.ts` apunta a una URL fija; si la instancia EC2 está apagada, la app móvil queda sin datos. Evaluar service worker + caché de lectura.

---

## 4. Comandos útiles en el servidor

```bash
# Código maestro de recuperación de acceso
sudo cat /var/weichafe/recovery.env

# Respaldos disponibles
ls -lh /var/weichafe/backups

# Restaurar un respaldo (detener el servicio primero)
sudo systemctl stop weichafe
cp /var/weichafe/backups/dev-AAAAmmdd-HHMMSS.db ~/weichafe-standalone/prisma/dev.db
sudo systemctl start weichafe

# Estado de las migraciones
cd ~/weichafe-standalone
DATABASE_URL="file:$HOME/weichafe-standalone/prisma/dev.db" npx prisma migrate status --schema=./prisma/schema.prisma
```
