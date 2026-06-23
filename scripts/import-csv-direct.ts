import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import bcrypt from "bcryptjs";

const Database = require("better-sqlite3");

const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace("file:", "")
  : path.join(__dirname, "..", "prisma", "dev.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const csvPath = path.join(__dirname, "lista_weichafe.csv");

const insertStudent = db.prepare(
  `INSERT OR IGNORE INTO Student (rut, fullName, phone, email, address, birthDate, receivesEmail, isActive, hasFingerprint, isDebtor, debtReason, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(), datetime())`
);

const insertPayment = db.prepare(
  `INSERT OR IGNORE INTO Payment (studentId, amount, method, paidAt, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, datetime(), datetime())`
);

const insertClass = db.prepare(
  `INSERT OR IGNORE INTO Class (studentId, discipline, scheduledAt, createdAt, updatedAt)
   VALUES (?, ?, ?, datetime(), datetime())`
);

const rl = readline.createInterface({
  input: fs.createReadStream(csvPath),
  crlfDelay: Infinity,
});

let total = 0;
let imported = 0;
let skipped = 0;

const transaction = db.transaction(() => {
  rl.on("line", (line: string) => {
    total++;
    const cols = line.split(",").map((c: string) => c.trim().replace(/^["']|["']$/g, ""));
    if (cols.length < 6 || !cols[1]) {
      skipped++;
      return;
    }

    const [id, rut, fullName, phone, email, address, birthDate, receivesEmail, isActive, hasFingerprint, isDebtor, debtReason] = cols;

    try {
      const result = insertStudent.run(
        rut || null,
        fullName || null,
        phone || null,
        email || null,
        address || null,
        birthDate ? new Date(birthDate).toISOString() : null,
        receivesEmail === "true" || receivesEmail === "1" ? 1 : 0,
        isActive === "true" || isActive === "1" ? 1 : 0,
        hasFingerprint === "true" || hasFingerprint === "1" ? 1 : 0,
        isDebtor === "true" || isDebtor === "1" ? 1 : 0,
        debtReason || null
      );

      if (result.changes > 0) {
        imported++;
      }
    } catch (e) {
      console.error(`Error importing ${fullName}:`, (e as Error).message);
    }
  });

  rl.on("close", () => {
    console.log("📊 Resumen de importación directa:");
    console.log(`   Total filas procesadas: ${total}`);
    console.log(`   Importados: ${imported}`);
    console.log(`   Saltados: ${skipped}`);
    console.log("========================================");
  });
});

transaction();
db.close();