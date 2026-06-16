-- AlterTable
ALTER TABLE "MonthlyPayment" ADD COLUMN "disciplines" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "rut" TEXT,
    "birthDate" DATETIME NOT NULL,
    "email" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "district" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "notes" TEXT,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Student" ("address", "birthDate", "createdAt", "district", "email", "emergencyPhone", "fullName", "id", "updatedAt", "whatsapp") SELECT "address", "birthDate", "createdAt", "district", "email", "emergencyPhone", "fullName", "id", "updatedAt", "whatsapp" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
