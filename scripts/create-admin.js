const bcrypt = require("bcrypt");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace("file:", "")
  : path.join(__dirname, "..", "prisma", "dev.db");

let db;
try {
  db = new Database(dbPath);
} catch (e) {
  console.error("Error abriendo BD:", e.message);
  process.exit(1);
}

const users = db.prepare("SELECT id, email, name, role FROM User").all();
console.log("Usuarios encontrados:", JSON.stringify(users, null, 2));

if (users.length === 0) {
  console.log("No hay usuarios. Creando admin...");
  const hash = bcrypt.hashSync("admin123", 10);
  const stmt = db.prepare(
    "INSERT INTO User (email, passwordHash, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime(), datetime())"
  );
  const result = stmt.run("admin@weichafe.cl", hash, "Administrador", "ADMIN");
  console.log("Admin creado con id:", result.lastInsertRowid);
} else {
  console.log("Ya existen usuarios en la base de datos");
}

db.close();